import { prisma } from '../../../../../utils/db/prisma'
import { requireAdminUser } from '../../../../../utils/auth/session'
import { createApiError } from '../../../../../utils/errors'
import { portalBridgeManager } from '../../../../../utils/portal-bridge/client'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const serverId = getRouterParam(event, 'serverId') ?? ''
	const bridgeConfig = await prisma.portalBridgeConfig.findFirst({
		where: {
			minecraftServer: {
				serverId,
				status: 'ONLINE',
			},
		},
	})

	if (!bridgeConfig) {
		throw createApiError({
			statusCode: 404,
			code: 'PORTAL_BRIDGE_CONFIG_NOT_FOUND',
		})
	}

	const latestHeartbeats = await prisma.portalBridgeMessageReceipt.findMany({
		where: {
			bridgeConfigId: bridgeConfig.id,
			topic: 'bridge.heartbeat',
		},
		orderBy: {
			receivedAt: 'desc',
		},
		take: 10,
	})

	return {
		config: {
			id: bridgeConfig.id,
			bridgeId: bridgeConfig.bridgeId,
			module: bridgeConfig.module,
			wsUrl: bridgeConfig.wsUrl,
			enabled: true,
			lastConnectionState: bridgeConfig.lastConnectionState,
			lastConnectedAt: bridgeConfig.lastConnectedAt,
			lastDisconnectedAt: bridgeConfig.lastDisconnectedAt,
			lastError: bridgeConfig.lastError,
			coreSyncIntervalMinutes: bridgeConfig.coreSyncIntervalMinutes,
			streamEpoch: bridgeConfig.streamEpoch,
			resumeFromSeq: bridgeConfig.resumeFromSeq.toString(),
		},
		runtime: portalBridgeManager.getStatus(bridgeConfig.id),
		heartbeats: latestHeartbeats.map((receipt) => ({
			id: receipt.id,
			streamEpoch: receipt.streamEpoch,
			seq: receipt.seq?.toString() ?? null,
			receivedAt: receipt.receivedAt,
			ackedAt: receipt.ackedAt,
			payload: receipt.payload,
		})),
	}
})
