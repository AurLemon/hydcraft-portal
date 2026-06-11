import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import type { PortalBridgeConfig, Prisma } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { createApiError } from '../errors'
import { decryptConfigValue } from '../security/encryption'
import { ingestPortalBridgeEnvelope } from './ingestion'
import {
	DEFAULT_REQUESTED_TOPICS,
	createAckEnvelope,
	createBridgeHelloEnvelope,
	createCommandEnvelope,
	type PortalBridgeCommandAction,
	type PortalBridgeEnvelope,
} from './protocol'

interface BridgeRuntimeConfig extends PortalBridgeConfig {
	minecraftServer: {
		serverId: string
	}
}

class PortalBridgeConnection {
	private socket: WebSocket | null = null
	private reconnectTimer: NodeJS.Timeout | null = null
	private stopped = false

	constructor(private readonly config: BridgeRuntimeConfig) {}

	start(): void {
		this.stopped = false
		this.connect()
	}

	stop(): void {
		this.stopped = true

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
			this.reconnectTimer = null
		}

		this.socket?.close()
		this.socket = null
	}

	sendCommand(
		action: PortalBridgeCommandAction,
		args?: Record<string, unknown>,
	): string {
		if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
			throw createApiError({
				statusCode: 409,
				code: 'PORTAL_BRIDGE_NOT_CONNECTED',
			})
		}

		const commandId = randomUUID()
		const envelope = createCommandEnvelope({
			serverId: this.config.minecraftServer.serverId,
			bridgeId: this.config.bridgeId,
			module: this.config.module,
			action,
			commandId,
			args,
		})

		this.socket.send(JSON.stringify(envelope))
		void prisma.portalBridgeCommand.create({
			data: {
				bridgeConfigId: this.config.id,
				commandId,
				action,
				status: 'SENT',
				payload: args as Prisma.InputJsonValue | undefined,
				sentAt: new Date(),
			},
		})

		return commandId
	}

	private connect(): void {
		if (this.stopped) {
			return
		}

		void prisma.portalBridgeConfig.update({
			where: { id: this.config.id },
			data: {
				lastConnectionState: 'CONNECTING',
				lastError: null,
			},
		})

		this.socket = new WebSocket(this.config.wsUrl)

		this.socket.addEventListener('open', () => {
			const secret = decryptConfigValue(this.config.encryptedSecret)

			if (!secret) {
				this.socket?.close()
				void this.markError('PortalBridge secret is required')
				return
			}

			const envelope = createBridgeHelloEnvelope({
				serverId: this.config.minecraftServer.serverId,
				bridgeId: this.config.bridgeId,
				module: this.config.module,
				secret,
				requestedTopics:
					this.config.requestedTopics.length > 0
						? this.config.requestedTopics
						: DEFAULT_REQUESTED_TOPICS,
				resumeFromSeq: Number(this.config.resumeFromSeq),
			})

			this.socket?.send(JSON.stringify(envelope))
		})

		this.socket.addEventListener('message', (event) => {
			void this.handleMessage(event.data)
		})

		this.socket.addEventListener('close', () => {
			void prisma.portalBridgeConfig.update({
				where: { id: this.config.id },
				data: {
					lastConnectionState: 'DISCONNECTED',
					lastDisconnectedAt: new Date(),
				},
			})
			this.scheduleReconnect()
		})

		this.socket.addEventListener('error', () => {
			void this.markError('PortalBridge websocket error')
		})
	}

	private async handleMessage(rawData: unknown): Promise<void> {
		const text =
			typeof rawData === 'string'
				? rawData
				: rawData instanceof Buffer
					? rawData.toString('utf8')
					: String(rawData)
		const envelope = JSON.parse(text) as PortalBridgeEnvelope

		if (envelope.requiresAck) {
			this.ack(envelope)
		}

		if (envelope.topic === 'bridge.accepted') {
			await prisma.portalBridgeConfig.update({
				where: { id: this.config.id },
				data: {
					lastConnectionState: 'CONNECTED',
					lastConnectedAt: new Date(),
					lastError: null,
				},
			})
			return
		}

		if (envelope.topic === 'bridge.rejected') {
			await prisma.portalBridgeConfig.update({
				where: { id: this.config.id },
				data: {
					lastConnectionState: 'REJECTED',
					lastError: JSON.stringify(envelope.payload),
				},
			})
			this.socket?.close()
			return
		}

		const result = await ingestPortalBridgeEnvelope({
			bridgeConfigId: this.config.id,
			serverId: this.config.minecraftServer.serverId,
			envelope,
		})

		if (!result.duplicate && envelope.seq != null) {
			await prisma.portalBridgeConfig.update({
				where: { id: this.config.id },
				data: {
					resumeFromSeq: BigInt(envelope.seq),
				},
			})
		}
	}

	private ack(envelope: PortalBridgeEnvelope): void {
		const ack = createAckEnvelope(
			{
				service: 'portal',
				module: 'portal-backend',
			},
			{
				serverId: this.config.minecraftServer.serverId,
				bridgeId: this.config.bridgeId,
				module: this.config.module,
			},
			{
				messageId: envelope.id,
				seq: envelope.seq,
				topic: envelope.topic,
				acknowledgedAt: new Date().toISOString(),
			},
		)

		this.socket?.send(JSON.stringify(ack))
		void prisma.portalBridgeMessageReceipt.updateMany({
			where: {
				messageId: envelope.id,
			},
			data: {
				ackedAt: new Date(),
			},
		})
	}

	private async markError(message: string): Promise<void> {
		await prisma.portalBridgeConfig.update({
			where: { id: this.config.id },
			data: {
				lastConnectionState: 'ERROR',
				lastError: message,
			},
		})
	}

	private scheduleReconnect(): void {
		if (this.stopped || this.reconnectTimer) {
			return
		}

		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null
			this.connect()
		}, 5000)
	}
}

class PortalBridgeManager {
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

	sendCommand(
		configId: string,
		action: PortalBridgeCommandAction,
		args?: Record<string, unknown>,
	): string {
		const connection = this.connections.get(configId)

		if (!connection) {
			throw createApiError({
				statusCode: 409,
				code: 'PORTAL_BRIDGE_NOT_RUNNING',
			})
		}

		return connection.sendCommand(action, args)
	}
}

export const portalBridgeManager = new PortalBridgeManager()
