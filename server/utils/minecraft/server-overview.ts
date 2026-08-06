import type { MinecraftServerSnapshotKind } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { createApiError } from '../errors'
import { listServerPlayerPreview } from '../admin/server-players'
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

// overview 内存缓存（P2-2）：admin 详情页每次打开触发 11 个并发 Prisma 查询，
// 加短期内存缓存降低 DB 压力。可被 bridge 状态变化/control 操作主动失效。
const OVERVIEW_CACHE_TTL_MS = 5_000
const overviewCache = new Map<
	string,
	{
		data: Awaited<ReturnType<typeof computeMinecraftServerOverview>>
		expiresAt: number
	}
>()

export const invalidateMinecraftServerOverviewCache = (
	serverId?: string,
): void => {
	if (serverId) {
		overviewCache.delete(serverId)
		return
	}

	overviewCache.clear()
}

export const getMinecraftServerOverview = async (serverId: string) => {
	const cached = overviewCache.get(serverId)

	if (cached && cached.expiresAt > Date.now()) {
		return cached.data
	}

	const data = await computeMinecraftServerOverview(serverId)

	overviewCache.set(serverId, {
		data,
		expiresAt: Date.now() + OVERVIEW_CACHE_TTL_MS,
	})

	return data
}

const computeMinecraftServerOverview = async (serverId: string) => {
	const server = await prisma.minecraftServer.findUnique({
		where: {
			serverId,
		},
		include: {
			portalBridge: true,
			blueMapConfig: true,
			periods: {
				orderBy: [{ sortOrder: 'asc' }, { startedAt: 'asc' }],
			},
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
		playerInfoPreview,
		openSessionCount,
		totalSessionCount,
		lastReceipt,
		recentReceipts,
		recentCommands,
		syncTaskStates,
		latestArchiveImportRun,
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
		prisma.minecraftServerPlayer.count({
			where: {
				serverId,
			},
		}),
		listServerPlayerPreview(serverId),
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
		prisma.externalSyncTaskState.findMany({
			where: {
				serverId,
			},
			orderBy: [
				{
					source: 'asc',
				},
			],
		}),
		prisma.archiveImportRun.findFirst({
			where: {
				minecraftServerId: server.id,
			},
			orderBy: {
				createdAt: 'desc',
			},
		}),
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
			serverPlayerCount: identityCount,
			openSessionCount,
			totalSessionCount,
			latestPlayerSnapshot: latestObservedPlayers,
			latestStatus,
			playerHistory,
		},
		playerInfoPreview,
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
		syncTaskStates: syncTaskStates.map((state) => ({
			taskKey: state.taskKey,
			source: state.source,
			reason: state.reason,
			running: state.running,
			intervalSeconds: state.intervalSeconds,
			lastStartedAt: state.lastStartedAt,
			lastFinishedAt: state.lastFinishedAt,
			lastSuccessAt: state.lastSuccessAt,
			lastError: state.lastError,
			rowsRead: state.rowsRead,
			rowsMatched: state.rowsMatched,
			rowsChanged: state.rowsChanged,
			rowsSkipped: state.rowsSkipped,
		})),
		archiveImport: {
			latestRun: latestArchiveImportRun
				? {
						id: latestArchiveImportRun.id,
						status: latestArchiveImportRun.status,
						artifactPath: latestArchiveImportRun.artifactPath,
						artifactHash: latestArchiveImportRun.artifactHash,
						artifactServerId: latestArchiveImportRun.artifactServerId,
						artifactServerName: latestArchiveImportRun.artifactServerName,
						artifactVersion: latestArchiveImportRun.artifactVersion,
						scannedAt: latestArchiveImportRun.scannedAt,
						importedAt: latestArchiveImportRun.importedAt,
						playersObserved: latestArchiveImportRun.playersObserved,
						playersUpdated: latestArchiveImportRun.playersUpdated,
						accountsMatched: latestArchiveImportRun.accountsMatched,
						historicalAccountsCreated:
							latestArchiveImportRun.historicalAccountsCreated,
						errorMessage: latestArchiveImportRun.errorMessage,
						createdAt: latestArchiveImportRun.createdAt,
						updatedAt: latestArchiveImportRun.updatedAt,
					}
				: null,
		},
	}
}
