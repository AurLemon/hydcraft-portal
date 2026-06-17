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

const matchedUnchangedResult: SyncMutationResult = {
	matched: true,
	changed: false,
}

const isEmptyJsonValue = (value: unknown): boolean => {
	if (value == null) {
		return true
	}

	if (typeof value === 'object' && !Array.isArray(value)) {
		return Object.keys(value).length === 0
	}

	return false
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

	const portalAccountPatch = await getPortalAccountPatch({
		uuid: input.uuid,
	})

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

	// bridge 的 statsHash 是玩家 stats 文件的字节哈希，与 portal 存储的 payload 解耦。
	// 历史上 bridge 在未声明 includePayload 时发过「真 hash + 空 payload」，
	// 库里因此留下 hash 命中但内容为空的脏行。这里在 hash 命中时额外校验：
	// 仅当「存量已有内容」或「incoming 也为空（无内容可回填）」时才跳过，
	// 否则（存量空 + incoming 非空）用新鲜 payload 回填。
	if (
		existing?.statsHash === statsHash &&
		(!isEmptyJsonValue(existing.stats) || isEmptyJsonValue(input.stats))
	) {
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

	// 同 stats：bridge 的 advancementsHash 是文件字节哈希，与 payload 解耦。
	// hash 命中时仅当「存量已有内容」或「incoming 也为空」才跳过，否则回填脏行。
	if (
		existing?.advancementsHash === advancementsHash &&
		(!isEmptyJsonValue(existing.advancements) ||
			isEmptyJsonValue(input.advancements))
	) {
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
