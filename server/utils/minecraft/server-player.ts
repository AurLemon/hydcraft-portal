import { createHash } from 'node:crypto'
import { Prisma as PrismaRuntime } from '~/generated/prisma/client'
import type { Prisma as PrismaTypes } from '~/generated/prisma/client'
import { emitEvent } from '../events/event-bus'
import { prisma } from '../db/prisma'
import { normalizeMinecraftUsername } from './normalize'

export interface UpsertServerPlayerIdentityInput {
	serverId: string
	uuid: string
	username?: string | null
	normalizedUsername?: string | null
	uuidSource?: string | null
	observedAt: Date
}

export interface SyncAuthMePlayerInput {
	serverId: string
	authmeId: number
	username: string
	realname?: string | null
	email?: string | null
	registeredAt?: Date | null
	lastLoginAt?: Date | null
	registerIp?: string | null
	lastIp?: string | null
	hasTotp: boolean
	passwordHash?: string | null
	passwordAlgorithm?: string | null
	raw: PrismaTypes.InputJsonValue
	syncedAt: Date
}

export interface SyncLuckPermsPlayerInput {
	serverId: string
	uuid: string
	username: string
	primaryGroup: string
	syncedAt: Date
}

export interface SyncPlayerDataInput {
	serverId: string
	uuid: string
	playerDataFile?: string | null
	lastModifiedAt?: Date | null
	hasStatsFile: boolean
	hasAdvancementsFile: boolean
	lastKnownName?: string | null
	firstPlayedAt?: Date | null
	lastPlayedAt?: Date | null
	syncedAt: Date
}

export interface SyncStatsSnapshotInput {
	serverId: string
	uuid: string
	snapshotId: string
	statsHash?: string | null
	observedAt: Date
	lastScannedAt?: Date | null
	stats: PrismaTypes.InputJsonValue
}

export interface SyncAdvancementsSnapshotInput {
	serverId: string
	uuid: string
	snapshotId: string
	advancementsHash?: string | null
	observedAt: Date
	lastScannedAt?: Date | null
	advancements: PrismaTypes.InputJsonValue
}

export interface SyncMutationResult {
	matched: boolean
	changed: boolean
}

const skippedResult: SyncMutationResult = {
	matched: false,
	changed: false,
}

const matchedUnchangedResult: SyncMutationResult = {
	matched: true,
	changed: false,
}

export const hashSyncValue = (value: unknown): string =>
	createHash('sha256').update(stableStringify(value)).digest('hex')

const stableStringify = (value: unknown): string => {
	if (value === undefined) {
		return 'undefined'
	}

	if (value == null || typeof value !== 'object') {
		return JSON.stringify(value) ?? 'null'
	}

	if (value instanceof Date) {
		return JSON.stringify(value.toISOString())
	}

	if (Array.isArray(value)) {
		return `[${value.map((item) => stableStringify(item)).join(',')}]`
	}

	const record = value as Record<string, unknown>
	const keys = Object.keys(record).sort()

	return `{${keys
		.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
		.join(',')}}`
}

const datesEqual = (
	left: Date | null | undefined,
	right: Date | null | undefined,
): boolean => (left?.getTime() ?? null) === (right?.getTime() ?? null)

const isNearDate = (left: Date, right: Date, thresholdMs: number): boolean =>
	Math.abs(left.getTime() - right.getTime()) <= thresholdMs

const getPortalAccountPatch = async (input: { uuid?: string | null }) => {
	if (!input.uuid) {
		return {}
	}

	const account = await prisma.minecraftAccount.findFirst({
		where: {
			uuid: input.uuid,
			unlinkedAt: null,
		},
		select: {
			id: true,
			userId: true,
			status: true,
			source: true,
		},
	})

	if (!account) {
		return {}
	}

	return {
		portalAccountId: account.id,
		portalUserId: account.userId,
		portalAccountStatus: account.status,
		portalAccountSource: account.source,
	}
}

const getExistingPlayerByUuid = async (input: {
	serverId: string
	uuid: string
}) =>
	await prisma.minecraftServerPlayer.findUnique({
		where: {
			serverId_uuid: {
				serverId: input.serverId,
				uuid: input.uuid,
			},
		},
	})

const isUniqueConstraintError = (error: unknown): boolean =>
	error instanceof PrismaRuntime.PrismaClientKnownRequestError &&
	error.code === 'P2002'

const readPlayerByUuidOrThrow = async (input: {
	serverId: string
	uuid: string
}) => {
	const player = await getExistingPlayerByUuid(input)

	if (!player) {
		throw new Error('Failed to read Minecraft server player.')
	}

	return player
}

const findUsernameOnlyPlayer = async (input: {
	serverId: string
	normalizedUsername: string
}) =>
	await prisma.minecraftServerPlayer.findFirst({
		where: {
			serverId: input.serverId,
			uuid: null,
			normalizedUsername: input.normalizedUsername,
		},
		orderBy: {
			createdAt: 'asc',
		},
	})

const ensurePlayerByUuid = async (input: {
	serverId: string
	uuid: string
	username?: string | null
	normalizedUsername?: string | null
	uuidSource?: string | null
	observedAt: Date
}) => {
	const normalizedUsername =
		input.normalizedUsername ?? normalizeMinecraftUsername(input.username)
	const existing = await getExistingPlayerByUuid({
		serverId: input.serverId,
		uuid: input.uuid,
	})

	if (existing) {
		return existing
	}

	const usernameOnlyPlayer = normalizedUsername
		? await findUsernameOnlyPlayer({
				serverId: input.serverId,
				normalizedUsername,
			})
		: null
	const portalAccountPatch = await getPortalAccountPatch({
		uuid: input.uuid,
	})

	if (usernameOnlyPlayer) {
		try {
			await prisma.minecraftServerPlayer.update({
				where: {
					id: usernameOnlyPlayer.id,
				},
				data: {
					uuid: input.uuid,
					username: input.username ?? usernameOnlyPlayer.username,
					normalizedUsername:
						normalizedUsername ?? usernameOnlyPlayer.normalizedUsername,
					uuidSource: input.uuidSource ?? usernameOnlyPlayer.uuidSource,
					firstSeenAt: usernameOnlyPlayer.firstSeenAt ?? input.observedAt,
					lastSeenAt: input.observedAt,
					bridgeSyncedAt: input.observedAt,
					...portalAccountPatch,
				},
			})
		} catch (error) {
			if (!isUniqueConstraintError(error)) {
				throw error
			}
		}

		return await readPlayerByUuidOrThrow({
			serverId: input.serverId,
			uuid: input.uuid,
		})
	}

	try {
		await prisma.minecraftServerPlayer.create({
			data: {
				serverId: input.serverId,
				uuid: input.uuid,
				username: input.username,
				normalizedUsername,
				uuidSource: input.uuidSource,
				firstSeenAt: input.observedAt,
				lastSeenAt: input.observedAt,
				evidenceCount: 1,
				bridgeSyncedAt: input.observedAt,
				...portalAccountPatch,
			},
		})
	} catch (error) {
		if (!isUniqueConstraintError(error)) {
			throw error
		}
	}

	return await readPlayerByUuidOrThrow({
		serverId: input.serverId,
		uuid: input.uuid,
	})
}

export const upsertMinecraftServerPlayerFromIdentity = async (
	input: UpsertServerPlayerIdentityInput,
) => {
	const normalizedUsername =
		input.normalizedUsername ?? normalizeMinecraftUsername(input.username)
	const portalAccountPatch = await getPortalAccountPatch({
		uuid: input.uuid,
	})

	const existing = await getExistingPlayerByUuid({
		serverId: input.serverId,
		uuid: input.uuid,
	})

	if (existing) {
		return await prisma.minecraftServerPlayer.update({
			where: {
				id: existing.id,
			},
			data: {
				username: input.username,
				normalizedUsername,
				uuidSource: input.uuidSource,
				lastSeenAt: input.observedAt,
				evidenceCount: {
					increment: 1,
				},
				bridgeSyncedAt: input.observedAt,
				...portalAccountPatch,
			},
		})
	}

	const usernameOnlyPlayer = normalizedUsername
		? await findUsernameOnlyPlayer({
				serverId: input.serverId,
				normalizedUsername,
			})
		: null

	if (usernameOnlyPlayer) {
		return await prisma.minecraftServerPlayer.update({
			where: {
				id: usernameOnlyPlayer.id,
			},
			data: {
				uuid: input.uuid,
				username: input.username ?? usernameOnlyPlayer.username,
				normalizedUsername,
				uuidSource: input.uuidSource ?? usernameOnlyPlayer.uuidSource,
				lastSeenAt: input.observedAt,
				evidenceCount: {
					increment: 1,
				},
				bridgeSyncedAt: input.observedAt,
				...portalAccountPatch,
			},
		})
	}

	try {
		return await prisma.minecraftServerPlayer.create({
			data: {
				serverId: input.serverId,
				uuid: input.uuid,
				username: input.username,
				normalizedUsername,
				uuidSource: input.uuidSource,
				firstSeenAt: input.observedAt,
				lastSeenAt: input.observedAt,
				evidenceCount: 1,
				bridgeSyncedAt: input.observedAt,
				...portalAccountPatch,
			},
		})
	} catch (error) {
		if (!isUniqueConstraintError(error)) {
			throw error
		}

		return await readPlayerByUuidOrThrow({
			serverId: input.serverId,
			uuid: input.uuid,
		})
	}
}

export const syncAuthMePlayerToServerPlayer = async (
	input: SyncAuthMePlayerInput,
): Promise<SyncMutationResult> => {
	const displayUsername = input.realname || input.username
	const normalizedUsername = normalizeMinecraftUsername(displayUsername)

	if (!normalizedUsername) {
		return skippedResult
	}

	const candidate =
		(await prisma.minecraftServerPlayer.findFirst({
			where: {
				serverId: input.serverId,
				OR: [
					{
						authmeId: input.authmeId,
					},
					{
						normalizedUsername,
					},
				],
			},
			include: {
				authMeCredential: true,
			},
			orderBy: [
				{
					uuid: 'asc',
				},
				{
					createdAt: 'asc',
				},
			],
		})) ??
		(await prisma.minecraftServerPlayer.create({
			data: {
				serverId: input.serverId,
				uuid: null,
				username: displayUsername,
				normalizedUsername,
				firstSeenAt: input.registeredAt ?? input.syncedAt,
				lastSeenAt: input.lastLoginAt ?? input.syncedAt,
			},
			include: {
				authMeCredential: true,
			},
		}))

	const authmeRawHash = hashSyncValue(input.raw)
	const credentialHash = hashSyncValue({
		passwordHash: input.passwordHash,
		passwordAlgorithm: input.passwordAlgorithm,
		rawPasswordHash: input.passwordHash,
	})
	const playerChanged =
		candidate.authmeId !== input.authmeId ||
		candidate.authmeUsername !== input.username ||
		candidate.authmeRealname !== input.realname ||
		candidate.authmeEmail !== input.email ||
		!datesEqual(candidate.authmeRegisteredAt, input.registeredAt) ||
		!datesEqual(candidate.authmeLastLoginAt, input.lastLoginAt) ||
		candidate.authmeRegisterIp !== input.registerIp ||
		candidate.authmeLastIp !== input.lastIp ||
		candidate.authmeHasTotp !== input.hasTotp ||
		candidate.authmeRawHash !== authmeRawHash
	const credential = candidate.authMeCredential
	const credentialChanged =
		!credential ||
		credential.passwordHash !== input.passwordHash ||
		credential.passwordAlgorithm !== input.passwordAlgorithm ||
		credential.rawPasswordHash !== input.passwordHash ||
		credential.credentialHash !== credentialHash

	if (!playerChanged && !credentialChanged) {
		return matchedUnchangedResult
	}

	if (playerChanged) {
		await prisma.minecraftServerPlayer.update({
			where: {
				id: candidate.id,
			},
			data: {
				username: candidate.username ?? displayUsername,
				normalizedUsername: candidate.normalizedUsername ?? normalizedUsername,
				firstSeenAt:
					candidate.firstSeenAt ?? input.registeredAt ?? input.syncedAt,
				lastSeenAt: candidate.lastSeenAt ?? input.lastLoginAt ?? input.syncedAt,
				authmeId: input.authmeId,
				authmeUsername: input.username,
				authmeRealname: input.realname,
				authmeEmail: input.email,
				authmeRegisteredAt: input.registeredAt,
				authmeLastLoginAt: input.lastLoginAt,
				authmeRegisterIp: input.registerIp,
				authmeLastIp: input.lastIp,
				authmeHasTotp: input.hasTotp,
				authmeRaw: input.raw,
				authmeRawHash,
				authmeSyncedAt: input.syncedAt,
			},
		})
	}

	if (credentialChanged) {
		await prisma.minecraftServerPlayerAuthMeCredential.upsert({
			where: {
				minecraftServerPlayerId: candidate.id,
			},
			create: {
				minecraftServerPlayerId: candidate.id,
				passwordHash: input.passwordHash,
				passwordAlgorithm: input.passwordAlgorithm,
				rawPasswordHash: input.passwordHash,
				credentialHash,
				syncedAt: input.syncedAt,
			},
			update: {
				passwordHash: input.passwordHash,
				passwordAlgorithm: input.passwordAlgorithm,
				rawPasswordHash: input.passwordHash,
				credentialHash,
				syncedAt: input.syncedAt,
			},
		})
	}

	await emitEvent('server-player.authme-synced', {
		serverId: input.serverId,
		uuid: candidate.uuid,
		playerId: candidate.id,
		syncedAt: input.syncedAt,
	})

	return {
		matched: true,
		changed: true,
	}
}

export const syncLuckPermsPlayerToServerPlayer = async (
	input: SyncLuckPermsPlayerInput,
): Promise<SyncMutationResult> => {
	const normalizedUsername = normalizeMinecraftUsername(input.username)
	const player = await ensurePlayerByUuid({
		serverId: input.serverId,
		uuid: input.uuid,
		username: input.username,
		normalizedUsername,
		uuidSource: 'LUCKPERMS',
		observedAt: input.syncedAt,
	})

	if (
		player.luckPermsUsername === input.username &&
		player.luckPermsPrimaryGroup === input.primaryGroup
	) {
		return matchedUnchangedResult
	}

	const updated = await prisma.minecraftServerPlayer.update({
		where: {
			id: player.id,
		},
		data: {
			username: player.username ?? input.username,
			normalizedUsername: player.normalizedUsername ?? normalizedUsername,
			luckPermsUsername: input.username,
			luckPermsPrimaryGroup: input.primaryGroup,
			luckPermsSyncedAt: input.syncedAt,
		},
	})

	await emitEvent('server-player.luckperms-synced', {
		serverId: input.serverId,
		uuid: input.uuid,
		playerId: updated.id,
		syncedAt: input.syncedAt,
	})

	return {
		matched: true,
		changed: true,
	}
}

export const syncMinecraftServerPlayerData = async (
	input: SyncPlayerDataInput,
): Promise<SyncMutationResult> => {
	const normalizedUsername = normalizeMinecraftUsername(input.lastKnownName)
	const player = await ensurePlayerByUuid({
		serverId: input.serverId,
		uuid: input.uuid,
		username: input.lastKnownName,
		normalizedUsername,
		uuidSource: 'PLAYERDATA_SCAN',
		observedAt: input.syncedAt,
	})
	const playerWithData = await prisma.minecraftServerPlayer.findUnique({
		where: {
			id: player.id,
		},
		include: {
			playerData: true,
		},
	})

	if (!playerWithData) {
		throw new Error('Failed to read Minecraft server player data projection.')
	}

	const existing = playerWithData.playerData
	const samePlayerDataFields =
		!!existing &&
		existing.playerDataFile === input.playerDataFile &&
		existing.hasStatsFile === input.hasStatsFile &&
		existing.hasAdvancementsFile === input.hasAdvancementsFile &&
		existing.lastKnownName === input.lastKnownName &&
		datesEqual(existing.firstPlayedAt, input.firstPlayedAt) &&
		datesEqual(existing.lastPlayedAt, input.lastPlayedAt)
	const nextLastModifiedAt =
		existing &&
		samePlayerDataFields &&
		input.lastModifiedAt &&
		isNearDate(input.lastModifiedAt, input.syncedAt, 5 * 60 * 1000)
			? existing.lastModifiedAt
			: input.lastModifiedAt
	const changed =
		!existing ||
		existing.playerDataFile !== input.playerDataFile ||
		!datesEqual(existing.lastModifiedAt, nextLastModifiedAt) ||
		existing.hasStatsFile !== input.hasStatsFile ||
		existing.hasAdvancementsFile !== input.hasAdvancementsFile ||
		existing.lastKnownName !== input.lastKnownName ||
		!datesEqual(existing.firstPlayedAt, input.firstPlayedAt) ||
		!datesEqual(existing.lastPlayedAt, input.lastPlayedAt)

	if (!changed) {
		return matchedUnchangedResult
	}

	await prisma.minecraftServerPlayerData.upsert({
		where: {
			minecraftServerPlayerId: player.id,
		},
		create: {
			minecraftServerPlayerId: player.id,
			playerDataFile: input.playerDataFile,
			lastModifiedAt: nextLastModifiedAt,
			hasStatsFile: input.hasStatsFile,
			hasAdvancementsFile: input.hasAdvancementsFile,
			lastKnownName: input.lastKnownName,
			firstPlayedAt: input.firstPlayedAt,
			lastPlayedAt: input.lastPlayedAt,
			syncedAt: input.syncedAt,
		},
		update: {
			playerDataFile: input.playerDataFile,
			lastModifiedAt: nextLastModifiedAt,
			hasStatsFile: input.hasStatsFile,
			hasAdvancementsFile: input.hasAdvancementsFile,
			lastKnownName: input.lastKnownName,
			firstPlayedAt: input.firstPlayedAt,
			lastPlayedAt: input.lastPlayedAt,
			syncedAt: input.syncedAt,
		},
	})

	await emitEvent('server-player.playerdata-synced', {
		serverId: input.serverId,
		uuid: input.uuid,
		playerId: player.id,
		syncedAt: input.syncedAt,
	})

	return {
		matched: true,
		changed: true,
	}
}

export const syncMinecraftServerPlayerStatsSnapshot = async (
	input: SyncStatsSnapshotInput,
): Promise<SyncMutationResult> => {
	const player = await ensurePlayerByUuid({
		serverId: input.serverId,
		uuid: input.uuid,
		uuidSource: 'STATS_SNAPSHOT',
		observedAt: input.observedAt,
	})
	const playerWithStats = await prisma.minecraftServerPlayer.findUnique({
		where: {
			id: player.id,
		},
		include: {
			statsSnapshot: true,
		},
	})

	if (!playerWithStats) {
		throw new Error('Failed to read Minecraft server player stats projection.')
	}

	const statsHash = input.statsHash ?? hashSyncValue(input.stats)
	const existing = playerWithStats.statsSnapshot

	if (existing?.statsHash === statsHash) {
		return matchedUnchangedResult
	}

	await prisma.minecraftServerPlayerStatsSnapshot.upsert({
		where: {
			minecraftServerPlayerId: player.id,
		},
		create: {
			minecraftServerPlayerId: player.id,
			snapshotId: input.snapshotId,
			statsHash,
			observedAt: input.observedAt,
			lastScannedAt: input.lastScannedAt,
			stats: input.stats,
		},
		update: {
			snapshotId: input.snapshotId,
			statsHash,
			observedAt: input.observedAt,
			lastScannedAt: input.lastScannedAt,
			stats: input.stats,
		},
	})

	await emitEvent('server-player.stats-synced', {
		serverId: input.serverId,
		uuid: input.uuid,
		playerId: player.id,
		snapshotId: input.snapshotId,
		observedAt: input.observedAt,
	})

	return {
		matched: true,
		changed: true,
	}
}

export const syncMinecraftServerPlayerAdvancementsSnapshot = async (
	input: SyncAdvancementsSnapshotInput,
): Promise<SyncMutationResult> => {
	const player = await ensurePlayerByUuid({
		serverId: input.serverId,
		uuid: input.uuid,
		uuidSource: 'ADVANCEMENTS_SNAPSHOT',
		observedAt: input.observedAt,
	})
	const playerWithAdvancements = await prisma.minecraftServerPlayer.findUnique({
		where: {
			id: player.id,
		},
		include: {
			advancementsSnapshot: true,
		},
	})

	if (!playerWithAdvancements) {
		throw new Error(
			'Failed to read Minecraft server player advancements projection.',
		)
	}

	const advancementsHash =
		input.advancementsHash ?? hashSyncValue(input.advancements)
	const existing = playerWithAdvancements.advancementsSnapshot

	if (existing?.advancementsHash === advancementsHash) {
		return matchedUnchangedResult
	}

	await prisma.minecraftServerPlayerAdvancementsSnapshot.upsert({
		where: {
			minecraftServerPlayerId: player.id,
		},
		create: {
			minecraftServerPlayerId: player.id,
			snapshotId: input.snapshotId,
			advancementsHash,
			observedAt: input.observedAt,
			lastScannedAt: input.lastScannedAt,
			advancements: input.advancements,
		},
		update: {
			snapshotId: input.snapshotId,
			advancementsHash,
			observedAt: input.observedAt,
			lastScannedAt: input.lastScannedAt,
			advancements: input.advancements,
		},
	})

	await emitEvent('server-player.advancements-synced', {
		serverId: input.serverId,
		uuid: input.uuid,
		playerId: player.id,
		snapshotId: input.snapshotId,
		observedAt: input.observedAt,
	})

	return {
		matched: true,
		changed: true,
	}
}
