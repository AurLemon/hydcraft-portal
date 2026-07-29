import { prisma } from '~/server/utils/db/prisma'
import { portalBridgeManager } from '~/server/utils/portal-bridge/client'
import { listAdminMinecraftAccountOverviewCandidates } from '~/server/utils/admin/players'
import type {
	ServerOverviewLiveResponse,
	ServerOverviewResponse,
} from '~/utils/server/overview'
import { toMinecraftServerLocalizedName } from '~/utils/minecraft/server-name'

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
): Array<{ uuid: string; username: string | null; mcid: string | null }> => {
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
				mcid:
					typeof record.username === 'string' &&
					record.username.trim().length > 0
						? record.username
						: null,
			},
		]
	})
}

const readOnlineHistory = (
	snapshots: Array<{
		observedAt: Date
		payload: unknown
	}>,
): ServerOverviewResponse['servers'][number]['bridgeStatus']['onlineHistory'] =>
	snapshots
		.map((snapshot) => ({
			observedAt: snapshot.observedAt.toISOString(),
			onlinePlayers: readPlayerCount(snapshot.payload),
			maxPlayers: readNumber(snapshot.payload, 'maxPlayers'),
		}))
		.filter(
			(
				point,
			): point is {
				observedAt: string
				onlinePlayers: number
				maxPlayers: number | null
			} => point.onlinePlayers !== null,
		)
		.reverse()

export const isPublicProfileCandidate = (
	privacy: {
		publicProfile: boolean | null
		searchableInUserDirectory: boolean | null
	} | null,
): boolean =>
	(privacy?.publicProfile ?? true) &&
	(privacy?.searchableInUserDirectory ?? true)

export const listPublicOverviewServers = async (): Promise<
	ServerOverviewLiveResponse['servers']
> => {
	const servers = await prisma.minecraftServer.findMany({
		where: {
			status: 'ONLINE',
			portalBridge: {
				isNot: null,
			},
		},
		orderBy: [
			{ isDefault: 'desc' },
			{ sortOrder: 'asc' },
			{ createdAt: 'asc' },
		],
		include: {
			portalBridge: true,
		},
	})

	return await Promise.all(
		servers.map(async (server) => {
			const [
				latestPlayerSnapshot,
				latestStatusSnapshot,
				playerHistorySnapshots,
			] = await Promise.all([
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
				prisma.minecraftServerSnapshot.findMany({
					where: {
						serverId: server.serverId,
						kind: 'PLAYER_SNAPSHOT',
					},
					orderBy: {
						observedAt: 'desc',
					},
					take: 24,
					select: {
						observedAt: true,
						payload: true,
					},
				}),
			])
			const runtime = server.portalBridge
				? portalBridgeManager.getStatus(server.portalBridge.id)
				: null
			const connected = runtime?.connected ?? false
			const observedPlayers = connected
				? readObservedPlayers(latestPlayerSnapshot?.payload)
				: []
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
				name: server.nameZhCn,
				names: toMinecraftServerLocalizedName({
					nameZhCn: server.nameZhCn,
					nameZhTw: server.nameZhTw,
					nameEnUs: server.nameEnUs,
					nameJaJp: server.nameJaJp,
				}),
				isDefault: server.isDefault,
				bridgeStatus: {
					enabled: true,
					connected,
					running: runtime?.running ?? false,
					manualRequired: runtime?.manualRequired ?? false,
					lastHeartbeatAt: runtime?.lastHeartbeatAt?.toISOString() ?? null,
					lastConnectionState: server.portalBridge?.lastConnectionState ?? null,
					onlineCount,
					maxPlayers,
					observedPlayers,
					onlineHistory: readOnlineHistory(playerHistorySnapshots),
				},
			}
		}),
	)
}

export const resolvePublicOverviewDefaultServerId = (
	servers: ServerOverviewLiveResponse['servers'],
): string | null =>
	servers.find((server) => server.isDefault)?.serverId ??
	servers[0]?.serverId ??
	null

export const countPublicOverviewUsers = async (): Promise<number> => {
	const users = await prisma.user.findMany({
		select: {
			privacy: {
				select: {
					publicProfile: true,
					searchableInUserDirectory: true,
				},
			},
		},
	})

	return users.filter((user) => isPublicProfileCandidate(user.privacy)).length
}

export const countPublicOverviewPlayers = async (): Promise<number> => {
	const adminPlayers = await listAdminMinecraftAccountOverviewCandidates()

	return adminPlayers.filter((player) => Boolean(player.normalizedUsername))
		.length
}

export const countPublicHistoricalOverviewPlayers = async (): Promise<number> =>
	prisma.minecraftAccount.count({
		where: {
			identityKind: 'HISTORICAL',
			unlinkedAt: null,
		},
	})
