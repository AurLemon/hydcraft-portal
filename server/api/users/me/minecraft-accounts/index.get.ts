import { prisma } from '../../../../utils/db/prisma'
import { requireCurrentUser } from '../../../../utils/auth/session'

interface JsonRecord {
	[key: string]: unknown
}

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

interface PlayerIdentitySummary {
	playerId: string | null
	boundUuid: string | null
	resolvedUuid: string | null
	observedUuidCount: number
	hasUuidConflict: boolean
	observedPlayers: Array<{
		uuid: string
		username: string | null
		online: boolean
		lastSeenAt: string | null
		lastPlayedAt: string | null
		playerProfile: {
			firstPlayedAt: string | null
			lastPlayedAt: string | null
			hasStats: boolean
			hasAdvancements: boolean
			statsCount: number
			advancementsTotalCount: number
			advancementsCompletedCount: number
		}
		lastSavedLocation: MinecraftLocationSummary | null
	}>
}

const isRecord = (value: unknown): value is JsonRecord =>
	typeof value === 'object' && value !== null && !Array.isArray(value)

const countStatsEntries = (stats: unknown): number => {
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

const summarizeAdvancements = (advancements: unknown): AdvancementSummary => {
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

const resolvePresenceLocation = (
	location:
		| (Omit<MinecraftLocationSummary, 'observedAt'> & {
				observedAt: Date | null
		  })
		| null,
): MinecraftLocationSummary | null => {
	if (!location) {
		return null
	}

	return {
		...location,
		observedAt: location.observedAt?.toISOString() ?? null,
	}
}

export default defineEventHandler(async (event) => {
	const currentUser = await requireCurrentUser(event)
	const accounts = await prisma.minecraftAccount.findMany({
		where: {
			userId: currentUser.id,
			unlinkedAt: null,
		},
		include: {
			authMeAccount: true,
		},
		orderBy: [
			{
				isPrimary: 'desc',
			},
			{
				updatedAt: 'desc',
			},
		],
	})
	const players = await prisma.minecraftServerPlayer.findMany({
		where: {
			OR: [
				{
					uuid: {
						in: accounts
							.map((account) => account.uuid)
							.filter((uuid): uuid is string => Boolean(uuid)),
					},
				},
				{
					normalizedUsername: {
						in: accounts.map((account) => account.normalizedUsername),
					},
				},
			],
		},
		include: {
			playerData: true,
			statsSnapshot: true,
			advancementsSnapshot: true,
		},
		orderBy: [{ online: 'desc' }, { bridgeSyncedAt: 'desc' }],
	})
	const histories = await prisma.minecraftAccountBindingHistory.findMany({
		where: {
			minecraftAccountId: {
				in: accounts.map((account) => account.id),
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
	})
	const preferredPlayerByAccountId = new Map<
		string,
		(typeof players)[number] | null
	>()
	const historyByAccountId = new Map<string, typeof histories>()

	for (const history of histories) {
		const bucket = historyByAccountId.get(history.minecraftAccountId) ?? []
		bucket.push(history)
		historyByAccountId.set(history.minecraftAccountId, bucket)
	}

	for (const account of accounts) {
		const matchedPlayers = players.filter(
			(player) =>
				(account.uuid ? player.uuid === account.uuid : false) ||
				player.normalizedUsername === account.normalizedUsername,
		)
		const matchedPlayer =
			(account.uuid
				? matchedPlayers.find((player) => player.uuid === account.uuid)
				: null) ??
			matchedPlayers[0] ??
			null

		preferredPlayerByAccountId.set(account.id, matchedPlayer)
	}

	return {
		accounts: accounts.map((account) => {
			const player = preferredPlayerByAccountId.get(account.id) ?? null
			const matchedPlayers = players.filter(
				(candidate) =>
					(account.uuid ? candidate.uuid === account.uuid : false) ||
					candidate.normalizedUsername === account.normalizedUsername,
			)
			const statsCount = countStatsEntries(player?.statsSnapshot?.stats)
			const advancementSummary = summarizeAdvancements(
				player?.advancementsSnapshot?.advancements,
			)
			const playerIdentity: PlayerIdentitySummary = {
				playerId:
					account.authMeAccount?.realname ??
					account.authMeAccount?.username ??
					account.authmeName ??
					account.username,
				boundUuid: account.uuid,
				resolvedUuid: player?.uuid ?? account.uuid,
				observedUuidCount: matchedPlayers.length,
				hasUuidConflict: matchedPlayers.length > 1,
				observedPlayers: matchedPlayers.map((matchedPlayer) => {
					const observedStatsCount = countStatsEntries(
						matchedPlayer.statsSnapshot?.stats,
					)
					const observedAdvancements = summarizeAdvancements(
						matchedPlayer.advancementsSnapshot?.advancements,
					)

					return {
						uuid: matchedPlayer.uuid,
						username: matchedPlayer.username,
						online: matchedPlayer.online,
						lastSeenAt: matchedPlayer.lastSeenAt?.toISOString() ?? null,
						lastPlayedAt:
							matchedPlayer.playerData?.lastPlayedAt?.toISOString() ?? null,
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
				}),
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
					player?.playerData?.firstPlayedAt?.toISOString() ??
					null,
				lastSeenAt:
					account.lastSeenAt?.toISOString() ??
					player?.playerData?.lastPlayedAt?.toISOString() ??
					null,
				isPrimary: account.isPrimary,
				verifiedAt: account.verifiedAt?.toISOString() ?? null,
				unlinkedAt: account.unlinkedAt?.toISOString() ?? null,
				createdAt: account.createdAt.toISOString(),
				updatedAt: account.updatedAt.toISOString(),
				playerIdentity,
				playerProfile: {
					firstPlayedAt:
						player?.playerData?.firstPlayedAt?.toISOString() ?? null,
					lastPlayedAt: player?.playerData?.lastPlayedAt?.toISOString() ?? null,
					hasStats: Boolean(player?.statsSnapshot),
					hasAdvancements: Boolean(player?.advancementsSnapshot),
					statsCount,
					advancementsTotalCount: advancementSummary.total,
					advancementsCompletedCount: advancementSummary.completed,
				},
				presence: player
					? {
							online: player.online,
							lastSavedLocation: resolvePresenceLocation({
								worldName: player.playerData?.lastWorldName ?? null,
								dimension: player.playerData?.lastDimension ?? null,
								x: player.playerData?.lastX ?? null,
								y: player.playerData?.lastY ?? null,
								z: player.playerData?.lastZ ?? null,
								yaw: player.playerData?.lastYaw ?? null,
								pitch: player.playerData?.lastPitch ?? null,
								observedAt: player.playerData?.syncedAt ?? null,
							}),
						}
					: null,
				recentHistory: (historyByAccountId.get(account.id) ?? [])
					.slice(0, 5)
					.map((history) => ({
						id: history.id,
						action: history.action,
						reason: history.reason,
						createdAt: history.createdAt.toISOString(),
					})),
			}
		}),
	}
})
