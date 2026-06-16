import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import type {
	ExternalSyncReason,
	ExternalSyncSource,
	PortalBridgeConfig,
	Prisma,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { createApiError } from '../errors'
import { heavySyncDispatcher } from '../external-sync/heavy-sync-dispatcher'
import {
	logExternalSyncFailed,
	logExternalSyncStarted,
} from '../external-sync/logger'
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
import { RetryController } from './retry-controller'

const RECONNECT_INTERVAL_MS = 60_000
const MAX_RECONNECT_ATTEMPTS = 30
const PORTAL_BRIDGE_PLAYER_SYNC_INTERVAL_SECONDS = 60

const PORTAL_BRIDGE_PLAYER_SYNC_ACTION: {
	action: PortalBridgeCommandAction
	source: ExternalSyncSource
} = {
	action: 'sync.players.now',
	source: 'PORTAL_BRIDGE_PLAYERS',
}

const PORTAL_BRIDGE_CORE_SYNC_ACTIONS: Array<{
	action: PortalBridgeCommandAction
	source: ExternalSyncSource
}> = [
	{ action: 'sync.playerdata.now', source: 'PORTAL_BRIDGE_PLAYERDATA' },
	{ action: 'sync.stats.now', source: 'PORTAL_BRIDGE_STATS' },
	{ action: 'sync.advancements.now', source: 'PORTAL_BRIDGE_ADVANCEMENTS' },
]

const normalizeCoreSyncIntervalMinutes = (value: number): number =>
	Math.max(1, Math.floor(value || 30))

const getPortalBridgeTaskKey = (
	serverId: string,
	source: ExternalSyncSource,
): string => `${serverId}:${source.toLowerCase()}`

const getPortalBridgeCoreRoundJobKey = (serverId: string): string =>
	`${serverId}:portal-bridge-core-round`

const describeBridgeContext = (input: {
	serverId: string
	bridgeId: string
	module: string
}): string =>
	`Bridge connection [server=${input.serverId}] [bridge=${input.bridgeId}] [module=${input.module}]`

const logBridgeInfo = (
	message: string,
	level: 'info' | 'success' | 'error' = 'info',
	error?: unknown,
): void => {
	if (level === 'success') {
		console.log(`✔ [bridge] ${message}`)
		return
	}

	if (level === 'error') {
		console.error(`✖ [bridge] ${message}`)
		if (error !== undefined) {
			console.error(error)
		}
		return
	}

	console.info(`[bridge] ${message}`)
}

const markPortalBridgeSyncStarted = async (input: {
	serverId: string
	source: ExternalSyncSource
	intervalSeconds: number
	reason?: ExternalSyncReason
}): Promise<void> => {
	const startedAt = new Date()

	await prisma.externalSyncTaskState.upsert({
		where: {
			taskKey: getPortalBridgeTaskKey(input.serverId, input.source),
		},
		create: {
			taskKey: getPortalBridgeTaskKey(input.serverId, input.source),
			serverId: input.serverId,
			source: input.source,
			reason: input.reason ?? 'SCHEDULED',
			running: true,
			intervalSeconds: input.intervalSeconds,
			lastStartedAt: startedAt,
			lastError: null,
			rowsRead: 0,
			rowsMatched: 0,
			rowsChanged: 0,
			rowsSkipped: 0,
		},
		update: {
			reason: input.reason ?? 'SCHEDULED',
			running: true,
			intervalSeconds: input.intervalSeconds,
			lastStartedAt: startedAt,
			lastError: null,
			rowsRead: 0,
			rowsMatched: 0,
			rowsChanged: 0,
			rowsSkipped: 0,
		},
	})
}

const markPortalBridgeSyncFinished = async (input: {
	serverId: string
	source: ExternalSyncSource
	intervalSeconds: number
	reason?: ExternalSyncReason
	error?: string | null
}): Promise<void> => {
	const finishedAt = new Date()

	await prisma.externalSyncTaskState.upsert({
		where: {
			taskKey: getPortalBridgeTaskKey(input.serverId, input.source),
		},
		create: {
			taskKey: getPortalBridgeTaskKey(input.serverId, input.source),
			serverId: input.serverId,
			source: input.source,
			reason: input.reason ?? 'SCHEDULED',
			running: false,
			intervalSeconds: input.intervalSeconds,
			lastStartedAt: finishedAt,
			lastFinishedAt: finishedAt,
			lastSuccessAt: input.error ? undefined : finishedAt,
			lastError: input.error ?? null,
		},
		update: {
			reason: input.reason ?? 'SCHEDULED',
			running: false,
			intervalSeconds: input.intervalSeconds,
			lastFinishedAt: finishedAt,
			lastSuccessAt: input.error ? undefined : finishedAt,
			lastError: input.error ?? null,
		},
	})
}

interface BridgeRuntimeConfig extends PortalBridgeConfig {
	minecraftServer: {
		serverId: string
	}
}

export interface PortalBridgeRuntimeStatus {
	running: boolean
	connected: boolean
	readyState: string
	reconnectAttempts: number
	maxReconnectAttempts: number
	nextRetryAt: Date | null
	manualRequired: boolean
	lastRuntimeStateChangedAt: Date | null
	lastHeartbeatAt: Date | null
	lastHeartbeatLatencyMs: number | null
	lastHeartbeatPayload: unknown
}

class PortalBridgeConnection {
	private socket: WebSocket | null = null
	private coreSyncTimer: NodeJS.Timeout | null = null
	private playerSyncTimer: NodeJS.Timeout | null = null
	private retryController = new RetryController({
		intervalMs: RECONNECT_INTERVAL_MS,
		maxAttempts: MAX_RECONNECT_ATTEMPTS,
	})
	private lastRuntimeStateChangedAt: Date | null = null
	private lastHeartbeatAt: Date | null = null
	private lastHeartbeatLatencyMs: number | null = null
	private lastHeartbeatPayload: unknown = null
	private stopped = false
	private closeReason: 'manual' | 'unexpected' = 'unexpected'

	constructor(private readonly config: BridgeRuntimeConfig) {}

	start(): void {
		this.stopped = false
		this.retryController.reset()
		this.connect()
	}

	stop(): void {
		this.stopped = true
		this.closeReason = 'manual'

		this.stopCoreSync()
		this.retryController.clear()
		this.socket?.close()
		this.socket = null
	}

	snapshot(): PortalBridgeRuntimeStatus {
		const retry = this.retryController.snapshot()

		return {
			running: !this.stopped,
			connected: this.socket?.readyState === WebSocket.OPEN,
			readyState: this.readyStateText(),
			reconnectAttempts: retry.attempts,
			maxReconnectAttempts: retry.maxAttempts,
			nextRetryAt: retry.nextRetryAt,
			manualRequired: retry.manualRequired,
			lastRuntimeStateChangedAt: this.lastRuntimeStateChangedAt,
			lastHeartbeatAt: this.lastHeartbeatAt,
			lastHeartbeatLatencyMs: this.lastHeartbeatLatencyMs,
			lastHeartbeatPayload: this.lastHeartbeatPayload,
		}
	}

	async sendCommand(
		action: PortalBridgeCommandAction,
		args?: Record<string, unknown>,
	): Promise<string> {
		if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
			throw createApiError({
				statusCode: 409,
				code: 'PORTAL_BRIDGE_NOT_CONNECTED',
			})
		}

		const commandId = randomUUID()
		const sentAt = new Date()
		const envelope = createCommandEnvelope({
			serverId: this.config.minecraftServer.serverId,
			bridgeId: this.config.bridgeId,
			module: this.config.module,
			action,
			commandId,
			args,
		})

		await prisma.portalBridgeCommand.create({
			data: {
				bridgeConfigId: this.config.id,
				commandId,
				action,
				status: 'PENDING',
				payload: args as Prisma.InputJsonValue | undefined,
			},
		})

		try {
			this.socket.send(JSON.stringify(envelope))
			await prisma.portalBridgeCommand.update({
				where: {
					commandId,
				},
				data: {
					status: 'SENT',
					sentAt,
				},
			})
		} catch (error) {
			await prisma.portalBridgeCommand.update({
				where: {
					commandId,
				},
				data: {
					status: 'FAILED',
					sentAt,
					completedAt: new Date(),
					errorMessage:
						error instanceof Error
							? error.message
							: 'PortalBridge command send failed',
				},
			})
			throw error
		}

		return commandId
	}

	private connect(): void {
		if (this.stopped) {
			return
		}

		this.closeReason = 'unexpected'

		this.lastRuntimeStateChangedAt = new Date()

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
			this.stopCoreSync()
			this.lastRuntimeStateChangedAt = new Date()
			void prisma.portalBridgeConfig.update({
				where: { id: this.config.id },
				data: {
					lastConnectionState: 'DISCONNECTED',
					lastDisconnectedAt: new Date(),
				},
			})

			logBridgeInfo(
				`${describeBridgeContext({
					serverId: this.config.minecraftServer.serverId,
					bridgeId: this.config.bridgeId,
					module: this.config.module,
				})} ${this.closeReason === 'manual' ? 'disconnected' : 'closed unexpectedly'}`,
				this.closeReason === 'manual' ? 'info' : 'error',
			)
			this.scheduleReconnect()
		})

		this.socket.addEventListener('error', () => {
			logBridgeInfo(
				`${describeBridgeContext({
					serverId: this.config.minecraftServer.serverId,
					bridgeId: this.config.bridgeId,
					module: this.config.module,
				})} websocket error`,
				'error',
			)
			void this.markError('PortalBridge websocket error')
			this.socket?.close()
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

		if (envelope.topic === 'bridge.heartbeat') {
			this.lastHeartbeatAt = new Date()
			this.lastHeartbeatPayload = envelope.payload
			this.lastHeartbeatLatencyMs = envelope.sentAt
				? Math.max(
						0,
						this.lastHeartbeatAt.getTime() -
							new Date(envelope.sentAt).getTime(),
					)
				: null
		}

		if (envelope.topic === 'bridge.accepted') {
			this.retryController.reset()
			this.lastRuntimeStateChangedAt = new Date()
			await prisma.portalBridgeConfig.update({
				where: { id: this.config.id },
				data: {
					lastConnectionState: 'CONNECTED',
					lastConnectedAt: new Date(),
					lastError: null,
				},
			})
			logBridgeInfo(
				`${describeBridgeContext({
					serverId: this.config.minecraftServer.serverId,
					bridgeId: this.config.bridgeId,
					module: this.config.module,
				})} connected`,
				'success',
			)
			this.startCoreSync()
			return
		}

		if (envelope.topic === 'bridge.rejected') {
			this.stopCoreSync()
			this.lastRuntimeStateChangedAt = new Date()
			await prisma.portalBridgeConfig.update({
				where: { id: this.config.id },
				data: {
					lastConnectionState: 'REJECTED',
					lastError: JSON.stringify(envelope.payload),
				},
			})
			logBridgeInfo(
				`${describeBridgeContext({
					serverId: this.config.minecraftServer.serverId,
					bridgeId: this.config.bridgeId,
					module: this.config.module,
				})} rejected ${JSON.stringify(envelope.payload)}`,
				'error',
			)
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
				serverId: this.config.minecraftServer.serverId,
				bridgeId: 'hydcraft-portal',
				module: 'portal-backend',
			},
			{
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
		if (this.stopped) {
			return
		}

		this.retryController.schedule(() => {
			this.connect()
		})
	}

	private readyStateText(): string {
		if (!this.socket) return this.stopped ? 'STOPPED' : 'IDLE'
		if (this.socket.readyState === WebSocket.CONNECTING) return 'CONNECTING'
		if (this.socket.readyState === WebSocket.OPEN) return 'OPEN'
		if (this.socket.readyState === WebSocket.CLOSING) return 'CLOSING'
		return 'CLOSED'
	}

	private startCoreSync(): void {
		if (this.coreSyncTimer) {
			return
		}

		const intervalSeconds =
			normalizeCoreSyncIntervalMinutes(this.config.coreSyncIntervalMinutes) * 60

		this.startPlayerSync()
		void this.scheduleCoreSyncRound(intervalSeconds)
		this.coreSyncTimer = setInterval(() => {
			void this.scheduleCoreSyncRound(intervalSeconds)
		}, intervalSeconds * 1000)
	}

	private stopCoreSync(): void {
		if (this.playerSyncTimer) {
			clearInterval(this.playerSyncTimer)
			this.playerSyncTimer = null
		}

		if (this.coreSyncTimer) {
			clearInterval(this.coreSyncTimer)
			this.coreSyncTimer = null
		}
	}

	private startPlayerSync(): void {
		if (this.playerSyncTimer) {
			return
		}

		void this.sendCoreSyncCommand(
			PORTAL_BRIDGE_PLAYER_SYNC_ACTION,
			PORTAL_BRIDGE_PLAYER_SYNC_INTERVAL_SECONDS,
		)
		this.playerSyncTimer = setInterval(() => {
			void this.sendCoreSyncCommand(
				PORTAL_BRIDGE_PLAYER_SYNC_ACTION,
				PORTAL_BRIDGE_PLAYER_SYNC_INTERVAL_SECONDS,
			)
		}, PORTAL_BRIDGE_PLAYER_SYNC_INTERVAL_SECONDS * 1000)
	}

	private async scheduleCoreSyncRound(intervalSeconds: number): Promise<void> {
		await heavySyncDispatcher.enqueue(
			this.config.minecraftServer.serverId,
			getPortalBridgeCoreRoundJobKey(this.config.minecraftServer.serverId),
			() => this.runCoreSyncRound(intervalSeconds),
		)
	}

	private async runCoreSyncRound(intervalSeconds: number): Promise<void> {
		for (const item of PORTAL_BRIDGE_CORE_SYNC_ACTIONS) {
			await this.sendCoreSyncCommand(item, intervalSeconds)
		}
	}

	private async sendCoreSyncCommand(
		item: (typeof PORTAL_BRIDGE_CORE_SYNC_ACTIONS)[number],
		intervalSeconds: number,
		reason: ExternalSyncReason = 'SCHEDULED',
	): Promise<void> {
		const startedAt = new Date()
		const latencyMs = this.lastHeartbeatLatencyMs

		if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
			const finishedAt = new Date()
			const error = 'PortalBridge websocket is not connected'

			await markPortalBridgeSyncFinished({
				serverId: this.config.minecraftServer.serverId,
				source: item.source,
				intervalSeconds,
				reason,
				error,
			})
			logExternalSyncFailed({
				serverId: this.config.minecraftServer.serverId,
				source: item.source,
				reason,
				startedAt,
				finishedAt,
				latencyMs,
				error,
			})
			return
		}

		try {
			await markPortalBridgeSyncStarted({
				serverId: this.config.minecraftServer.serverId,
				source: item.source,
				intervalSeconds,
				reason,
			})
			logExternalSyncStarted({
				serverId: this.config.minecraftServer.serverId,
				source: item.source,
				reason,
			})
			await this.sendCommand(item.action)
		} catch (error) {
			const finishedAt = new Date()
			await markPortalBridgeSyncFinished({
				serverId: this.config.minecraftServer.serverId,
				source: item.source,
				intervalSeconds,
				reason,
				error:
					error instanceof Error ? error.message : 'PortalBridge sync failed',
			})
			logExternalSyncFailed({
				serverId: this.config.minecraftServer.serverId,
				source: item.source,
				reason,
				startedAt,
				finishedAt,
				latencyMs,
				error,
			})
		}
	}

	async sendCoreSyncNow(): Promise<void> {
		const intervalSeconds =
			normalizeCoreSyncIntervalMinutes(this.config.coreSyncIntervalMinutes) * 60

		await this.sendCoreSyncCommand(
			PORTAL_BRIDGE_PLAYER_SYNC_ACTION,
			PORTAL_BRIDGE_PLAYER_SYNC_INTERVAL_SECONDS,
			'MANUAL',
		)
		await heavySyncDispatcher.enqueue(
			this.config.minecraftServer.serverId,
			getPortalBridgeCoreRoundJobKey(this.config.minecraftServer.serverId),
			async () => {
				for (const item of PORTAL_BRIDGE_CORE_SYNC_ACTIONS) {
					await this.sendCoreSyncCommand(item, intervalSeconds, 'MANUAL')
				}

				return undefined
			},
		)
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

	getStatus(configId: string): PortalBridgeRuntimeStatus {
		return (
			this.connections.get(configId)?.snapshot() ?? {
				running: false,
				connected: false,
				readyState: 'STOPPED',
				reconnectAttempts: 0,
				maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
				nextRetryAt: null,
				manualRequired: false,
				lastRuntimeStateChangedAt: null,
				lastHeartbeatAt: null,
				lastHeartbeatLatencyMs: null,
				lastHeartbeatPayload: null,
			}
		)
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

export const portalBridgeManager = new PortalBridgeManager()
