import { prisma } from '../../../utils/db/prisma'
import { listAdminMinecraftAccountOverviewCandidates } from '../../../utils/admin/players'
import {
	buildMinecraftAccountSummary,
	buildUnboundPlayerSummary,
} from '../../../utils/minecraft/account-summary'
import {
	getMinecraftBodyRendererUrl,
	getMinecraftSkinRendererUrl,
} from '../../../../utils/minecraft/body-renderer'
import { portalBridgeManager } from '../../../utils/portal-bridge/client'
import { createLuckPermsPrimaryGroupResolver } from '../../../utils/luckperms/primary-group'
import { readLuckPermsSnapshotBundle } from '../../../utils/luckperms/snapshot'
import {
	DEFAULT_SERVER_OVERVIEW_PLAYER_ACCENT,
	type ServerOverviewRecommendedPlayer,
	type ServerOverviewRecommendedUser,
	type ServerOverviewResponse,
} from '../../../../utils/server/overview'

const PLAYER_INCLUDE = {
	playerData: true,
	statsSnapshot: true,
	advancementsSnapshot: true,
} as const

const readNumber = (payload: unknown, key: string): number | null => {
	if (!payload || typeof payload !== 'object') {
		return null
	}

	const value = (payload as Record<string, unknown>)[key]

	return typeof value === 'number' && Number.isFinite(value) ? value : null
}

const readPlayerCount = (payload: unknown): number | null => {
	const onlinePlayers = readNumber(payload, 'onlinePlayers')

	if (onlinePlayers !== null) {
		return onlinePlayers
	}

	if (!payload || typeof payload !== 'object') {
		return null
	}

	const players = (payload as Record<string, unknown>).players

	return Array.isArray(players) ? players.length : null
}

const readObservedPlayers = (
	payload: unknown,
): Array<{ uuid: string; username: string | null }> => {
	if (!payload || typeof payload !== 'object') {
		return []
	}

	const players = (payload as Record<string, unknown>).players

	if (!Array.isArray(players)) {
		return []
	}

	return players.flatMap((player) => {
		if (!player || typeof player !== 'object') {
			return []
		}

		const record = player as Record<string, unknown>
		const uuid = typeof record.uuid === 'string' ? record.uuid : null

		if (!uuid) {
			return []
		}

		return [
			{
				uuid,
				username: typeof record.username === 'string' ? record.username : null,
			},
		]
	})
}

const shuffle = <T>(items: T[]): T[] => {
	const shuffled = [...items]

	for (let index = shuffled.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(Math.random() * (index + 1))
		const currentItem = shuffled[index]
		shuffled[index] = shuffled[randomIndex]!
		shuffled[randomIndex] = currentItem!
	}

	return shuffled
}

const pickRandomItems = <T>(items: T[], limit: number): T[] =>
	shuffle(items).slice(0, limit)

const isPublicProfileCandidate = (
	privacy: {
		publicProfile: boolean | null
	} | null,
): boolean => privacy?.publicProfile ?? true

const listRecommendedUsers = async (): Promise<
	ServerOverviewRecommendedUser[]
> => {
	const users = await prisma.user.findMany({
		select: {
			username: true,
			displayName: true,
			avatarUrl: true,
			coverUrl: true,
			bio: true,
			privacy: {
				select: {
					publicProfile: true,
				},
			},
		},
	})

	return pickRandomItems(
		users
			.filter((user) => isPublicProfileCandidate(user.privacy))
			.map((user) => ({
				username: user.username,
				displayName: user.displayName,
				avatarUrl: user.avatarUrl,
				coverUrl: user.coverUrl,
				bio: user.bio,
			})),
		10,
	)
}

const countPublicUsers = async (): Promise<number> => {
	const users = await prisma.user.findMany({
		select: {
			privacy: {
				select: {
					publicProfile: true,
				},
			},
		},
	})

	return users.filter((user) => isPublicProfileCandidate(user.privacy)).length
}

const buildRecommendedPlayerItem = async (
	normalizedUsername: string,
): Promise<ServerOverviewRecommendedPlayer | null> => {
	const players = await prisma.minecraftServerPlayer.findMany({
		where: {
			normalizedUsername,
		},
		include: PLAYER_INCLUDE,
		orderBy: [{ online: 'desc' }, { bridgeSyncedAt: 'desc' }],
	})

	if (players.length === 0) {
		return null
	}

	const [account, authMeAccount] = await Promise.all([
		prisma.minecraftAccount.findFirst({
			where: {
				normalizedUsername,
				unlinkedAt: null,
			},
			include: {
				authMeAccount: true,
			},
			orderBy: [{ isPrimary: 'desc' }, { updatedAt: 'desc' }],
		}),
		prisma.authMeAccount.findUnique({
			where: {
				normalizedUsername,
			},
		}),
	])

	const observedNames = players
		.map(
			(player) => player.username ?? player.playerData?.lastKnownName ?? null,
		)
		.filter((value): value is string => Boolean(value))
	const accountName = account?.username ?? account?.authmeName ?? null
	const displayName = observedNames[0] ?? accountName ?? normalizedUsername

	const luckPermsResolver = createLuckPermsPrimaryGroupResolver(
		await readLuckPermsSnapshotBundle({
			uuids: players.map((player) => player.uuid),
			normalizedUsernames: [normalizedUsername],
		}),
	)

	const summary = account
		? buildMinecraftAccountSummary(account, players, [], luckPermsResolver)
		: buildUnboundPlayerSummary(players, luckPermsResolver)

	if (!summary) {
		return null
	}

	const playerId =
		summary.playerIdentity.playerId ??
		summary.username ??
		displayName ??
		normalizedUsername

	return {
		mcid: playerId,
		username: playerId,
		skinBodyUrl: getMinecraftBodyRendererUrl(displayName),
		skinImageUrl: getMinecraftSkinRendererUrl(displayName),
		playTimeTicks: summary.playerProfile.playTimeTicks,
		hasStats: summary.playerProfile.hasStats,
		authMeLastLoginAt: authMeAccount?.lastLoginAt?.toISOString() ?? null,
		accentColor: { ...DEFAULT_SERVER_OVERVIEW_PLAYER_ACCENT },
	}
}

const listRecommendedPlayers = async (): Promise<
	ServerOverviewRecommendedPlayer[]
> => {
	const adminPlayers = await listAdminMinecraftAccountOverviewCandidates()
	const shuffledNames = shuffle(
		adminPlayers
			.map((player) => player.normalizedUsername)
			.filter((value): value is string => Boolean(value)),
	)

	const recommendedPlayers: ServerOverviewRecommendedPlayer[] = []

	for (const normalizedUsername of shuffledNames) {
		if (recommendedPlayers.length >= 10) {
			break
		}

		const item = await buildRecommendedPlayerItem(normalizedUsername)

		if (item) {
			recommendedPlayers.push(item)
		}
	}

	return recommendedPlayers
}

const countRecommendedPlayerCandidates = async (): Promise<number> => {
	const adminPlayers = await listAdminMinecraftAccountOverviewCandidates()

	return adminPlayers.filter((player) => Boolean(player.normalizedUsername))
		.length
}

export default defineEventHandler(async (): Promise<ServerOverviewResponse> => {
	const servers = await prisma.minecraftServer.findMany({
		where: {
			enabled: true,
		},
		orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
		include: {
			portalBridge: true,
		},
	})

	const serverItems = await Promise.all(
		servers.map(async (server) => {
			const [latestPlayerSnapshot, latestStatusSnapshot] = await Promise.all([
				prisma.minecraftServerSnapshot.findFirst({
					where: {
						serverId: server.serverId,
						kind: 'PLAYER_SNAPSHOT',
					},
					orderBy: {
						observedAt: 'desc',
					},
				}),
				prisma.minecraftServerSnapshot.findFirst({
					where: {
						serverId: server.serverId,
						kind: 'SERVER_STATUS',
					},
					orderBy: {
						observedAt: 'desc',
					},
				}),
			])
			const runtime = server.portalBridge
				? portalBridgeManager.getStatus(server.portalBridge.id)
				: null
			const observedPlayers = readObservedPlayers(latestPlayerSnapshot?.payload)
			const onlineCount =
				observedPlayers.length > 0
					? observedPlayers.length
					: (readPlayerCount(latestPlayerSnapshot?.payload) ??
						readPlayerCount(latestStatusSnapshot?.payload) ??
						0)
			const maxPlayers =
				readNumber(latestPlayerSnapshot?.payload, 'maxPlayers') ??
				readNumber(latestStatusSnapshot?.payload, 'maxPlayers')

			return {
				serverId: server.serverId,
				name: server.name,
				bridgeStatus: {
					enabled: server.portalBridge?.enabled ?? false,
					connected: runtime?.connected ?? false,
					running: runtime?.running ?? false,
					manualRequired: runtime?.manualRequired ?? false,
					lastHeartbeatAt: runtime?.lastHeartbeatAt?.toISOString() ?? null,
					lastConnectionState: server.portalBridge?.lastConnectionState ?? null,
					onlineCount,
					maxPlayers,
					observedPlayers,
				},
			}
		}),
	)
	const [recommendedUsers, recommendedPlayers, totalUsers, totalPlayers] =
		await Promise.all([
			listRecommendedUsers(),
			listRecommendedPlayers(),
			countPublicUsers(),
			countRecommendedPlayerCandidates(),
		])

	return {
		servers: serverItems,
		defaultServerId: serverItems[0]?.serverId ?? null,
		totalUsers,
		totalPlayers,
		recommendedUsers,
		recommendedPlayers,
	}
})
