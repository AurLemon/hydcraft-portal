import { prisma } from '../db/prisma'
import { createApiError } from '../errors'
import { PortalBridgeConnection } from './client-connection'
import type {
	BridgeRuntimeConfig,
	PortalBridgeRuntimeSnapshot,
} from './client-types'
import type { PortalBridgeCommandAction } from './protocol'

const STOPPED_RUNTIME_STATUS: PortalBridgeRuntimeSnapshot = {
	running: false,
	connected: false,
	readyState: 'STOPPED',
	streamEpoch: null,
	resumeSeqCursor: 0,
	reconnectAttempts: 0,
	maxReconnectAttempts: null,
	nextRetryAt: null,
	manualRequired: false,
	lastRuntimeStateChangedAt: null,
	lastHeartbeatAt: null,
	lastHeartbeatLatencyMs: null,
	lastHeartbeatPayload: null,
}

export class PortalBridgeManager {
	private readonly connections = new Map<string, PortalBridgeConnection>()

	async startEnabled(): Promise<void> {
		const configs = await prisma.portalBridgeConfig.findMany({
			where: {
				enabled: true,
				minecraftServer: {
					enabled: true,
				},
			},
			include: {
				minecraftServer: {
					select: {
						serverId: true,
					},
				},
			},
		})

		for (const config of configs) {
			this.start(config)
		}
	}

	async refresh(configId: string): Promise<void> {
		const config = await prisma.portalBridgeConfig.findUnique({
			where: {
				id: configId,
			},
			include: {
				minecraftServer: {
					select: {
						serverId: true,
						enabled: true,
					},
				},
			},
		})

		if (!config || !config.enabled || !config.minecraftServer.enabled) {
			this.stop(configId)
			return
		}

		this.start({
			...config,
			minecraftServer: {
				serverId: config.minecraftServer.serverId,
			},
		})
	}

	async connect(configId: string): Promise<void> {
		await this.refresh(configId)
	}

	disconnect(configId: string): void {
		this.stop(configId)
	}

	async reconnect(configId: string): Promise<void> {
		this.stop(configId)
		await this.refresh(configId)
	}

	getStatus(configId: string): PortalBridgeRuntimeSnapshot {
		return this.connections.get(configId)?.snapshot() ?? STOPPED_RUNTIME_STATUS
	}

	start(config: BridgeRuntimeConfig): void {
		this.connections.get(config.id)?.stop()
		const connection = new PortalBridgeConnection(config)
		this.connections.set(config.id, connection)
		connection.start()
	}

	stop(configId: string): void {
		this.connections.get(configId)?.stop()
		this.connections.delete(configId)
	}

	async sendCommand(
		configId: string,
		action: PortalBridgeCommandAction,
		args?: Record<string, unknown>,
	): Promise<string> {
		const connection = this.connections.get(configId)

		if (!connection) {
			throw createApiError({
				statusCode: 409,
				code: 'PORTAL_BRIDGE_NOT_RUNNING',
			})
		}

		return await connection.sendCommand(action, args)
	}

	async syncCoreNow(configId: string): Promise<void> {
		const connection = this.connections.get(configId)

		if (!connection) {
			throw createApiError({
				statusCode: 409,
				code: 'PORTAL_BRIDGE_NOT_RUNNING',
			})
		}

		await connection.sendCoreSyncNow()
	}
}
