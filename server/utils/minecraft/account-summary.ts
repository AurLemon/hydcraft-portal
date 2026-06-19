import type { Prisma } from '~/generated/prisma/client'
import { createLuckPermsPrimaryGroupResolver } from '../luckperms/primary-group'

interface MinecraftLocationSummary {
	worldName: string | null
	dimension: string | null
	x: number | null
	y: number | null
	z: number | null
	yaw?: number | null
	pitch?: number | null
	observedAt: string | null
}

interface AdvancementSummary {
	total: number
	completed: number
}

interface CustomStatsSummary {
	distanceTraveledCm: number
	deaths: number
	leaveCount: number
	playTimeTicks: number
}

interface ObservedPlayerSummary {
	uuid: string
	username: string | null
	online: boolean
	lastSeenAt: string | null
	lastPlayedAt: string | null
	luckPermsPrimaryGroup: string | null
	playerProfile: {
		firstPlayedAt: string | null
		lastPlayedAt: string | null
		hasStats: boolean
		hasAdvancements: boolean
		statsCount: number
		advancementsTotalCount: number
		advancementsCompletedCount: number
		distanceTraveledCm: number
		deaths: number
		leaveCount: number
		playTimeTicks: number
	}
	lastSavedLocation: MinecraftLocationSummary | null
}

interface PlayerIdentitySummary {
	playerId: string | null
	boundUuid: string | null
	resolvedUuid: string | null
	observedUuidCount: number
	hasUuidConflict: boolean
	observedPlayers: ObservedPlayerSummary[]
}

export interface MinecraftAccountSummaryRecord {
	id: string
	username: string
	normalizedUsername: string
	uuid: string | null
	status: string
	source: string
	authmeName: string | null
	authmeId: number | null
	authmeUsername: string | null
	authmeRealname: string | null
	firstJoinedAt: string | null
	lastSeenAt: string | null
	isPrimary: boolean
	verifiedAt: string | null
	unlinkedAt: string | null
	createdAt: string
	updatedAt: string
	playerIdentity: PlayerIdentitySummary
	luckPermsPrimaryGroup: string | null
	playerProfile: {
		firstPlayedAt: string | null
		lastPlayedAt: string | null
		hasStats: boolean
		hasAdvancements: boolean
		statsCount: number
		advancementsTotalCount: number
		advancementsCompletedCount: number
		distanceTraveledCm: number
		deaths: number
		leaveCount: number
		playTimeTicks: number
	}
	presence: {
		online: boolean
		lastSavedLocation: MinecraftLocationSummary | null
	} | null
	recentHistory: Array<{
		id: string
		action: string
		reason: string | null
		createdAt: string
	}>
}

type AccountWithAuthMe = Prisma.MinecraftAccountGetPayload<{
	include: { authMeAccount: true }
}>

type ServerPlayerWithSnapshots = Prisma.MinecraftServerPlayerGetPayload<{
	include: {
		playerData: true
		statsSnapshot: true
		advancementsSnapshot: true
	}
}>

type BindingHistory = Prisma.MinecraftAccountBindingHistoryGetPayload<
	Record<string, never>
>

interface JsonRecord {
	[key: string]: unknown
}

const isRecord = (value: unknown): value is JsonRecord =>
	typeof value === 'object' && value !== null && !Array.isArray(value)

const STATS_FILE_ROOT_KEY = 'stats'
const STATS_CUSTOM_CATEGORY = 'minecraft:custom'
const STAT_KEY_WALK_ONE_CM = 'minecraft:walk_one_cm'
const STAT_KEY_FLY_ONE_CM = 'minecraft:fly_one_cm'
const STAT_KEY_SWIM_ONE_CM = 'minecraft:swim_one_cm'
const STAT_KEY_DEATHS = 'minecraft:deaths'
const STAT_KEY_LEAVE_GAME = 'minecraft:leave_game'
// 游玩时间统计 key 随 MC 版本变化：旧版 play_one_minute，1.13+ 重命名为 play_time。
const STAT_KEY_PLAY_ONE_MINUTE = 'minecraft:play_one_minute'
const STAT_KEY_PLAY_TIME = 'minecraft:play_time'

const EMPTY_CUSTOM_STATS: CustomStatsSummary = {
	distanceTraveledCm: 0,
	deaths: 0,
	leaveCount: 0,
	playTimeTicks: 0,
}

const readCustomStatNumber = (custom: JsonRecord, key: string): number => {
	const value = custom[key]
	return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/**
 * 从 vanilla stats JSON 的 `minecraft:custom` 分类下提取展示卡所需的几项关键统计。
 *
 * vanilla stats 文件结构为 `{ stats: { 'minecraft:custom': {...}, ... }, DataVersion }`，
 * 落库时整文件原样存入 `statsSnapshot.stats`，故需先进入外层 `stats` 包裹再取分类。
 *
 * 单位保持原始值：距离为厘米（`*_one_cm`）、游玩时间为 tick（20 tick = 1 秒），
 * `deaths` / `leave_game` 为整数计数。单位换算交由前端展示层处理，避免后端反复改。
 */
export const extractCustomStats = (stats: unknown): CustomStatsSummary => {
	if (!isRecord(stats)) {
		return { ...EMPTY_CUSTOM_STATS }
	}

	// 进入外层 `stats` 包裹（兼容已扁平化的旧结构）。
	const rootField = stats[STATS_FILE_ROOT_KEY]
	const root =
		isRecord(rootField) && STATS_CUSTOM_CATEGORY in rootField
			? rootField
			: stats

	const custom = root[STATS_CUSTOM_CATEGORY]
	if (!isRecord(custom)) {
		return { ...EMPTY_CUSTOM_STATS }
	}

	const playTimeTicks =
		readCustomStatNumber(custom, STAT_KEY_PLAY_ONE_MINUTE) ||
		readCustomStatNumber(custom, STAT_KEY_PLAY_TIME)

	return {
		distanceTraveledCm:
			readCustomStatNumber(custom, STAT_KEY_WALK_ONE_CM) +
			readCustomStatNumber(custom, STAT_KEY_FLY_ONE_CM) +
			readCustomStatNumber(custom, STAT_KEY_SWIM_ONE_CM),
		deaths: readCustomStatNumber(custom, STAT_KEY_DEATHS),
		leaveCount: readCustomStatNumber(custom, STAT_KEY_LEAVE_GAME),
		playTimeTicks,
	}
}

/**
 * 在已查得的 LuckPerms 玩家集合里按玩家 ID（normalizedUsername）匹配主组。
 *
 * 不用 uuid 关联：LuckPerms 同步进来的 uuid 通常是 offline uuid（版本 3），
 * 与 portal 侧 serverPlayer 的 online uuid（版本 4）不一致；且绑定的
 * minecraftAccount.uuid 可能为 null。玩家名（normalizedUsername）跨服稳定，
 * 是更可靠的关联键。未启用 LuckPerms 同步时集合为空，自然返回 null。
 */
const resolveLuckPermsPrimaryGroup = (
	luckPermsResolver:
		| ReturnType<typeof createLuckPermsPrimaryGroupResolver>
		| null
		| undefined,
	input: {
		uuid?: string | null
		normalizedUsername?: string | null
	},
): string | null => {
	if (!luckPermsResolver) {
		return null
	}

	return luckPermsResolver.resolveEffectivePrimaryGroup(input)
}

export const countStatsEntries = (stats: unknown): number => {
	if (!isRecord(stats)) {
		return 0
	}

	return Object.values(stats).reduce<number>((total, entry) => {
		if (!isRecord(entry)) {
			return total + 1
		}

		return total + Object.keys(entry).length
	}, 0)
}

export const summarizeAdvancements = (
	advancements: unknown,
): AdvancementSummary => {
	if (!isRecord(advancements)) {
		return {
			total: 0,
			completed: 0,
		}
	}

	return Object.values(advancements).reduce<AdvancementSummary>(
		(summary, entry) => {
			if (!isRecord(entry)) {
				return summary
			}

			return {
				total: summary.total + 1,
				completed: summary.completed + (entry.done === true ? 1 : 0),
			}
		},
		{
			total: 0,
			completed: 0,
		},
	)
}

type LocationInput = Omit<MinecraftLocationSummary, 'observedAt'> & {
	observedAt: Date | null
}

export const resolvePresenceLocation = (
	location: LocationInput | null,
): MinecraftLocationSummary | null => {
	if (!location) {
		return null
	}

	return {
		...location,
		observedAt: location.observedAt?.toISOString() ?? null,
	}
}

const matchesAccount = (
	candidate: ServerPlayerWithSnapshots,
	account: AccountWithAuthMe,
): boolean =>
	(account.uuid ? candidate.uuid === account.uuid : false) ||
	candidate.normalizedUsername === account.normalizedUsername

const toObservedPlayerSummary = (
	matchedPlayer: ServerPlayerWithSnapshots,
	luckPermsResolver?: ReturnType<
		typeof createLuckPermsPrimaryGroupResolver
	> | null,
): ObservedPlayerSummary => {
	const observedStatsCount = countStatsEntries(
		matchedPlayer.statsSnapshot?.stats,
	)
	const observedAdvancements = summarizeAdvancements(
		matchedPlayer.advancementsSnapshot?.advancements,
	)
	const observedCustomStats = extractCustomStats(
		matchedPlayer.statsSnapshot?.stats,
	)

	return {
		uuid: matchedPlayer.uuid,
		username: matchedPlayer.username,
		online: matchedPlayer.online,
		lastSeenAt: matchedPlayer.lastSeenAt?.toISOString() ?? null,
		lastPlayedAt: matchedPlayer.playerData?.lastPlayedAt?.toISOString() ?? null,
		luckPermsPrimaryGroup: resolveLuckPermsPrimaryGroup(luckPermsResolver, {
			uuid: matchedPlayer.uuid,
			normalizedUsername: matchedPlayer.normalizedUsername ?? null,
		}),
		playerProfile: {
			firstPlayedAt:
				matchedPlayer.playerData?.firstPlayedAt?.toISOString() ?? null,
			lastPlayedAt:
				matchedPlayer.playerData?.lastPlayedAt?.toISOString() ?? null,
			hasStats: Boolean(matchedPlayer.statsSnapshot),
			hasAdvancements: Boolean(matchedPlayer.advancementsSnapshot),
			statsCount: observedStatsCount,
			advancementsTotalCount: observedAdvancements.total,
			advancementsCompletedCount: observedAdvancements.completed,
			distanceTraveledCm: observedCustomStats.distanceTraveledCm,
			deaths: observedCustomStats.deaths,
			leaveCount: observedCustomStats.leaveCount,
			playTimeTicks: observedCustomStats.playTimeTicks,
		},
		lastSavedLocation: resolvePresenceLocation({
			worldName: matchedPlayer.playerData?.lastWorldName ?? null,
			dimension: matchedPlayer.playerData?.lastDimension ?? null,
			x: matchedPlayer.playerData?.lastX ?? null,
			y: matchedPlayer.playerData?.lastY ?? null,
			z: matchedPlayer.playerData?.lastZ ?? null,
			yaw: matchedPlayer.playerData?.lastYaw ?? null,
			pitch: matchedPlayer.playerData?.lastPitch ?? null,
			observedAt: matchedPlayer.playerData?.syncedAt ?? null,
		}),
	}
}

/**
 * 把单个 minecraftAccount + 其匹配的 server players + 绑定历史组装成
 * 前端 MinecraftAccountsContent 组件所需的 MinecraftAccountSummary 结构。
 *
 * 供 me 端点与公开 /players/[mcid] 端点共享，保证两者数据形状一致。
 */
export const buildMinecraftAccountSummary = (
	account: AccountWithAuthMe,
	players: ServerPlayerWithSnapshots[],
	histories: BindingHistory[],
	luckPermsResolver?: ReturnType<
		typeof createLuckPermsPrimaryGroupResolver
	> | null,
): MinecraftAccountSummaryRecord => {
	const matchedPlayers = players.filter((candidate) =>
		matchesAccount(candidate, account),
	)
	const matchedPlayer =
		(account.uuid
			? matchedPlayers.find((player) => player.uuid === account.uuid)
			: null) ??
		matchedPlayers[0] ??
		null

	const statsCount = countStatsEntries(matchedPlayer?.statsSnapshot?.stats)
	const advancementSummary = summarizeAdvancements(
		matchedPlayer?.advancementsSnapshot?.advancements,
	)
	const customStats = extractCustomStats(matchedPlayer?.statsSnapshot?.stats)

	const playerIdentity: PlayerIdentitySummary = {
		playerId:
			account.authMeAccount?.realname ??
			account.authMeAccount?.username ??
			account.authmeName ??
			account.username,
		boundUuid: account.uuid,
		resolvedUuid: matchedPlayer?.uuid ?? account.uuid,
		observedUuidCount: matchedPlayers.length,
		hasUuidConflict: matchedPlayers.length > 1,
		observedPlayers: matchedPlayers.map((player) =>
			toObservedPlayerSummary(player, luckPermsResolver),
		),
	}

	return {
		id: account.id,
		username: account.username,
		normalizedUsername: account.normalizedUsername,
		uuid: account.uuid,
		status: account.status,
		source: account.source,
		authmeName: account.authmeName,
		authmeId: account.authmeId,
		authmeUsername: account.authMeAccount?.username ?? null,
		authmeRealname: account.authMeAccount?.realname ?? null,
		firstJoinedAt:
			account.firstJoinedAt?.toISOString() ??
			matchedPlayer?.playerData?.firstPlayedAt?.toISOString() ??
			null,
		lastSeenAt:
			account.lastSeenAt?.toISOString() ??
			matchedPlayer?.playerData?.lastPlayedAt?.toISOString() ??
			null,
		isPrimary: account.isPrimary,
		verifiedAt: account.verifiedAt?.toISOString() ?? null,
		unlinkedAt: account.unlinkedAt?.toISOString() ?? null,
		createdAt: account.createdAt.toISOString(),
		updatedAt: account.updatedAt.toISOString(),
		playerIdentity,
		luckPermsPrimaryGroup: resolveLuckPermsPrimaryGroup(luckPermsResolver, {
			uuid: account.uuid,
			normalizedUsername: account.normalizedUsername,
		}),
		playerProfile: {
			firstPlayedAt:
				matchedPlayer?.playerData?.firstPlayedAt?.toISOString() ?? null,
			lastPlayedAt:
				matchedPlayer?.playerData?.lastPlayedAt?.toISOString() ?? null,
			hasStats: Boolean(matchedPlayer?.statsSnapshot),
			hasAdvancements: Boolean(matchedPlayer?.advancementsSnapshot),
			statsCount,
			advancementsTotalCount: advancementSummary.total,
			advancementsCompletedCount: advancementSummary.completed,
			distanceTraveledCm: customStats.distanceTraveledCm,
			deaths: customStats.deaths,
			leaveCount: customStats.leaveCount,
			playTimeTicks: customStats.playTimeTicks,
		},
		presence: matchedPlayer
			? {
					online: matchedPlayer.online,
					lastSavedLocation: resolvePresenceLocation({
						worldName: matchedPlayer.playerData?.lastWorldName ?? null,
						dimension: matchedPlayer.playerData?.lastDimension ?? null,
						x: matchedPlayer.playerData?.lastX ?? null,
						y: matchedPlayer.playerData?.lastY ?? null,
						z: matchedPlayer.playerData?.lastZ ?? null,
						yaw: matchedPlayer.playerData?.lastYaw ?? null,
						pitch: matchedPlayer.playerData?.lastPitch ?? null,
						observedAt: matchedPlayer.playerData?.syncedAt ?? null,
					}),
				}
			: null,
		recentHistory: histories.slice(0, 5).map((history) => ({
			id: history.id,
			action: history.action,
			reason: history.reason,
			createdAt: history.createdAt.toISOString(),
		})),
	}
}

const toPlayerPresenceLocation = (
	player: ServerPlayerWithSnapshots,
): MinecraftLocationSummary | null =>
	resolvePresenceLocation({
		worldName: player.playerData?.lastWorldName ?? null,
		dimension: player.playerData?.lastDimension ?? null,
		x: player.playerData?.lastX ?? null,
		y: player.playerData?.lastY ?? null,
		z: player.playerData?.lastZ ?? null,
		yaw: player.playerData?.lastYaw ?? null,
		pitch: player.playerData?.lastPitch ?? null,
		observedAt: player.playerData?.syncedAt ?? null,
	})

/**
 * 未绑定 portal 账户的玩家：仅凭 minecraftServerPlayer 游戏数据
 * 构造一个 MinecraftAccountSummary 形状的记录，使公开页 Content 组件可零改动复用。
 *
 * 与 buildMinecraftAccountSummary 的区别：无 account/authMe/bindingHistory，
 * 字段用游戏侧数据填充；account 专属字段（status/source/isPrimary 等）用占位值。
 * players 需由调用方按 normalizedUsername 查询并按 online/bridgeSyncedAt 排序。
 */
export const buildUnboundPlayerSummary = (
	players: ServerPlayerWithSnapshots[],
	luckPermsResolver?: ReturnType<
		typeof createLuckPermsPrimaryGroupResolver
	> | null,
): MinecraftAccountSummaryRecord | null => {
	const preferredPlayer = players[0] ?? null

	if (!preferredPlayer) {
		return null
	}

	const observedPlayers = players.map((player) =>
		toObservedPlayerSummary(player, luckPermsResolver),
	)
	const statsCount = countStatsEntries(preferredPlayer.statsSnapshot?.stats)
	const advancementSummary = summarizeAdvancements(
		preferredPlayer.advancementsSnapshot?.advancements,
	)
	const customStats = extractCustomStats(preferredPlayer.statsSnapshot?.stats)
	const syncedAtIso =
		preferredPlayer.bridgeSyncedAt?.toISOString() ?? '1970-01-01T00:00:00.000Z'
	const playerId =
		preferredPlayer.username ??
		preferredPlayer.playerData?.lastKnownName ??
		null

	return {
		id: `unbound:${preferredPlayer.uuid}`,
		username: preferredPlayer.username ?? playerId ?? '',
		normalizedUsername: preferredPlayer.normalizedUsername ?? '',
		uuid: preferredPlayer.uuid,
		status: 'ACTIVE',
		source: 'SERVER',
		authmeName: null,
		authmeId: null,
		authmeUsername: null,
		authmeRealname: null,
		firstJoinedAt:
			preferredPlayer.playerData?.firstPlayedAt?.toISOString() ?? null,
		lastSeenAt:
			preferredPlayer.playerData?.lastPlayedAt?.toISOString() ??
			preferredPlayer.lastSeenAt?.toISOString() ??
			null,
		isPrimary: true,
		verifiedAt: null,
		unlinkedAt: null,
		createdAt: syncedAtIso,
		updatedAt: syncedAtIso,
		playerIdentity: {
			playerId,
			boundUuid: null,
			resolvedUuid: preferredPlayer.uuid,
			observedUuidCount: observedPlayers.length,
			hasUuidConflict: observedPlayers.length > 1,
			observedPlayers,
		},
		luckPermsPrimaryGroup: resolveLuckPermsPrimaryGroup(luckPermsResolver, {
			uuid: preferredPlayer.uuid,
			normalizedUsername: preferredPlayer.normalizedUsername ?? null,
		}),
		playerProfile: {
			firstPlayedAt:
				preferredPlayer.playerData?.firstPlayedAt?.toISOString() ?? null,
			lastPlayedAt:
				preferredPlayer.playerData?.lastPlayedAt?.toISOString() ?? null,
			hasStats: Boolean(preferredPlayer.statsSnapshot),
			hasAdvancements: Boolean(preferredPlayer.advancementsSnapshot),
			statsCount,
			advancementsTotalCount: advancementSummary.total,
			advancementsCompletedCount: advancementSummary.completed,
			distanceTraveledCm: customStats.distanceTraveledCm,
			deaths: customStats.deaths,
			leaveCount: customStats.leaveCount,
			playTimeTicks: customStats.playTimeTicks,
		},
		presence: {
			online: preferredPlayer.online,
			lastSavedLocation: toPlayerPresenceLocation(preferredPlayer),
		},
		recentHistory: [],
	}
}
