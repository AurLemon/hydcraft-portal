import type { Prisma } from '~/generated/prisma/client'
import {
	toMinecraftServerLocalizedName,
	type MinecraftServerLocalizedName,
} from '~/utils/minecraft/server-name'
import type { createLuckPermsPrimaryGroupResolver } from '../luckperms/primary-group'

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
	serverId: string
	serverNames: MinecraftServerLocalizedName | null
	serverHasTiles: boolean
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

interface ServerViewSummary {
	id: string
	serverId: string | null
	serverNames: MinecraftServerLocalizedName | null
	uuid: string | null
	label: string
	hasMap: boolean
	mapConfig: {
		tileBaseUrl: string | null
		worldName: string
		mapName: string
		tileExtension: string
		defaultCenterX: number
		defaultCenterZ: number
		defaultZoom: number
	} | null
	online: boolean
	firstJoinedAt: string | null
	lastSeenAt: string | null
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
}

export interface MinecraftAccountSummaryRecord {
	id: string
	username: string
	normalizedUsername: string
	uuid: string | null
	status: string
	source: string
	identityKind: string
	assignmentMode: string
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
	serverViews: ServerViewSummary[]
	defaultViewId: string
	recentHistory: Array<{
		id: string
		action: string
		reason: string | null
		createdAt: string
	}>
	boundPortalUser?: {
		username: string
		avatarUrl: string | null
	} | null
}

type AccountWithAuthMe = Prisma.MinecraftAccountGetPayload<{
	include: { authMeAccount: true }
}>

export const minecraftAccountSummaryPlayerInclude = {
	server: {
		include: {
			mapConfig: true,
		},
	},
	playerData: true,
	statsSnapshot: true,
	advancementsSnapshot: true,
} satisfies Prisma.MinecraftServerPlayerInclude

type ServerPlayerWithSnapshots = Prisma.MinecraftServerPlayerGetPayload<{
	include: typeof minecraftAccountSummaryPlayerInclude
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
const LEGACY_STAT_PLAY_ONE_MINUTE = 'stat.playOneMinute'
const LEGACY_STAT_DEATHS = 'stat.deaths'
const LEGACY_STAT_LEAVE_GAME = 'stat.leaveGame'
const MODERN_STAT_PLAY_ONE_MINUTE = 'minecraft:play_one_minute'
const MODERN_STAT_PLAY_TIME = 'minecraft:play_time'
const MODERN_STAT_DEATHS = 'minecraft:deaths'
const MODERN_STAT_LEAVE_GAME = 'minecraft:leave_game'
const MODERN_DISTANCE_KEY_PATTERN = /(^|:)[a-z0-9_]+_one_cm$/i
const LEGACY_DISTANCE_KEY_PATTERN = /^stat\.[A-Za-z0-9]+OneCm$/i

const EMPTY_CUSTOM_STATS: CustomStatsSummary = {
	distanceTraveledCm: 0,
	deaths: 0,
	leaveCount: 0,
	playTimeTicks: 0,
}

const buildServerViewId = (serverId: string, uuid: string): string =>
	`${serverId}:${uuid}`

const readCustomStatNumber = (custom: JsonRecord, key: string): number => {
	const value = custom[key]
	return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

const sumCustomStatNumbers = (custom: JsonRecord, keys: string[]): number =>
	keys.reduce((total, key) => total + readCustomStatNumber(custom, key), 0)

const resolveStatsRoot = (stats: unknown): JsonRecord | null => {
	if (!isRecord(stats)) {
		return null
	}

	return isRecord(stats[STATS_FILE_ROOT_KEY])
		? (stats[STATS_FILE_ROOT_KEY] as JsonRecord)
		: null
}

const resolveCustomStatsRecord = (stats: unknown): JsonRecord | null => {
	if (!isRecord(stats)) {
		return null
	}

	const statsRoot = resolveStatsRoot(stats)
	if (statsRoot && isRecord(statsRoot[STATS_CUSTOM_CATEGORY])) {
		return statsRoot[STATS_CUSTOM_CATEGORY] as JsonRecord
	}

	return stats
}

const sumDistanceLikeStats = (custom: JsonRecord): number =>
	Object.entries(custom).reduce((total, [key, value]) => {
		if (typeof value !== 'number' || !Number.isFinite(value)) {
			return total
		}

		if (
			MODERN_DISTANCE_KEY_PATTERN.test(key) ||
			LEGACY_DISTANCE_KEY_PATTERN.test(key)
		) {
			return total + value
		}

		return total
	}, 0)

/**
 * 从 vanilla stats JSON 的 `minecraft:custom` 分类下提取展示卡所需的几项关键统计。
 *
 * 新版 vanilla stats 结构为 `{ stats: { 'minecraft:custom': {...}, ... }, DataVersion }`，
 * 1.12/1.7 等旧版则是扁平 `stat.*` 键。落库时整文件原样存入 `statsSnapshot.stats`，
 * 因此这里同时兼容 nested modern 与 legacy flat layout。
 *
 * 单位保持原始值：距离为厘米（`*_one_cm` / `*OneCm`）、游玩时间为 tick（20 tick = 1 秒），
 * `deaths` / `leave_game` 为整数计数。单位换算交由前端展示层处理，避免后端反复改。
 */
export const extractCustomStats = (stats: unknown): CustomStatsSummary => {
	const custom = resolveCustomStatsRecord(stats)
	if (!custom) {
		return { ...EMPTY_CUSTOM_STATS }
	}

	const playTimeTicks =
		sumCustomStatNumbers(custom, [
			MODERN_STAT_PLAY_ONE_MINUTE,
			MODERN_STAT_PLAY_TIME,
			LEGACY_STAT_PLAY_ONE_MINUTE,
		]) || 0

	return {
		distanceTraveledCm: sumDistanceLikeStats(custom),
		deaths: sumCustomStatNumbers(custom, [
			MODERN_STAT_DEATHS,
			LEGACY_STAT_DEATHS,
		]),
		leaveCount: sumCustomStatNumbers(custom, [
			MODERN_STAT_LEAVE_GAME,
			LEGACY_STAT_LEAVE_GAME,
		]),
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

	const statsRoot = resolveStatsRoot(stats)
	if (statsRoot) {
		return Object.values(statsRoot).reduce<number>((total, entry) => {
			if (!isRecord(entry)) {
				return total + 1
			}

			return total + Object.keys(entry).length
		}, 0)
	}

	return Object.entries(stats).reduce<number>((total, [key, entry]) => {
		if (key === 'DataVersion') {
			return total
		}

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

const minDate = (left: Date | null, right: Date | null): Date | null => {
	if (!left) {
		return right
	}

	if (!right) {
		return left
	}

	return left.getTime() <= right.getTime() ? left : right
}

const maxDate = (left: Date | null, right: Date | null): Date | null => {
	if (!left) {
		return right
	}

	if (!right) {
		return left
	}

	return left.getTime() >= right.getTime() ? left : right
}

const toIsoString = (value: Date | null | undefined): string | null =>
	value?.toISOString() ?? null

const matchesAccount = (
	candidate: ServerPlayerWithSnapshots,
	account: AccountWithAuthMe,
): boolean =>
	candidate.portalAccountId === account.id ||
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
		serverId: matchedPlayer.server.serverId,
		serverNames: toMinecraftServerLocalizedName(matchedPlayer.server),
		serverHasTiles: Boolean(
			matchedPlayer.server.mapConfig?.enabled &&
			matchedPlayer.server.mapConfig?.hasTiles,
		),
		uuid: matchedPlayer.uuid,
		username:
			matchedPlayer.username ?? matchedPlayer.playerData?.lastKnownName ?? null,
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

const summarizePlayerProfile = (player: ServerPlayerWithSnapshots | null) => {
	const statsCount = countStatsEntries(player?.statsSnapshot?.stats)
	const advancementSummary = summarizeAdvancements(
		player?.advancementsSnapshot?.advancements,
	)
	const customStats = extractCustomStats(player?.statsSnapshot?.stats)

	return {
		firstPlayedAt: toIsoString(player?.playerData?.firstPlayedAt),
		lastPlayedAt: toIsoString(player?.playerData?.lastPlayedAt),
		hasStats: Boolean(player?.statsSnapshot),
		hasAdvancements: Boolean(player?.advancementsSnapshot),
		statsCount,
		advancementsTotalCount: advancementSummary.total,
		advancementsCompletedCount: advancementSummary.completed,
		distanceTraveledCm: customStats.distanceTraveledCm,
		deaths: customStats.deaths,
		leaveCount: customStats.leaveCount,
		playTimeTicks: customStats.playTimeTicks,
	}
}

const summarizeAggregateProfile = (players: ServerPlayerWithSnapshots[]) => {
	const firstPlayedAt = players.reduce<Date | null>(
		(result, player) =>
			minDate(result, player.playerData?.firstPlayedAt ?? null),
		null,
	)
	const lastPlayedAt = players.reduce<Date | null>(
		(result, player) =>
			maxDate(result, player.playerData?.lastPlayedAt ?? null),
		null,
	)

	return players.reduce(
		(summary, player) => {
			const current = summarizePlayerProfile(player)
			return {
				firstPlayedAt: toIsoString(firstPlayedAt),
				lastPlayedAt: toIsoString(lastPlayedAt),
				hasStats: summary.hasStats || current.hasStats,
				hasAdvancements: summary.hasAdvancements || current.hasAdvancements,
				statsCount: summary.statsCount + current.statsCount,
				advancementsTotalCount:
					summary.advancementsTotalCount + current.advancementsTotalCount,
				advancementsCompletedCount:
					summary.advancementsCompletedCount +
					current.advancementsCompletedCount,
				distanceTraveledCm:
					summary.distanceTraveledCm + current.distanceTraveledCm,
				deaths: summary.deaths + current.deaths,
				leaveCount: summary.leaveCount + current.leaveCount,
				playTimeTicks: summary.playTimeTicks + current.playTimeTicks,
			}
		},
		{
			firstPlayedAt: toIsoString(firstPlayedAt),
			lastPlayedAt: toIsoString(lastPlayedAt),
			hasStats: false,
			hasAdvancements: false,
			statsCount: 0,
			advancementsTotalCount: 0,
			advancementsCompletedCount: 0,
			distanceTraveledCm: 0,
			deaths: 0,
			leaveCount: 0,
			playTimeTicks: 0,
		},
	)
}

const resolveObservedLastSeenAt = (
	player: Pick<ServerPlayerWithSnapshots, 'playerData'>,
): Date | null => player.playerData?.lastPlayedAt ?? null

const resolveAggregateLastSeenAt = (
	players: Pick<ServerPlayerWithSnapshots, 'playerData'>[],
): Date | null =>
	players.reduce<Date | null>(
		(result, player) => maxDate(result, resolveObservedLastSeenAt(player)),
		null,
	)

const resolveAggregateFirstJoinedAt = (
	players: Pick<ServerPlayerWithSnapshots, 'playerData'>[],
): Date | null =>
	players.reduce<Date | null>(
		(result, player) =>
			minDate(result, player.playerData?.firstPlayedAt ?? null),
		null,
	)

const buildServerViews = (
	players: ServerPlayerWithSnapshots[],
	luckPermsResolver?: ReturnType<
		typeof createLuckPermsPrimaryGroupResolver
	> | null,
): ServerViewSummary[] => {
	if (players.length === 0) {
		return []
	}

	const aggregateProfile = summarizeAggregateProfile(players)
	const aggregateFirstJoinedAt = resolveAggregateFirstJoinedAt(players)
	const aggregateLastSeenAt = resolveAggregateLastSeenAt(players)

	const aggregateView: ServerViewSummary = {
		id: '__aggregate__',
		serverId: null,
		serverNames: null,
		uuid: null,
		label: 'Aggregate',
		hasMap: false,
		mapConfig: null,
		online: players.some((player) => player.online),
		firstJoinedAt: toIsoString(aggregateFirstJoinedAt),
		lastSeenAt: toIsoString(aggregateLastSeenAt),
		luckPermsPrimaryGroup: null,
		playerProfile: aggregateProfile,
		presence: null,
	}

	const sortedPlayers = [...players].sort((left, right) => {
		if (left.server.sortOrder !== right.server.sortOrder) {
			return left.server.sortOrder - right.server.sortOrder
		}

		return left.server.createdAt.getTime() - right.server.createdAt.getTime()
	})

	const serverViews = sortedPlayers.map((player) => ({
		id: buildServerViewId(player.server.serverId, player.uuid),
		serverId: player.server.serverId,
		serverNames: toMinecraftServerLocalizedName(player.server),
		uuid: player.uuid,
		label: player.server.nameZhCn,
		hasMap: Boolean(
			player.server.mapConfig?.enabled && player.server.mapConfig?.hasTiles,
		),
		mapConfig:
			player.server.mapConfig &&
			player.server.mapConfig.enabled &&
			player.server.mapConfig.hasTiles
				? {
						tileBaseUrl: player.server.mapConfig.tileBaseUrl,
						worldName: player.server.mapConfig.worldName,
						mapName: player.server.mapConfig.mapName,
						tileExtension: player.server.mapConfig.tileExtension,
						defaultCenterX: player.server.mapConfig.defaultCenterX,
						defaultCenterZ: player.server.mapConfig.defaultCenterZ,
						defaultZoom: player.server.mapConfig.defaultZoom,
					}
				: null,
		online: player.online,
		firstJoinedAt: toIsoString(player.playerData?.firstPlayedAt),
		lastSeenAt: toIsoString(resolveObservedLastSeenAt(player)),
		luckPermsPrimaryGroup: resolveLuckPermsPrimaryGroup(luckPermsResolver, {
			uuid: player.uuid,
			normalizedUsername: player.normalizedUsername ?? null,
		}),
		playerProfile: summarizePlayerProfile(player),
		presence: {
			online: player.online,
			lastSavedLocation: toPlayerPresenceLocation(player),
		},
	}))

	return [aggregateView, ...serverViews]
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
	const aggregateFirstJoinedAt = resolveAggregateFirstJoinedAt(matchedPlayers)
	const aggregateLastSeenAt = resolveAggregateLastSeenAt(matchedPlayers)
	const aggregateFirstJoinedAtWithAuthMe = minDate(
		account.authMeAccount?.registeredAt ?? null,
		aggregateFirstJoinedAt,
	)
	const aggregateLastSeenAtWithAuthMe =
		account.authMeAccount?.lastLoginAt ?? aggregateLastSeenAt
	const serverViews = buildServerViews(matchedPlayers, luckPermsResolver)
	const aggregateView = serverViews[0] ?? null

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
		identityKind: account.identityKind,
		assignmentMode: account.assignmentMode,
		authmeName: account.authmeName,
		authmeId: account.authmeId,
		authmeUsername: account.authMeAccount?.username ?? null,
		authmeRealname: account.authMeAccount?.realname ?? null,
		firstJoinedAt:
			toIsoString(aggregateFirstJoinedAtWithAuthMe) ??
			account.firstJoinedAt?.toISOString() ??
			null,
		lastSeenAt: toIsoString(aggregateLastSeenAtWithAuthMe) ?? null,
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
		playerProfile:
			aggregateView?.playerProfile ?? summarizePlayerProfile(matchedPlayer),
		presence: aggregateView?.presence ?? null,
		serverViews,
		defaultViewId: serverViews[0]?.id ?? '__aggregate__',
		recentHistory: histories.slice(0, 5).map((history) => ({
			id: history.id,
			action: history.action,
			reason: history.reason,
			createdAt: history.createdAt.toISOString(),
		})),
	}
}

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
		identityKind: 'HISTORICAL',
		assignmentMode: 'IMPORTED_UNASSIGNED',
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
		playerProfile: summarizeAggregateProfile(players),
		presence: null,
		serverViews: buildServerViews(players, luckPermsResolver),
		defaultViewId: '__aggregate__',
		recentHistory: [],
	}
}
