import type { MinecraftServerSnapshotKind } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { createApiError } from '../errors'
import { toMinecraftServerSummary } from './server-config'

interface PlayerSnapshotItem {
	uuid: string
	username: string
	normalizedUsername: string
	uuidSource: string | null
	lastSeenAt: string | null
}

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

const readPlayerSnapshotPlayers = (payload: unknown): PlayerSnapshotItem[] => {
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
		const username =
			typeof record.username === 'string' ? record.username : null
		const normalizedUsername =
			typeof record.normalizedUsername === 'string'
				? record.normalizedUsername
				: null

		if (!uuid || !username || !normalizedUsername) {
			return []
		}

		return [
			{
				uuid,
				username,
				normalizedUsername,
				uuidSource:
					typeof record.uuidSource === 'string' ? record.uuidSource : null,
				lastSeenAt:
					typeof record.lastSeenAt === 'string' ? record.lastSeenAt : null,
			},
		]
	})
}

export const getMinecraftServerOverview = async (serverId: string) => {
	const server = await prisma.minecraftServer.findUnique({
		where: {
			serverId,
		},
		include: {
			portalBridge: true,
			authMe: true,
			luckPerms: true,
		},
	})

	if (!server) {
		throw createApiError({
			statusCode: 404,
			code: 'MINECRAFT_SERVER_NOT_FOUND',
		})
	}

	const statusKinds: MinecraftServerSnapshotKind[] = ['PLAYER_SNAPSHOT']
	const [
		statusSnapshots,
		latestPlayerSnapshot,
		latestSnapshots,
		identityCount,
		openSessionCount,
		totalSessionCount,
		lastReceipt,
		recentReceipts,
		recentCommands,
	] = await Promise.all([
		prisma.minecraftServerSnapshot.findMany({
			where: {
				serverId,
				kind: {
					in: statusKinds,
				},
			},
			orderBy: {
				observedAt: 'desc',
			},
			take: 48,
		}),
		prisma.minecraftServerSnapshot.findFirst({
			where: {
				serverId,
				kind: 'PLAYER_SNAPSHOT',
			},
			orderBy: {
				observedAt: 'desc',
			},
		}),
		prisma.minecraftServerSnapshot.findMany({
			where: {
				serverId,
			},
			distinct: ['kind'],
			orderBy: [
				{
					kind: 'asc',
				},
				{
					observedAt: 'desc',
				},
			],
		}),
		prisma.serverPlayerIdentity.count({
			where: {
				serverId,
			},
		}),
		prisma.serverPlayerSession.count({
			where: {
				serverId,
				closedAt: null,
			},
		}),
		prisma.serverPlayerSession.count({
			where: {
				serverId,
			},
		}),
		server.portalBridge
			? prisma.portalBridgeMessageReceipt.findFirst({
					where: {
						bridgeConfigId: server.portalBridge.id,
					},
					orderBy: {
						receivedAt: 'desc',
					},
				})
			: null,
		server.portalBridge
			? prisma.portalBridgeMessageReceipt.findMany({
					where: {
						bridgeConfigId: server.portalBridge.id,
					},
					orderBy: {
						receivedAt: 'desc',
					},
					take: 8,
				})
			: [],
		server.portalBridge
			? prisma.portalBridgeCommand.findMany({
					where: {
						bridgeConfigId: server.portalBridge.id,
					},
					orderBy: {
						createdAt: 'desc',
					},
					take: 8,
				})
			: [],
	])

	const playerHistory = statusSnapshots
		.map((snapshot) => ({
			observedAt: snapshot.observedAt,
			onlinePlayers: readPlayerCount(snapshot.payload),
			maxPlayers: readNumber(snapshot.payload, 'maxPlayers'),
		}))
		.filter((item) => item.onlinePlayers !== null)
		.reverse()
	const latestStatus = playerHistory.at(-1) ?? null
	const latestObservedPlayers = latestPlayerSnapshot
		? {
				observedAt: latestPlayerSnapshot.observedAt,
				players: readPlayerSnapshotPlayers(latestPlayerSnapshot.payload),
			}
		: null

	return {
		server: toMinecraftServerSummary(server),
		metrics: {
			identityCount,
			openSessionCount,
			totalSessionCount,
			latestPlayerSnapshot: latestObservedPlayers,
			latestStatus,
			playerHistory,
		},
		snapshots: latestSnapshots.map((snapshot) => ({
			id: snapshot.id,
			kind: snapshot.kind,
			observedAt: snapshot.observedAt,
			createdAt: snapshot.createdAt,
			payload: snapshot.payload,
		})),
		bridge: {
			lastReceipt: lastReceipt
				? {
						topic: lastReceipt.topic,
						seq: lastReceipt.seq?.toString() ?? null,
						receivedAt: lastReceipt.receivedAt,
						ackedAt: lastReceipt.ackedAt,
						payload: lastReceipt.payload,
					}
				: null,
			recentReceipts: recentReceipts.map((receipt) => ({
				id: receipt.id,
				topic: receipt.topic,
				seq: receipt.seq?.toString() ?? null,
				receivedAt: receipt.receivedAt,
				ackedAt: receipt.ackedAt,
				payload: receipt.payload,
			})),
			recentCommands: recentCommands.map((command) => ({
				id: command.id,
				commandId: command.commandId,
				action: command.action,
				status: command.status,
				sentAt: command.sentAt,
				completedAt: command.completedAt,
				errorMessage: command.errorMessage,
				payload: command.payload,
				createdAt: command.createdAt,
			})),
		},
	}
}
