import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import type { Prisma } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { createApiError } from '../errors'
import { decryptConfigValue } from '../security/encryption'
import { PortalBridgeCoreSyncCoordinator } from './client-core-sync'
import {
	DEFAULT_HEARTBEAT_INTERVAL_SECONDS,
	LIVENESS_CHECK_MIN_INTERVAL_MS,
	LIVENESS_WATCHDOG_MULTIPLIER,
	PORTAL_BRIDGE_COMMAND_RESULT_TIMEOUT_MS,
	RECONNECT_INITIAL_DELAY_MS,
	RECONNECT_JITTER_RATIO,
	RECONNECT_MAX_ATTEMPTS,
	RECONNECT_MAX_DELAY_MS,
	RESUME_SEQ_FLUSH_INTERVAL_MS,
	SNAPSHOT_COMPLETION_TOPICS,
} from './client-constants'
import {
	describeBridgeContext,
	describeCloseEvent,
	logBridgeInfo,
	readEnvelopePlayers,
	readPlayerBoolean,
	readPlayerNumber,
	readPlayerString,
} from './client-helpers'
import {
	clearPortalBridgeConnectionGap,
	getPortalBridgeConnectionGap,
	markPortalBridgeConnectionGap,
} from './connection-gap'
import type {
	BridgeRuntimeConfig,
	CommandResult,
	PendingCommandWaiter,
	PortalBridgeCommandWaitMode,
	PortalBridgeCoreSyncRuntime,
	PortalBridgeRuntimeSnapshot,
	ReportedConnectionError,
} from './client-types'
import { ingestPortalBridgeEnvelope } from './ingestion'
import {
	createAckEnvelope,
	createBridgeHelloEnvelope,
	createCommandEnvelope,
	DEFAULT_REQUESTED_TOPICS,
	type BridgeAcceptedPayload,
	type PortalBridgeCommandAction,
	type PortalBridgeEnvelope,
} from './protocol'
import { RetryController } from './retry-controller'
import { reconcileRecoveredServerPlayerSessions } from './session-recovery'

interface RecoveryOnlineSnapshotPlayer {
	uuid: string
	username: string | null
	worldName: string | null
	dimension: string | null
	x: number | null
	y: number | null
	z: number | null
}

interface RecoveryOnlineSnapshotResult {
	commandId: string
	success: boolean
	status: string
	message?: string | null
	observedAt: Date | null
	players: RecoveryOnlineSnapshotPlayer[]
}

interface PendingRecoveryOnlineSnapshotWaiter {
	resolve: (result: RecoveryOnlineSnapshotResult) => void
	reject: (error: unknown) => void
}

export class PortalBridgeConnection implements PortalBridgeCoreSyncRuntime {
	private socket: WebSocket | null = null
	private retryController = new RetryController({
		initialDelayMs: RECONNECT_INITIAL_DELAY_MS,
		maxDelayMs: RECONNECT_MAX_DELAY_MS,
		jitterRatio: RECONNECT_JITTER_RATIO,
		maxAttempts: RECONNECT_MAX_ATTEMPTS,
	})
	private readonly coreSync = new PortalBridgeCoreSyncCoordinator(this)
	private lastRuntimeStateChangedAt: Date | null = null
	private lastHeartbeatAt: Date | null = null
	private lastHeartbeatLatencyMs: number | null = null
	private lastHeartbeatPayload: unknown = null
	private lastReportedConnectionError: ReportedConnectionError | null = null
	private stopped = false
	private closeReason: 'manual' | 'unexpected' = 'unexpected'
	private closingSocket = false
	private websocketErrorLogged = false
	// liveness 看门狗：portal 侧无主动活性探测，靠"最近收到任意消息的时间"判断连接是否半开。
	// 若超过阈值无任何消息，主动 closeSocket 触发重连，避免 bridge close frame 丢失导致永久卡 OPEN。
	private lastMessageAt: Date | null = null
	private negotiatedHeartbeatSeconds = DEFAULT_HEARTBEAT_INTERVAL_SECONDS
	private livenessTimer: NodeJS.Timeout | null = null
	private streamEpoch: string | null = null
	// seq 游标内存化（P0-2 + P1-2）：不再每条消息落库推进 resumeFromSeq，
	// 而是内存维护 Math.max 游标 + 脏标志，定时 flush。崩溃丢未 flush 游标时，
	// 重连偏旧的 resumeFromSeq 会触发 bridge 重放，靠 messageId/(streamEpoch, seq) 幂等去重。
	private resumeSeqCursor = 0
	private resumeSeqCursorDirty = false
	private resumeSeqFlushTimer: NodeJS.Timeout | null = null
	private messageProcessingChain: Promise<void> = Promise.resolve()
	private readonly pendingCommandWaiters = new Map<
		string,
		PendingCommandWaiter
	>()
	private readonly pendingRecoveryOnlineSnapshotWaiters = new Map<
		string,
		PendingRecoveryOnlineSnapshotWaiter
	>()

	constructor(public readonly config: BridgeRuntimeConfig) {
		this.streamEpoch = config.streamEpoch
		this.resumeSeqCursor = Math.max(0, Number(config.resumeFromSeq) || 0)
	}

	start(): void {
		this.stopped = false
		this.retryController.reset()
		this.connect()
	}

	stop(): void {
		this.stopped = true
		this.closeReason = 'manual'
		this.lastReportedConnectionError = null

		this.stopConnectedRuntime()
		this.retryController.clear()
		this.rejectPendingCommands('PortalBridge connection stopped')
		this.closeSocket()
		this.socket = null
	}

	snapshot(): PortalBridgeRuntimeSnapshot {
		const retry = this.retryController.snapshot()

		return {
			running: !this.stopped,
			connected: this.socket?.readyState === WebSocket.OPEN,
			readyState: this.readyStateText(),
			streamEpoch: this.streamEpoch,
			resumeSeqCursor: this.resumeSeqCursor,
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

	getLastHeartbeatLatencyMs(): number | null {
		return this.lastHeartbeatLatencyMs
	}

	isSocketOpen(): boolean {
		return this.socket?.readyState === WebSocket.OPEN
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

	async sendCommandAndWait(
		action: PortalBridgeCommandAction,
		args: Record<string, unknown> | undefined,
		mode: PortalBridgeCommandWaitMode,
	): Promise<CommandResult> {
		const commandId = await this.sendCommand(action, args)

		return await new Promise<CommandResult>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pendingCommandWaiters.delete(commandId)
				reject(
					createApiError({
						statusCode: 504,
						code: 'PORTAL_BRIDGE_COMMAND_TIMEOUT',
						data: {
							action,
							timeoutMs: PORTAL_BRIDGE_COMMAND_RESULT_TIMEOUT_MS,
						},
					}),
				)
			}, PORTAL_BRIDGE_COMMAND_RESULT_TIMEOUT_MS)

			this.pendingCommandWaiters.set(commandId, {
				mode,
				resolve: (result) => {
					clearTimeout(timer)
					this.pendingCommandWaiters.delete(commandId)
					resolve(result)
				},
				reject: (error) => {
					clearTimeout(timer)
					this.pendingCommandWaiters.delete(commandId)
					reject(error)
				},
			})
		})
	}

	async sendCoreSyncNow(): Promise<void> {
		await this.coreSync.sendCoreSyncNow()
	}

	private rejectPendingCommands(reason: string): void {
		for (const waiter of this.pendingCommandWaiters.values()) {
			waiter.reject(
				createApiError({
					statusCode: 503,
					code: 'PORTAL_BRIDGE_COMMAND_ABORTED',
					data: { reason },
				}),
			)
		}

		this.pendingCommandWaiters.clear()

		if (this.pendingRecoveryOnlineSnapshotWaiters.size === 0) {
			return
		}

		for (const waiter of this.pendingRecoveryOnlineSnapshotWaiters.values()) {
			waiter.reject(
				createApiError({
					statusCode: 503,
					code: 'PORTAL_BRIDGE_COMMAND_ABORTED',
					data: { reason },
				}),
			)
		}

		this.pendingRecoveryOnlineSnapshotWaiters.clear()
	}

	private connect(): void {
		if (this.stopped) {
			return
		}

		this.closeReason = 'unexpected'
		this.lastRuntimeStateChangedAt = new Date()
		this.closingSocket = false
		this.websocketErrorLogged = false

		void prisma.portalBridgeConfig.update({
			where: { id: this.config.id },
			data: {
				lastConnectionState: 'CONNECTING',
				lastError: null,
			},
		})

		const socket = new WebSocket(this.config.wsUrl)
		this.socket = socket

		socket.addEventListener('open', () => {
			if (this.socket !== socket) {
				socket.close()
				return
			}

			const secret = decryptConfigValue(this.config.encryptedSecret)

			if (!secret) {
				this.closeSocket(socket)
				void this.reportConnectionError({
					fingerprint: 'secret-required',
					message: 'secret is required',
					persistedError: 'PortalBridge secret is required',
				})
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
				streamEpoch: this.streamEpoch,
				resumeFromSeq: Math.max(
					Number(this.config.resumeFromSeq) || 0,
					this.resumeSeqCursor,
				),
			})

			this.socket?.send(JSON.stringify(envelope))
		})

		socket.addEventListener('message', (event) => {
			if (this.socket !== socket) {
				return
			}

			this.messageProcessingChain = this.messageProcessingChain
				.then(() => this.handleMessage(event.data))
				.catch((error) => {
					this.closeReason = 'unexpected'
					void this.reportConnectionError({
						fingerprint: `message-processing:${String(error)}`,
						message: 'message processing failed',
						persistedError: 'PortalBridge message processing failed',
						error,
					})
				})
		})

		socket.addEventListener('close', (event) => {
			if (this.socket !== socket) {
				return
			}

			this.closingSocket = false
			this.stopConnectedRuntime()
			this.rejectPendingCommands('PortalBridge connection closed')
			this.lastRuntimeStateChangedAt = new Date()
			if (this.closeReason !== 'manual') {
				this.recordConnectionGap(this.lastRuntimeStateChangedAt)
			}
			void prisma.portalBridgeConfig.update({
				where: { id: this.config.id },
				data: {
					lastConnectionState: 'DISCONNECTED',
					lastDisconnectedAt: new Date(),
				},
			})

			if (this.closeReason === 'manual') {
				logBridgeInfo(
					`${describeBridgeContext({
						serverId: this.config.minecraftServer.serverId,
						bridgeId: this.config.bridgeId,
						module: this.config.module,
					})} disconnected`,
				)
			} else {
				void this.reportConnectionError({
					fingerprint: `close:${describeCloseEvent(event)}`,
					message: `closed unexpectedly (${describeCloseEvent(event)})`,
					persistedError: `PortalBridge connection closed unexpectedly (${describeCloseEvent(event)})`,
				})
			}
			this.scheduleReconnect()
		})

		socket.addEventListener('error', () => {
			if (this.socket !== socket || this.websocketErrorLogged) {
				return
			}

			this.websocketErrorLogged = true
			this.closeReason = 'unexpected'
			void this.reportConnectionError({
				fingerprint: 'websocket-error',
				message: 'websocket error',
				persistedError: 'PortalBridge websocket error',
			})

			if (socket.readyState === WebSocket.OPEN) {
				setTimeout(() => this.closeSocket(socket), 0)
			} else {
				this.socket = null
				this.closingSocket = false
				this.lastRuntimeStateChangedAt = new Date()
				this.recordConnectionGap(this.lastRuntimeStateChangedAt)
				void prisma.portalBridgeConfig.update({
					where: { id: this.config.id },
					data: {
						lastConnectionState: 'DISCONNECTED',
						lastDisconnectedAt: this.lastRuntimeStateChangedAt,
					},
				})
				this.rejectPendingCommands(
					'PortalBridge connection lost before close event',
				)
				this.scheduleReconnect()
			}
		})
	}

	private closeSocket(socket = this.socket): void {
		if (
			!socket ||
			this.closingSocket ||
			socket.readyState === WebSocket.CLOSING ||
			socket.readyState === WebSocket.CLOSED
		) {
			return
		}

		this.closingSocket = true
		socket.close()
	}

	private async handleMessage(rawData: unknown): Promise<void> {
		this.lastMessageAt = new Date()
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
			const acceptedPayload = this.readAcceptedPayload(envelope.payload)
			await this.applyAcceptedStreamState(acceptedPayload)
			this.retryController.reset()
			this.lastRuntimeStateChangedAt = new Date()
			const acceptedHeartbeatRaw = acceptedPayload?.heartbeatIntervalSeconds
			const acceptedHeartbeat =
				typeof acceptedHeartbeatRaw === 'number' &&
				Number.isFinite(acceptedHeartbeatRaw)
					? acceptedHeartbeatRaw
					: null
			this.negotiatedHeartbeatSeconds =
				acceptedHeartbeat && acceptedHeartbeat > 0
					? acceptedHeartbeat
					: DEFAULT_HEARTBEAT_INTERVAL_SECONDS
			this.lastMessageAt = new Date()
			await prisma.portalBridgeConfig.update({
				where: { id: this.config.id },
				data: {
					lastConnectionState: 'CONNECTED',
					lastConnectedAt: new Date(),
					lastError: null,
				},
			})
			this.lastReportedConnectionError = null
			logBridgeInfo(
				`${describeBridgeContext({
					serverId: this.config.minecraftServer.serverId,
					bridgeId: this.config.bridgeId,
					module: this.config.module,
				})} connected`,
				'success',
			)
			this.startConnectedRuntime()
			return
		}

		if (envelope.topic === 'bridge.rejected') {
			this.stopConnectedRuntime()
			this.lastRuntimeStateChangedAt = new Date()
			await prisma.portalBridgeConfig.update({
				where: { id: this.config.id },
				data: {
					lastConnectionState: 'REJECTED',
					lastError: JSON.stringify(envelope.payload),
				},
			})
			void this.reportConnectionError({
				fingerprint: `rejected:${JSON.stringify(envelope.payload)}`,
				message: `rejected ${JSON.stringify(envelope.payload)}`,
				skipPersist: true,
			})
			this.closeSocket()
			return
		}

		this.coreSync.handleEnvelope(envelope)
		this.resolvePendingCommandWaiter(envelope)
		this.resolveRecoveryOnlineSnapshotWaiter(envelope)

		await ingestPortalBridgeEnvelope({
			bridgeConfigId: this.config.id,
			serverId: this.config.minecraftServer.serverId,
			streamEpoch: this.streamEpoch,
			envelope,
		})

		if (envelope.seq != null && Number.isFinite(envelope.seq)) {
			const seqNumber = Number(envelope.seq)

			if (seqNumber > this.resumeSeqCursor) {
				this.resumeSeqCursor = seqNumber
				this.resumeSeqCursorDirty = true
			}
		}
	}

	private resolvePendingCommandWaiter(envelope: PortalBridgeEnvelope): void {
		if (
			envelope.topic !== 'command.result' &&
			envelope.topic !== 'command.rejected' &&
			!SNAPSHOT_COMPLETION_TOPICS.includes(envelope.topic)
		) {
			return
		}

		const commandId = readPlayerString(envelope.payload, 'commandId')

		if (!commandId) {
			return
		}

		const waiter = this.pendingCommandWaiters.get(commandId)

		if (!waiter) {
			return
		}

		if (envelope.topic === 'command.rejected') {
			waiter.resolve({
				commandId,
				success: false,
				status: 'REJECTED',
				message:
					readPlayerString(envelope.payload, 'message') ??
					'PortalBridge command rejected',
			})
			return
		}

		if (waiter.mode === 'commandResult') {
			if (envelope.topic !== 'command.result') {
				return
			}

			const status = readPlayerString(envelope.payload, 'status')
			const success = readPlayerBoolean(envelope.payload, 'success')

			waiter.resolve({
				commandId,
				success: success !== false && status === 'OK',
				status: status ?? 'UNKNOWN',
				message: readPlayerString(envelope.payload, 'message'),
			})
			return
		}

		if (envelope.topic === 'command.result') {
			const status = readPlayerString(envelope.payload, 'status')
			const success = readPlayerBoolean(envelope.payload, 'success')

			if (success === false || status !== 'OK') {
				waiter.resolve({
					commandId,
					success: false,
					status: status ?? 'UNKNOWN',
					message: readPlayerString(envelope.payload, 'message'),
				})
			}

			return
		}

		waiter.resolve({
			commandId,
			success: true,
			status: 'OK',
			message: readPlayerString(envelope.payload, 'message'),
		})
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

	private async reportConnectionError(input: {
		fingerprint: string
		message: string
		persistedError?: string
		skipPersist?: boolean
		error?: unknown
	}): Promise<void> {
		const context = describeBridgeContext({
			serverId: this.config.minecraftServer.serverId,
			bridgeId: this.config.bridgeId,
			module: this.config.module,
		})
		const previous = this.lastReportedConnectionError

		if (previous?.fingerprint === input.fingerprint) {
			return
		}

		if (previous) {
			logBridgeInfo(
				`${context} error reason changed: ${previous.message} -> ${input.message}`,
				'error',
			)
		}

		this.lastReportedConnectionError = {
			fingerprint: input.fingerprint,
			message: input.message,
		}
		logBridgeInfo(`${context} ${input.message}`, 'error', input.error)

		if (!input.skipPersist) {
			await this.markError(input.persistedError ?? input.message)
		}
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

	private startConnectedRuntime(): void {
		this.startLivenessWatchdog()
		this.startResumeSeqFlush()
		void this.runRecoveryFlow()
	}

	private startCoreSyncIfConnected(): void {
		if (!this.stopped && this.socket?.readyState === WebSocket.OPEN) {
			this.coreSync.start()
		}
	}

	private stopConnectedRuntime(): void {
		this.coreSync.stop()
		this.stopLivenessWatchdog()
		this.stopResumeSeqFlush()
	}

	private recordConnectionGap(disconnectedAt: Date): void {
		const startedAt =
			this.lastMessageAt ?? this.lastHeartbeatAt ?? disconnectedAt

		markPortalBridgeConnectionGap({
			bridgeConfigId: this.config.id,
			serverId: this.config.minecraftServer.serverId,
			startedAt,
		})
	}

	private async runRecoveryFlow(): Promise<void> {
		const gap = getPortalBridgeConnectionGap(this.config.id)

		if (!gap) {
			this.startCoreSyncIfConnected()
			return
		}

		try {
			const snapshot = await this.sendRecoveryOnlineSnapshotAndWait()

			if (!snapshot || !snapshot.success || !snapshot.observedAt) {
				return
			}

			const recoveryObservedAt = snapshot.observedAt

			await reconcileRecoveredServerPlayerSessions({
				serverId: gap.serverId,
				gapStartedAt: gap.startedAt,
				currentOnlinePlayers: snapshot.players.map((player) => ({
					...player,
					observedAt: recoveryObservedAt,
				})),
			})
			clearPortalBridgeConnectionGap(this.config.id)
		} catch (error) {
			logBridgeInfo(
				`${describeBridgeContext({
					serverId: this.config.minecraftServer.serverId,
					bridgeId: this.config.bridgeId,
					module: this.config.module,
				})} recovery online snapshot reconciliation failed`,
				'error',
				error,
			)
		} finally {
			this.startCoreSyncIfConnected()
		}
	}

	private async sendRecoveryOnlineSnapshotAndWait(): Promise<RecoveryOnlineSnapshotResult | null> {
		if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
			return null
		}

		const commandId = await this.sendCommand('sync.onlinePlayers.now')

		return await new Promise<RecoveryOnlineSnapshotResult>(
			(resolve, reject) => {
				const timer = setTimeout(() => {
					this.pendingRecoveryOnlineSnapshotWaiters.delete(commandId)
					reject(
						createApiError({
							statusCode: 504,
							code: 'PORTAL_BRIDGE_COMMAND_TIMEOUT',
							data: {
								action: 'sync.onlinePlayers.now',
								timeoutMs: PORTAL_BRIDGE_COMMAND_RESULT_TIMEOUT_MS,
							},
						}),
					)
				}, PORTAL_BRIDGE_COMMAND_RESULT_TIMEOUT_MS)

				this.pendingRecoveryOnlineSnapshotWaiters.set(commandId, {
					resolve: (result) => {
						clearTimeout(timer)
						this.pendingRecoveryOnlineSnapshotWaiters.delete(commandId)
						resolve(result)
					},
					reject: (error) => {
						clearTimeout(timer)
						this.pendingRecoveryOnlineSnapshotWaiters.delete(commandId)
						reject(error)
					},
				})
			},
		)
	}

	private resolveRecoveryOnlineSnapshotWaiter(
		envelope: PortalBridgeEnvelope,
	): void {
		const commandId = readPlayerString(envelope.payload, 'commandId')

		if (!commandId) {
			return
		}

		const waiter = this.pendingRecoveryOnlineSnapshotWaiters.get(commandId)

		if (!waiter) {
			return
		}

		if (envelope.topic === 'command.rejected') {
			waiter.resolve({
				commandId,
				success: false,
				status: 'REJECTED',
				message:
					readPlayerString(envelope.payload, 'message') ??
					'PortalBridge command rejected',
				observedAt: null,
				players: [],
			})
			return
		}

		if (envelope.topic === 'command.result') {
			const status = readPlayerString(envelope.payload, 'status')
			const success = readPlayerBoolean(envelope.payload, 'success')

			if (success === false || status !== 'OK') {
				waiter.resolve({
					commandId,
					success: false,
					status: status ?? 'UNKNOWN',
					message: readPlayerString(envelope.payload, 'message'),
					observedAt: null,
					players: [],
				})
			}

			return
		}

		if (envelope.topic !== 'mc.player.online.snapshot') {
			return
		}

		const players = readEnvelopePlayers(envelope.payload).flatMap((player) => {
			const uuid = readPlayerString(player, 'uuid')

			if (!uuid) {
				return []
			}

			const position =
				player && typeof player === 'object'
					? ((player as Record<string, unknown>)['position'] as
							| Record<string, unknown>
							| null
							| undefined)
					: null

			return [
				{
					uuid,
					username: readPlayerString(player, 'username'),
					worldName: readPlayerString(player, 'worldName'),
					dimension: readPlayerString(player, 'dimension'),
					x: readPlayerNumber(position, 'x'),
					y: readPlayerNumber(position, 'y'),
					z: readPlayerNumber(position, 'z'),
				},
			]
		})

		const observedAtRaw = readPlayerString(envelope.payload, 'observedAt')
		const observedAt =
			observedAtRaw && !Number.isNaN(new Date(observedAtRaw).getTime())
				? new Date(observedAtRaw)
				: new Date(envelope.observedAt)

		waiter.resolve({
			commandId,
			success: true,
			status: 'OK',
			message: readPlayerString(envelope.payload, 'message'),
			observedAt,
			players,
		})
	}

	private startLivenessWatchdog(): void {
		if (this.livenessTimer) {
			return
		}

		const checkIntervalMs = Math.max(
			LIVENESS_CHECK_MIN_INTERVAL_MS,
			this.negotiatedHeartbeatSeconds * 1000,
		)
		const thresholdMs =
			this.negotiatedHeartbeatSeconds * 1000 * LIVENESS_WATCHDOG_MULTIPLIER

		this.livenessTimer = setInterval(() => {
			if (this.stopped || this.closeReason === 'manual') {
				return
			}

			if (
				!this.socket ||
				this.socket.readyState !== WebSocket.OPEN ||
				!this.lastMessageAt
			) {
				return
			}

			const silenceMs = Date.now() - this.lastMessageAt.getTime()

			if (silenceMs > thresholdMs) {
				this.closeReason = 'unexpected'
				void this.reportConnectionError({
					fingerprint: `liveness-watchdog:${Math.round(thresholdMs / 1000)}`,
					message: `liveness watchdog tripped after ${Math.round(silenceMs / 1000)}s of silence (threshold ${Math.round(thresholdMs / 1000)}s), forcing reconnect`,
					persistedError: `PortalBridge liveness watchdog tripped after ${Math.round(silenceMs / 1000)}s of silence`,
				})
				this.closeSocket()
			}
		}, checkIntervalMs)
	}

	private stopLivenessWatchdog(): void {
		if (this.livenessTimer) {
			clearInterval(this.livenessTimer)
			this.livenessTimer = null
		}
	}

	private startResumeSeqFlush(): void {
		if (this.resumeSeqFlushTimer) {
			return
		}

		this.resumeSeqFlushTimer = setInterval(() => {
			void this.flushResumeSeqCursor()
		}, RESUME_SEQ_FLUSH_INTERVAL_MS)
	}

	private stopResumeSeqFlush(): void {
		if (this.resumeSeqFlushTimer) {
			clearInterval(this.resumeSeqFlushTimer)
			this.resumeSeqFlushTimer = null
		}

		void this.flushResumeSeqCursor()
	}

	private async flushResumeSeqCursor(): Promise<void> {
		if (!this.resumeSeqCursorDirty) {
			return
		}

		const seq = this.resumeSeqCursor
		this.resumeSeqCursorDirty = false

		try {
			await prisma.portalBridgeConfig.update({
				where: { id: this.config.id },
				data: {
					streamEpoch: this.streamEpoch,
					resumeFromSeq: BigInt(seq),
				},
			})
		} catch (error) {
			this.resumeSeqCursorDirty = true
			logBridgeInfo(
				`${describeBridgeContext({
					serverId: this.config.minecraftServer.serverId,
					bridgeId: this.config.bridgeId,
					module: this.config.module,
				})} resume seq flush failed`,
				'error',
				error,
			)
		}
	}

	private readAcceptedPayload(payload: unknown): BridgeAcceptedPayload | null {
		if (!payload || typeof payload !== 'object') {
			return null
		}

		const value = payload as Record<string, unknown>

		return {
			sessionId:
				typeof value['sessionId'] === 'string' ? value['sessionId'] : '',
			serverTime:
				typeof value['serverTime'] === 'string' ? value['serverTime'] : '',
			heartbeatIntervalSeconds:
				typeof value['heartbeatIntervalSeconds'] === 'number'
					? value['heartbeatIntervalSeconds']
					: DEFAULT_HEARTBEAT_INTERVAL_SECONDS,
			allowedTopics: Array.isArray(value['allowedTopics'])
				? value['allowedTopics'].filter(
						(item): item is string => typeof item === 'string',
					)
				: [],
			streamEpoch:
				typeof value['streamEpoch'] === 'string' ? value['streamEpoch'] : null,
			resumeFromSeq:
				typeof value['resumeFromSeq'] === 'number'
					? value['resumeFromSeq']
					: null,
		}
	}

	private async applyAcceptedStreamState(
		payload: BridgeAcceptedPayload | null,
	): Promise<void> {
		const acceptedEpoch = payload?.streamEpoch ?? null

		if (!acceptedEpoch) {
			return
		}

		const acceptedResumeSeq = Math.max(0, payload?.resumeFromSeq ?? 0)

		if (this.streamEpoch === acceptedEpoch) {
			const previousPersistedSeq = this.config.resumeFromSeq

			this.resumeSeqCursor = Math.max(this.resumeSeqCursor, acceptedResumeSeq)
			this.config.streamEpoch = acceptedEpoch
			this.config.resumeFromSeq = BigInt(this.resumeSeqCursor)

			if (BigInt(this.resumeSeqCursor) > previousPersistedSeq) {
				await prisma.portalBridgeConfig.update({
					where: { id: this.config.id },
					data: {
						streamEpoch: acceptedEpoch,
						resumeFromSeq: BigInt(this.resumeSeqCursor),
					},
				})
			}
			return
		}

		logBridgeInfo(
			`${describeBridgeContext({
				serverId: this.config.minecraftServer.serverId,
				bridgeId: this.config.bridgeId,
				module: this.config.module,
			})} adopted stream epoch ${acceptedEpoch}`,
			'info',
		)
		this.streamEpoch = acceptedEpoch
		this.resumeSeqCursor = acceptedResumeSeq
		this.resumeSeqCursorDirty = false
		this.config.streamEpoch = acceptedEpoch
		this.config.resumeFromSeq = BigInt(acceptedResumeSeq)

		await prisma.portalBridgeConfig.update({
			where: { id: this.config.id },
			data: {
				streamEpoch: acceptedEpoch,
				resumeFromSeq: BigInt(acceptedResumeSeq),
			},
		})
	}
}
