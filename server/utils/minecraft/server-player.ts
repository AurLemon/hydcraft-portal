import { createHash } from 'node:crypto'
import type { Prisma as PrismaTypes } from '~/generated/prisma/client'
import { emitEvent } from '../events/event-bus'
import { prisma } from '../db/prisma'
import { normalizeMinecraftUsername } from './normalize'

// playerdata 文件 mtime 抖动容差：bridge 扫描时 lastModifiedAt 可能因文件系统 mtime
// 精度/写入抖动产生微小漂移，此窗口内的变化视为未变，避免无意义 upsert。可经 env 配置。
const readPlayerDataMtimeToleranceMs = (): number => {
	const parsed = Number.parseInt(
		process.env.PLAYERDATA_MTIME_TOLERANCE_SECONDS ?? '',
		10,
	)

	return Number.isFinite(parsed) && parsed >= 0 ? parsed * 1000 : 5 * 60 * 1000
}

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
	// bridge 显式声明本轮 payload 是否省略（v2 协议）。省略时仅用 hash 比对，绝不写空 payload。
	payloadOmitted?: boolean
}

export interface SyncAdvancementsSnapshotInput {
	serverId: string
	uuid: string
	snapshotId: string
	advancementsHash?: string | null
	observedAt: Date
	lastScannedAt?: Date | null
	advancements: PrismaTypes.InputJsonValue
	payloadOmitted?: boolean
}

export interface SyncMutationResult {
	matched: boolean
	changed: boolean
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

	const portalAccountPatch = await getPortalAccountPatch({
		uuid: input.uuid,
	})

	return await prisma.minecraftServerPlayer.upsert({
		where: {
			serverId_uuid: {
				serverId: input.serverId,
				uuid: input.uuid,
			},
		},
		create: {
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
		// 仅保证玩家存在；snapshot/playerdata 路径不在此处推进业务字段，避免无意覆盖 identity 侧更新。
		update: {},
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

	return await prisma.minecraftServerPlayer.upsert({
		where: {
			serverId_uuid: {
				serverId: input.serverId,
				uuid: input.uuid,
			},
		},
		create: {
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
		update: {
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
		isNearDate(
			input.lastModifiedAt,
			input.syncedAt,
			readPlayerDataMtimeToleranceMs(),
		)
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

	// v2 协议：bridge 显式声明 payloadOmitted 时，本轮仅用于 hash 比对，不带真实数据。
	// 此时若 hash 命中则跳过；hash 不命中也不写空 payload（等下一轮带 payload 的同步覆盖）。
	// 取代旧的「hash 命中 + 内容空」猜测式脏行回填 guard。
	if (input.payloadOmitted) {
		if (existing?.statsHash === statsHash) {
			return matchedUnchangedResult
		}
		// payload 省略且 hash 变化：无法更新内容，记为 matched 未变更，等带 payload 的轮次。
		return matchedUnchangedResult
	}

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

	// v2 协议：bridge 显式声明 payloadOmitted 时，仅 hash 比对，不写空 payload。
	if (input.payloadOmitted) {
		return matchedUnchangedResult
	}

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
