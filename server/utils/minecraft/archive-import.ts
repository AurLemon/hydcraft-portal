import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type {
	MinecraftAccountSource,
	MinecraftAccountStatus,
	Prisma,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { createApiError } from '../errors'
import { syncMinecraftAccountFromAuthMeProjection } from './account-binding'
import type {
	ArchiveScanArtifact,
	ArchiveScannedPlayer,
} from './archive-artifact'
import {
	syncMinecraftServerPlayerAdvancementsSnapshot,
	syncMinecraftServerPlayerData,
	syncMinecraftServerPlayerStatsSnapshot,
} from './server-player'

interface ImportArchiveArtifactInput {
	serverId: string
	artifactPath: string
}

interface ImportArchiveArtifactResult {
	runId: string
	serverId: string
	artifactServerId: string | null
	playersObserved: number
	playersUpdated: number
	accountsMatched: number
	historicalAccountsCreated: number
}

const parseNullableDate = (value: string | null | undefined): Date | null => {
	if (!value) {
		return null
	}

	const date = new Date(value)
	return Number.isNaN(date.getTime()) ? null : date
}

const sha256 = (value: string): string =>
	createHash('sha256').update(value).digest('hex')

const parseArtifact = async (
	artifactPath: string,
): Promise<ArchiveScanArtifact> => {
	const raw = await readFile(artifactPath, 'utf8')
	return JSON.parse(raw) as ArchiveScanArtifact
}

const updateServerPlayerPortalAccount = async (input: {
	serverId: string
	uuid: string
	accountId: string
	userId: string | null
	status: MinecraftAccountStatus
	source: MinecraftAccountSource
}) => {
	await prisma.minecraftServerPlayer.updateMany({
		where: {
			serverId: input.serverId,
			uuid: input.uuid,
		},
		data: {
			portalAccountId: input.accountId,
			portalUserId: input.userId,
			portalAccountStatus: input.status,
			portalAccountSource: input.source,
		},
	})
}

const updatePortalAccountForUuidAcrossServers = async (input: {
	uuid: string
	accountId: string
	userId: string | null
	status: MinecraftAccountStatus
	source: MinecraftAccountSource
}) => {
	await prisma.minecraftServerPlayer.updateMany({
		where: {
			uuid: input.uuid,
		},
		data: {
			portalAccountId: input.accountId,
			portalUserId: input.userId,
			portalAccountStatus: input.status,
			portalAccountSource: input.source,
		},
	})
}

const upsertHistoricalMinecraftAccount = async (input: {
	username: string
	normalizedUsername: string
	firstJoinedAt: Date | null
	lastSeenAt: Date | null
}) => {
	const existing = await prisma.minecraftAccount.findUnique({
		where: {
			normalizedUsername: input.normalizedUsername,
		},
	})

	if (existing) {
		return {
			account: await prisma.minecraftAccount.update({
				where: {
					id: existing.id,
				},
				data: {
					username: input.username,
					firstJoinedAt:
						input.firstJoinedAt && existing.firstJoinedAt
							? input.firstJoinedAt < existing.firstJoinedAt
								? input.firstJoinedAt
								: existing.firstJoinedAt
							: (input.firstJoinedAt ?? existing.firstJoinedAt),
					lastSeenAt:
						input.lastSeenAt && existing.lastSeenAt
							? input.lastSeenAt > existing.lastSeenAt
								? input.lastSeenAt
								: existing.lastSeenAt
							: (input.lastSeenAt ?? existing.lastSeenAt),
					identityKind: existing.identityKind,
					assignmentMode:
						existing.identityKind === 'AUTHENTICATED'
							? 'AUTHME_VERIFIED'
							: existing.assignmentMode,
				},
			}),
			created: false,
		}
	}

	return {
		account: await prisma.minecraftAccount.create({
			data: {
				username: input.username,
				normalizedUsername: input.normalizedUsername,
				status: 'IMPORTED',
				source: 'MIGRATION',
				identityKind: 'HISTORICAL',
				assignmentMode: 'IMPORTED_UNASSIGNED',
				firstJoinedAt: input.firstJoinedAt,
				lastSeenAt: input.lastSeenAt,
			},
		}),
		created: true,
	}
}

const resolveMinecraftAccountByUsername = async (input: {
	username: string
	normalizedUsername: string
	firstJoinedAt: Date | null
	lastSeenAt: Date | null
}) => {
	const authmeProjection = await prisma.authMeAccount.findUnique({
		where: {
			normalizedUsername: input.normalizedUsername,
		},
		select: {
			authmeId: true,
			username: true,
			realname: true,
			normalizedUsername: true,
			registeredAt: true,
			lastLoginAt: true,
			syncedAt: true,
		},
	})

	if (authmeProjection) {
		const account =
			await syncMinecraftAccountFromAuthMeProjection(authmeProjection)
		return {
			account,
			authenticated: true,
			createdHistorical: false,
		}
	}

	const historical = await upsertHistoricalMinecraftAccount({
		username: input.username,
		normalizedUsername: input.normalizedUsername,
		firstJoinedAt: input.firstJoinedAt,
		lastSeenAt: input.lastSeenAt,
	})

	return {
		account: historical.account,
		authenticated: historical.account.identityKind === 'AUTHENTICATED',
		createdHistorical: historical.created,
	}
}

const resolveImportedAccountFromExistingPlayerEvidence = async (
	player: ArchiveScannedPlayer,
) => {
	const existingPlayers = await prisma.minecraftServerPlayer.findMany({
		where: {
			uuid: player.uuid,
		},
		include: {
			playerData: {
				select: {
					lastKnownName: true,
				},
			},
		},
		orderBy: [{ portalAccountId: 'desc' }, { updatedAt: 'desc' }],
	})

	const linkedPortalAccountId =
		existingPlayers.find((candidate) => candidate.portalAccountId)
			?.portalAccountId ?? null
	if (linkedPortalAccountId) {
		const linkedPortalAccount = await prisma.minecraftAccount.findUnique({
			where: {
				id: linkedPortalAccountId,
			},
		})
		if (!linkedPortalAccount) {
			return null
		}

		return {
			account: linkedPortalAccount,
			authenticated: linkedPortalAccount.identityKind === 'AUTHENTICATED',
			createdHistorical: false,
		}
	}

	const knownName =
		existingPlayers.find(
			(candidate) =>
				candidate.username ||
				candidate.normalizedUsername ||
				candidate.playerData?.lastKnownName,
		) ?? null

	const username =
		knownName?.username ?? knownName?.playerData?.lastKnownName ?? null
	const normalizedUsername =
		knownName?.normalizedUsername ?? username?.trim().toLowerCase() ?? null

	if (!username || !normalizedUsername) {
		return null
	}

	return await resolveMinecraftAccountByUsername({
		username,
		normalizedUsername,
		firstJoinedAt: parseNullableDate(player.firstPlayedAt),
		lastSeenAt: parseNullableDate(player.lastPlayedAt),
	})
}

const resolveImportedMinecraftAccount = async (
	player: ArchiveScannedPlayer,
) => {
	const existingEvidence =
		await resolveImportedAccountFromExistingPlayerEvidence(player)
	if (existingEvidence?.account) {
		return existingEvidence
	}

	const normalizedUsername = player.normalizedLastKnownName
	if (!normalizedUsername || !player.lastKnownName) {
		return {
			account: null,
			authenticated: false,
			createdHistorical: false,
		}
	}

	return await resolveMinecraftAccountByUsername({
		username: player.lastKnownName,
		normalizedUsername,
		firstJoinedAt: parseNullableDate(player.firstPlayedAt),
		lastSeenAt: parseNullableDate(player.lastPlayedAt),
	})
}

export const importArchiveArtifact = async (
	input: ImportArchiveArtifactInput,
): Promise<ImportArchiveArtifactResult> => {
	const artifact = await parseArtifact(input.artifactPath)
	const rawArtifact = JSON.stringify(artifact)
	const artifactHash = sha256(rawArtifact)
	const server = await prisma.minecraftServer.findUnique({
		where: {
			serverId: input.serverId,
		},
	})

	if (!server) {
		throw new Error(`Minecraft server not found: ${input.serverId}`)
	}
	if (server.status !== 'ARCHIVED') {
		throw createApiError({
			statusCode: 409,
			code: 'MINECRAFT_SERVER_ARCHIVE_IMPORT_REQUIRES_ARCHIVED',
		})
	}

	const run = await prisma.archiveImportRun.create({
		data: {
			minecraftServerId: server.id,
			status: 'RUNNING',
			artifactPath: input.artifactPath,
			artifactHash,
			artifactServerId: artifact.server.serverId,
			artifactServerName: artifact.server.name,
			artifactVersion:
				artifact.level.minecraftVersion ?? artifact.server.version,
			scannedAt: parseNullableDate(artifact.scannedAt),
			playersObserved: artifact.players.length,
		},
	})

	let playersUpdated = 0
	let accountsMatched = 0
	let historicalAccountsCreated = 0

	try {
		const snapshotId = `archive:${server.serverId}:${artifact.scannedAt}`

		for (const player of artifact.players) {
			const syncedAt =
				parseNullableDate(player.location?.observedAt) ??
				parseNullableDate(player.lastPlayedAt) ??
				parseNullableDate(artifact.scannedAt) ??
				new Date()

			const dataResult = await syncMinecraftServerPlayerData({
				serverId: server.serverId,
				uuid: player.uuid,
				playerDataFile: player.playerDataFile,
				lastModifiedAt: parseNullableDate(player.lastModifiedAt),
				hasStatsFile: player.hasStatsFile,
				hasAdvancementsFile: player.hasAdvancementsFile,
				lastKnownName: player.lastKnownName,
				firstPlayedAt: parseNullableDate(player.firstPlayedAt),
				lastPlayedAt: parseNullableDate(player.lastPlayedAt),
				lastWorldName: player.location?.worldName ?? null,
				lastDimension: player.location?.dimension ?? null,
				lastX: player.location?.x ?? null,
				lastY: player.location?.y ?? null,
				lastZ: player.location?.z ?? null,
				lastYaw: player.location?.yaw ?? null,
				lastPitch: player.location?.pitch ?? null,
				syncedAt,
			})

			let playerChanged = dataResult.changed

			if (player.stats) {
				const statsResult = await syncMinecraftServerPlayerStatsSnapshot({
					serverId: server.serverId,
					uuid: player.uuid,
					snapshotId,
					statsHash: player.statsHash,
					observedAt: syncedAt,
					lastScannedAt: parseNullableDate(artifact.scannedAt),
					stats: player.stats as Prisma.InputJsonValue,
				})
				playerChanged = playerChanged || statsResult.changed
			}

			if (player.advancements) {
				const advancementsResult =
					await syncMinecraftServerPlayerAdvancementsSnapshot({
						serverId: server.serverId,
						uuid: player.uuid,
						snapshotId,
						advancementsHash: player.advancementsHash,
						observedAt: syncedAt,
						lastScannedAt: parseNullableDate(artifact.scannedAt),
						advancements: player.advancements as Prisma.InputJsonValue,
					})
				playerChanged = playerChanged || advancementsResult.changed
			}

			if (playerChanged) {
				playersUpdated += 1
			}

			const accountResolution = await resolveImportedMinecraftAccount(player)
			if (accountResolution.account) {
				await updateServerPlayerPortalAccount({
					serverId: server.serverId,
					uuid: player.uuid,
					accountId: accountResolution.account.id,
					userId: accountResolution.account.userId ?? null,
					status: accountResolution.account.status,
					source: accountResolution.account.source,
				})
				await updatePortalAccountForUuidAcrossServers({
					uuid: player.uuid,
					accountId: accountResolution.account.id,
					userId: accountResolution.account.userId ?? null,
					status: accountResolution.account.status,
					source: accountResolution.account.source,
				})
			}
			if (accountResolution.authenticated) {
				accountsMatched += 1
			}
			if (accountResolution.createdHistorical) {
				historicalAccountsCreated += 1
			}
		}

		await prisma.archiveImportRun.update({
			where: {
				id: run.id,
			},
			data: {
				status: 'SUCCESS',
				importedAt: new Date(),
				playersUpdated,
				accountsMatched,
				historicalAccountsCreated,
			},
		})

		return {
			runId: run.id,
			serverId: server.serverId,
			artifactServerId: artifact.server.serverId,
			playersObserved: artifact.players.length,
			playersUpdated,
			accountsMatched,
			historicalAccountsCreated,
		}
	} catch (error) {
		await prisma.archiveImportRun.update({
			where: {
				id: run.id,
			},
			data: {
				status: 'FAILED',
				errorMessage:
					error instanceof Error
						? (error.stack ?? error.message)
						: String(error),
				playersUpdated,
				accountsMatched,
				historicalAccountsCreated,
			},
		})
		throw error
	}
}
