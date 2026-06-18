import type { ExternalSyncSource } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import {
	triggerAuthMeSyncForServer,
	triggerLuckPermsSyncForServer,
} from '../external-sync/orchestrator'
import { portalBridgeManager } from '../portal-bridge/client'

export interface ResetServerPlayerSyncInput {
	serverId: string
	sources: {
		portalBridge: boolean
		authme: boolean
		luckperms: boolean
	}
}

export interface ResetServerPlayerSyncResult {
	reset: boolean
	tasks: Array<{
		taskKey: string
		source: ExternalSyncSource
		reason: string | null
		running: boolean
		intervalSeconds: number
		lastStartedAt: Date | null
		lastFinishedAt: Date | null
		lastSuccessAt: Date | null
		lastError: string | null
		rowsRead: number
		rowsMatched: number
		rowsChanged: number
		rowsSkipped: number
	}>
}

const syncSourceList: ExternalSyncSource[] = [
	'PORTAL_BRIDGE_PLAYERS',
	'PORTAL_BRIDGE_PLAYERDATA',
	'PORTAL_BRIDGE_STATS',
	'PORTAL_BRIDGE_ADVANCEMENTS',
]

const readTasks = async (serverId: string) => {
	const states = await prisma.externalSyncTaskState.findMany({
		where: {
			serverId,
			source: {
				in: syncSourceList,
			},
		},
		orderBy: [{ source: 'asc' }],
	})

	return states.map((state) => ({
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
	}))
}

const clearServerPlayerSyncState = async (serverId: string) => {
	const bridgeConfig = await prisma.portalBridgeConfig.findFirst({
		where: {
			minecraftServer: {
				serverId,
				enabled: true,
			},
			enabled: true,
		},
		select: {
			id: true,
		},
	})

	await prisma.$transaction(async (tx) => {
		await tx.serverPlayerIdentityEvidence.deleteMany({
			where: {
				serverId,
			},
		})
		await tx.serverPlayerIdentity.deleteMany({
			where: {
				serverId,
			},
		})
		await tx.serverPlayerSession.deleteMany({
			where: {
				serverId,
			},
		})
		await tx.minecraftServerSnapshot.deleteMany({
			where: {
				serverId,
			},
		})
		await tx.minecraftServerPlayerData.deleteMany({
			where: {
				player: {
					serverId,
				},
			},
		})
		await tx.minecraftServerPlayerStatsSnapshot.deleteMany({
			where: {
				player: {
					serverId,
				},
			},
		})
		await tx.minecraftServerPlayerAdvancementsSnapshot.deleteMany({
			where: {
				player: {
					serverId,
				},
			},
		})
		if (bridgeConfig) {
			await tx.portalBridgeConfig.update({
				where: {
					id: bridgeConfig.id,
				},
				data: {
					streamEpoch: null,
					resumeFromSeq: BigInt(0),
				},
			})
			await tx.portalBridgeMessageReceipt.deleteMany({
				where: {
					bridgeConfigId: bridgeConfig.id,
				},
			})
			await tx.portalBridgeCommand.deleteMany({
				where: {
					bridgeConfigId: bridgeConfig.id,
				},
			})
		}

		await tx.externalSyncTaskState.updateMany({
			where: {
				serverId,
				source: {
					in: syncSourceList,
				},
			},
			data: {
				running: false,
				lastStartedAt: null,
				lastFinishedAt: null,
				lastSuccessAt: null,
				lastError: null,
				rowsRead: 0,
				rowsMatched: 0,
				rowsChanged: 0,
				rowsSkipped: 0,
			},
		})
	})
}

export const resetAndResyncServerPlayers = async (
	input: ResetServerPlayerSyncInput,
): Promise<ResetServerPlayerSyncResult> => {
	await clearServerPlayerSyncState(input.serverId)

	if (input.sources.portalBridge) {
		const bridgeConfig = await prisma.portalBridgeConfig.findFirst({
			where: {
				minecraftServer: {
					serverId: input.serverId,
					enabled: true,
				},
				enabled: true,
			},
			select: {
				id: true,
			},
		})

		if (bridgeConfig) {
			await portalBridgeManager.syncCoreNow(bridgeConfig.id)
		}
	}

	if (input.sources.authme) {
		await triggerAuthMeSyncForServer({
			serverId: input.serverId,
			reason: 'MANUAL',
		})
	}

	if (input.sources.luckperms) {
		await triggerLuckPermsSyncForServer({
			serverId: input.serverId,
			reason: 'MANUAL',
		})
	}

	return {
		reset: true,
		tasks: await readTasks(input.serverId),
	}
}
