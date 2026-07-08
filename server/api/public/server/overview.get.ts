import { prisma } from '../../../utils/db/prisma'
import { listAdminMinecraftAccountOverviewCandidates } from '../../../utils/admin/players'
import {
	buildMinecraftAccountSummary,
	buildUnboundPlayerSummary,
	minecraftAccountSummaryPlayerInclude,
} from '../../../utils/minecraft/account-summary'
import {
	getMinecraftBodyRendererUrl,
	getMinecraftSkinRendererUrl,
} from '../../../../utils/minecraft/body-renderer'
import { createLuckPermsPrimaryGroupResolver } from '../../../utils/luckperms/primary-group'
import { readLuckPermsSnapshotBundle } from '../../../utils/luckperms/snapshot'
import {
	DEFAULT_SERVER_OVERVIEW_PLAYER_ACCENT,
	type ServerOverviewRecommendedPlayer,
	type ServerOverviewRecommendedUser,
	type ServerOverviewResponse,
} from '../../../../utils/server/overview'
import {
	countPublicHistoricalOverviewPlayers,
	countPublicOverviewPlayers,
	countPublicOverviewUsers,
	isPublicProfileCandidate,
	listPublicOverviewServers,
	resolvePublicOverviewDefaultServerId,
} from '../../../utils/server/public-overview'

const PLAYER_INCLUDE = minecraftAccountSummaryPlayerInclude

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
					searchableInUserDirectory: true,
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

export default defineEventHandler(async (): Promise<ServerOverviewResponse> => {
	const serverItems = await listPublicOverviewServers()
	const [
		recommendedUsers,
		recommendedPlayers,
		totalUsers,
		totalPlayers,
		historicalPlayersCount,
	] = await Promise.all([
		listRecommendedUsers(),
		listRecommendedPlayers(),
		countPublicOverviewUsers(),
		countPublicOverviewPlayers(),
		countPublicHistoricalOverviewPlayers(),
	])

	return {
		servers: serverItems,
		defaultServerId: resolvePublicOverviewDefaultServerId(serverItems),
		totalUsers,
		totalPlayers,
		historicalPlayersCount,
		recommendedUsers,
		recommendedPlayers,
	}
})
