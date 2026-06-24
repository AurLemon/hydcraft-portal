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
	type BridgeAcceptedPayload,
	type PortalBridgeCommandAction,
	type PortalBridgeEnvelope,
} from './protocol'
import { RetryController } from './retry-controller'

// 重连退避参数（P1-1），对齐 bridge 端 reconnect 配置语义。
// 首次重试 1s，指数退避封顶 60s，±20% jitter 防多 server 惊群。
const RECONNECT_INITIAL_DELAY_MS = 1_000
const RECONNECT_MAX_DELAY_MS = 60_000
const RECONNECT_JITTER_RATIO = 0.2
// 最大重试次数；null = 无限重试。达到上限后 RetryController 置 manualRequired，停止调度。
const RECONNECT_MAX_ATTEMPTS: number | null = null
const PORTAL_BRIDGE_PLAYER_SYNC_INTERVAL_SECONDS = 60
const DEFAULT_HEARTBEAT_INTERVAL_SECONDS = 60
// liveness 看门狗阈值 = 协商心跳间隔 × 此倍数。任意消息（不限于心跳）都会重置计时。
// 取 2.5× 留抖动余量（业界 liveness 通常 2-3 倍心跳）。
const LIVENESS_WATCHDOG_MULTIPLIER = 2.5
// 看门狗自检频率，不低于 5s，避免空转。
const LIVENESS_CHECK_MIN_INTERVAL_MS = 5_000
// seq 游标批量 flush 间隔（P1-2）。游标内存化后定时落库，崩溃时靠去重幂等兜底。
const RESUME_SEQ_FLUSH_INTERVAL_MS = 5_000

const PORTAL_BRIDGE_PLAYER_SYNC_ACTION: {
	action: PortalBridgeCommandAction
	source: ExternalSyncSource
} = {
	action: 'sync.players.now',
	source: 'PORTAL_BRIDGE_PLAYERS',
}

interface PortalBridgeCoreSyncAction {
	action: PortalBridgeCommandAction
	source: ExternalSyncSource
}

const PORTAL_BRIDGE_CORE_SYNC_ACTIONS: readonly PortalBridgeCoreSyncAction[] = [
	{ action: 'sync.playerdata.now', source: 'PORTAL_BRIDGE_PLAYERDATA' },
	{ action: 'sync.stats.now', source: 'PORTAL_BRIDGE_STATS' },
	{ action: 'sync.advancements.now', source: 'PORTAL_BRIDGE_ADVANCEMENTS' },
]

// 命名引用，规避 noUncheckedIndexedAccess 下的 undefined 风险（P2-1 两阶段编排用）。
const PORTAL_BRIDGE_PLAYERDATA_SYNC_ACTION: PortalBridgeCoreSyncAction = {
	action: 'sync.playerdata.now',
	source: 'PORTAL_BRIDGE_PLAYERDATA',
}
const PORTAL_BRIDGE_STATS_SYNC_ACTION: PortalBridgeCoreSyncAction = {
	action: 'sync.stats.now',
	source: 'PORTAL_BRIDGE_STATS',
}
const PORTAL_BRIDGE_ADVANCEMENTS_SYNC_ACTION: PortalBridgeCoreSyncAction = {
	action: 'sync.advancements.now',
	source: 'PORTAL_BRIDGE_ADVANCEMENTS',
}

// bridge 默认只回 statsHash 不回 payload（省带宽），portal 需要 payload 才能在前端展示
// 每个玩家真实的统计数值 / 成就内容，所以这两类命令必须显式声明 includePayload。
const PAYLOAD_REQUIRED_CORE_SYNC_ACTIONS = new Set<PortalBridgeCommandAction>([
	'sync.stats.now',
	'sync.advancements.now',
])

const normalizeCoreSyncIntervalMinutes = (value: number): number =>
	Math.max(1, Math.floor(value || 30))

// 两阶段增量同步（P2-1）：从 envelope payload 读 players 数组与玩家字段，供 hash 收集旁路。
const readEnvelopePlayers = (payload: unknown): unknown[] => {
	if (!payload || typeof payload !== 'object') {
		return []
	}

	const value = (payload as Record<string, unknown>)['players']

	return Array.isArray(value) ? value : []
}

const readPlayerString = (player: unknown, key: string): string | null => {
	if (!player || typeof player !== 'object') {
		return null
	}

	const value = (player as Record<string, unknown>)[key]

	return typeof value === 'string' ? value : null
}

const readPlayerBoolean = (player: unknown, key: string): boolean | null => {
	if (!player || typeof player !== 'object') {
		return null
	}

	const value = (player as Record<string, unknown>)[key]

	return typeof value === 'boolean' ? value : null
}

// 两阶段增量同步：每 N 轮强制一次全量同步，防止 hash 漂移导致长期漏更新。
const PORTAL_BRIDGE_INCREMENTAL_FULL_SYNC_EVERY_N_ROUNDS = 10
// 命令回执等待超时（P2-1）：bridge 扫描可能耗时，给宽松上限。
const PORTAL_BRIDGE_COMMAND_RESULT_TIMEOUT_MS = 120_000

interface CommandResult {
	commandId: string
	success: boolean
	status: string
	message?: string | null
}

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

const describeCloseEvent = (event: {
	code?: number
	reason?: string
}): string => {
	const parts: string[] = []

	if (typeof event.code === 'number' && Number.isFinite(event.code)) {
		parts.push(`code=${event.code}`)
	}

	if (typeof event.reason === 'string' && event.reason.trim().length > 0) {
		parts.push(`reason=${event.reason.trim()}`)
	}

	return parts.length > 0 ? parts.join(', ') : 'no close reason'
}

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
	streamEpoch: string | null
	minecraftServer: {
		serverId: string
	}
}

export interface PortalBridgeRuntimeStatus {
	running: boolean
	connected: boolean
	readyState: string
	streamEpoch: string | null
	resumeSeqCursor: number
	reconnectAttempts: number
	maxReconnectAttempts: number | null
	nextRetryAt: Date | null
	manualRequired: boolean
	lastRuntimeStateChangedAt: Date | null
	lastHeartbeatAt: Date | null
	lastHeartbeatLatencyMs: number | null
	lastHeartbeatPayload: unknown
}

interface ReportedConnectionError {
	fingerprint: string
	message: string
}

class PortalBridgeConnection {
	private socket: WebSocket | null = null
	private coreSyncTimer: NodeJS.Timeout | null = null
	private playerSyncTimer: NodeJS.Timeout | null = null
	private retryController = new RetryController({
		initialDelayMs: RECONNECT_INITIAL_DELAY_MS,
		maxDelayMs: RECONNECT_MAX_DELAY_MS,
		jitterRatio: RECONNECT_JITTER_RATIO,
		maxAttempts: RECONNECT_MAX_ATTEMPTS,
	})
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
	// 两阶段增量同步（P2-1）：阶段一发 hash-only 命令，收集本轮 uuid→hash 映射，
	// completed 后比对库筛出变化的 uuid，阶段二逐个带 uuid 拉 payload。
	// 仅在两阶段轮次激活，平时为 null 不影响普通命令。
	private statsHashCollector: Map<string, string> | null = null
	private advancementsHashCollector: Map<string, string> | null = null
	// 命令回执 Promise 注册表（P2-1 前置）：sendCommand 返回的 commandId 注册一个 resolver，
	// handleMessage 收到 command.result/rejected 时 resolve，使调用方可 await 命令完成。
	private readonly commandResolvers = new Map<
		string,
		{
			resolve: (result: CommandResult) => void
			reject: (error: unknown) => void
		}
	>()
	private readonly snapshotCompletionResolvers = new Map<
		string,
		{
			resolve: (result: CommandResult) => void
			reject: (error: unknown) => void
		}
	>()
	// 两阶段增量同步轮次计数（P2-1）：每 N 轮强制全量一次防 hash 漂移。
	private coreRoundCount = 0

	constructor(private readonly config: BridgeRuntimeConfig) {
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

		this.stopCoreSync()
		this.retryController.clear()
		this.rejectPendingCommands('PortalBridge connection stopped')
		this.closeSocket()
		this.socket = null
	}

	// 释放所有未决命令回执 Promise（连接停止/断开时）。
	private rejectPendingCommands(reason: string): void {
		if (this.commandResolvers.size === 0) {
			return
		}

		for (const resolver of this.commandResolvers.values()) {
			resolver.reject(
				createApiError({
					statusCode: 503,
					code: 'PORTAL_BRIDGE_COMMAND_ABORTED',
					data: { reason },
				}),
			)
		}

		this.commandResolvers.clear()

		for (const resolver of this.snapshotCompletionResolvers.values()) {
			resolver.reject(
				createApiError({
					statusCode: 503,
					code: 'PORTAL_BRIDGE_COMMAND_ABORTED',
					data: { reason },
				}),
			)
		}

		this.snapshotCompletionResolvers.clear()
	}

	snapshot(): PortalBridgeRuntimeStatus {
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

	// 发命令并 await bridge 的 command.result/rejected 回执（P2-1 前置能力）。
	// 用于两阶段同步的阶段一：发 hash-only 命令后等 completed 信号，再读 collector 比对库。
	async sendCommandWithResult(
		action: PortalBridgeCommandAction,
		args?: Record<string, unknown>,
	): Promise<CommandResult> {
		const commandId = await this.sendCommand(action, args)

		return await new Promise<CommandResult>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.commandResolvers.delete(commandId)
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

			this.commandResolvers.set(commandId, {
				resolve: (result) => {
					clearTimeout(timer)
					this.commandResolvers.delete(commandId)
					resolve(result)
				},
				reject: (error) => {
					clearTimeout(timer)
					this.commandResolvers.delete(commandId)
					reject(error)
				},
			})
		})
	}

	async sendCommandWithSnapshotCompletion(
		action: PortalBridgeCommandAction,
		args?: Record<string, unknown>,
	): Promise<CommandResult> {
		const commandId = await this.sendCommand(action, args)

		return await new Promise<CommandResult>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.snapshotCompletionResolvers.delete(commandId)
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

			this.snapshotCompletionResolvers.set(commandId, {
				resolve: (result) => {
					clearTimeout(timer)
					this.snapshotCompletionResolvers.delete(commandId)
					resolve(result)
				},
				reject: (error) => {
					clearTimeout(timer)
					this.snapshotCompletionResolvers.delete(commandId)
					reject(error)
				},
			})
		})
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

			void this.handleMessage(event.data)
		})

		socket.addEventListener('close', (event) => {
			if (this.socket !== socket) {
				return
			}

			this.closingSocket = false
			this.stopCoreSync()
			this.rejectPendingCommands('PortalBridge connection closed')
			this.lastRuntimeStateChangedAt = new Date()
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
		// 任意消息（心跳 / snapshot / 命令回执等）都视为连接存活的证据，重置看门狗计时。
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
			void this.reportConnectionError({
				fingerprint: `rejected:${JSON.stringify(envelope.payload)}`,
				message: `rejected ${JSON.stringify(envelope.payload)}`,
				skipPersist: true,
			})
			this.closeSocket()
			return
		}

		// 两阶段增量同步的 hash 收集（P2-1）：阶段一 hash-only 轮次激活 collector 后，
		// 从 chunk envelope 旁路收集 uuid→hash，供阶段二比对库筛变化玩家。不依赖 ingestion 副作用。
		this.collectSnapshotHashes(envelope)

		// 命令回执 resolve（P2-1）：sendCommandWithResult 注册的 resolver 在收到结果时触发。
		this.resolveCommandResult(envelope)
		this.resolveSnapshotCompletion(envelope)

		await ingestPortalBridgeEnvelope({
			bridgeConfigId: this.config.id,
			serverId: this.config.minecraftServer.serverId,
			streamEpoch: this.streamEpoch,
			envelope,
		})

		// 游标内存化推进：用 Math.max 而非直接覆盖，防御性地自文档化"seq 单调"契约
		// （即便 bridge 已保证升序重放）。落库交给 flush timer 批量处理，避免每条消息一次 UPDATE。
		if (envelope.seq != null && Number.isFinite(envelope.seq)) {
			const seqNumber = Number(envelope.seq)

			if (seqNumber > this.resumeSeqCursor) {
				this.resumeSeqCursor = seqNumber
				this.resumeSeqCursorDirty = true
			}
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
		this.startLivenessWatchdog()
		this.startResumeSeqFlush()
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

		this.stopLivenessWatchdog()
		this.stopResumeSeqFlush()
	}

	// liveness 看门狗：连接进入 OPEN 后启动，定期检查"距上次收到任意消息"是否超阈值。
	// 超阈值说明 bridge 已不可达但 close frame 丢失（半开 TCP），主动 close 触发重连。
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

	// seq 游标批量 flush（P1-2）：内存游标定时落库，取代每条消息一次 UPDATE。
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

		// 停止前强制 flush 一次，尽量减少游标丢失窗口。
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
			// flush 失败时恢复脏标志，下一轮重试；崩溃则靠重连去重兜底。
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

	// 两阶段增量同步 hash 收集（P2-1）。
	private collectSnapshotHashes(envelope: PortalBridgeEnvelope): void {
		if (
			envelope.topic !== 'mc.stats.snapshot.chunk' &&
			envelope.topic !== 'mc.advancements.snapshot.chunk'
		) {
			return
		}

		const hashKey =
			envelope.topic === 'mc.stats.snapshot.chunk'
				? 'statsHash'
				: 'advancementsHash'
		const collector =
			envelope.topic === 'mc.stats.snapshot.chunk'
				? this.statsHashCollector
				: this.advancementsHashCollector

		if (!collector) {
			return
		}

		const players = readEnvelopePlayers(envelope.payload)

		for (const player of players) {
			const uuid = readPlayerString(player, 'uuid')
			const hash = readPlayerString(player, hashKey)

			if (uuid && hash) {
				collector.set(uuid, hash)
			}
		}
	}

	// 命令回执 resolve（P2-1）：收到 command.result/rejected 时触发对应 resolver。
	private resolveCommandResult(envelope: PortalBridgeEnvelope): void {
		if (
			envelope.topic !== 'command.result' &&
			envelope.topic !== 'command.rejected'
		) {
			return
		}

		const commandId = readPlayerString(envelope.payload, 'commandId')

		if (!commandId) {
			return
		}

		const resolver = this.commandResolvers.get(commandId)

		if (!resolver) {
			return
		}

		if (envelope.topic === 'command.rejected') {
			resolver.resolve({
				commandId,
				success: false,
				status: 'REJECTED',
				message:
					readPlayerString(envelope.payload, 'message') ??
					'PortalBridge command rejected',
			})
			return
		}

		const status = readPlayerString(envelope.payload, 'status')
		const success = readPlayerBoolean(envelope.payload, 'success')

		resolver.resolve({
			commandId,
			success: success !== false && status === 'OK',
			status: status ?? 'UNKNOWN',
			message: readPlayerString(envelope.payload, 'message'),
		})
	}

	private resolveSnapshotCompletion(envelope: PortalBridgeEnvelope): void {
		if (
			envelope.topic !== 'command.rejected' &&
			envelope.topic !== 'command.result' &&
			envelope.topic !== 'mc.stats.snapshot.completed' &&
			envelope.topic !== 'mc.advancements.snapshot.completed'
		) {
			return
		}

		const commandId = readPlayerString(envelope.payload, 'commandId')

		if (!commandId) {
			return
		}

		const resolver = this.snapshotCompletionResolvers.get(commandId)

		if (!resolver) {
			return
		}

		if (envelope.topic === 'command.rejected') {
			resolver.resolve({
				commandId,
				success: false,
				status: 'REJECTED',
				message:
					readPlayerString(envelope.payload, 'message') ??
					'PortalBridge command rejected',
			})
			return
		}

		if (envelope.topic === 'command.result') {
			const status = readPlayerString(envelope.payload, 'status')
			const success = readPlayerBoolean(envelope.payload, 'success')

			if (success === false || status !== 'OK') {
				resolver.resolve({
					commandId,
					success: false,
					status: status ?? 'UNKNOWN',
					message: readPlayerString(envelope.payload, 'message'),
				})
			}

			return
		}

		resolver.resolve({
			commandId,
			success: true,
			status: 'OK',
			message: readPlayerString(envelope.payload, 'message'),
		})
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
		this.coreRoundCount += 1

		// playerdata 不走两阶段（无 hash-only 模式），直接全量同步。
		await this.sendCoreSyncCommand(
			PORTAL_BRIDGE_PLAYERDATA_SYNC_ACTION,
			intervalSeconds,
		)

		// 每 N 轮强制全量同步 stats/advancements，防止 hash 漂移长期漏更新。
		const forceFull =
			this.coreRoundCount %
				PORTAL_BRIDGE_INCREMENTAL_FULL_SYNC_EVERY_N_ROUNDS ===
			0

		if (forceFull) {
			await this.sendCoreSyncCommand(
				PORTAL_BRIDGE_STATS_SYNC_ACTION,
				intervalSeconds,
			)
			await this.sendCoreSyncCommand(
				PORTAL_BRIDGE_ADVANCEMENTS_SYNC_ACTION,
				intervalSeconds,
			)
			return
		}

		// 两阶段增量同步：阶段一 hash-only → 比对库 → 阶段二按变化 uuid 拉 payload。
		await this.runIncrementalSnapshotSync(
			PORTAL_BRIDGE_STATS_SYNC_ACTION,
			intervalSeconds,
			'stats',
		)
		await this.runIncrementalSnapshotSync(
			PORTAL_BRIDGE_ADVANCEMENTS_SYNC_ACTION,
			intervalSeconds,
			'advancements',
		)
	}

	// 两阶段增量同步（P2-1）。kind 决定 collector 与 hash 字段。
	private async runIncrementalSnapshotSync(
		item: PortalBridgeCoreSyncAction,
		intervalSeconds: number,
		kind: 'stats' | 'advancements',
	): Promise<void> {
		const collector =
			kind === 'stats'
				? (this.statsHashCollector = new Map())
				: (this.advancementsHashCollector = new Map())

		try {
			// 阶段一：发 hash-only 命令（显式 includePayload:false），等 completed 信号。
			const phaseOne = await this.sendCoreSyncCommandWithSnapshotCompletion(
				item,
				intervalSeconds,
				{ includePayload: false },
			)

			if (!phaseOne?.success) {
				return
			}

			// 比对库：筛出本轮 hash 与库内不一致或库内缺失的 uuid。
			const changedUuids = await this.findChangedSnapshotUuids(
				this.config.minecraftServer.serverId,
				kind,
				collector,
			)

			if (changedUuids.length === 0) {
				return
			}

			// 阶段二：逐个 uuid 拉 payload（bridge 单 uuid 过滤 + 自动 includePayload）。
			for (const uuid of changedUuids) {
				await this.sendCoreSyncCommand(item, intervalSeconds, 'SCHEDULED', {
					uuid,
				})
			}
		} finally {
			if (kind === 'stats') {
				this.statsHashCollector = null
			} else {
				this.advancementsHashCollector = null
			}
		}
	}

	// 比对阶段一收集的 hash 与库内现有 hash，筛出变化/新增的 uuid（P2-1）。
	private async findChangedSnapshotUuids(
		serverId: string,
		kind: 'stats' | 'advancements',
		collector: Map<string, string>,
	): Promise<string[]> {
		if (collector.size === 0) {
			return []
		}

		const uuids = Array.from(collector.keys())
		const players = await prisma.minecraftServerPlayer.findMany({
			where: {
				serverId,
				uuid: {
					in: uuids,
				},
			},
			select: {
				uuid: true,
				statsSnapshot: {
					select: {
						statsHash: true,
					},
				},
				advancementsSnapshot: {
					select: {
						advancementsHash: true,
					},
				},
			},
		})

		const existingHashByUuid = new Map<string, string | null>()

		for (const player of players) {
			const existingHash =
				kind === 'stats'
					? (player.statsSnapshot?.statsHash ?? null)
					: (player.advancementsSnapshot?.advancementsHash ?? null)

			existingHashByUuid.set(player.uuid, existingHash)
		}

		const changed: string[] = []

		for (const [uuid, freshHash] of collector) {
			// 库内无记录（新玩家）或 hash 不一致 → 需拉 payload。
			if (existingHashByUuid.get(uuid) !== freshHash) {
				changed.push(uuid)
			}
		}

		return changed
	}

	private async sendCoreSyncCommand(
		item: PortalBridgeCoreSyncAction,
		intervalSeconds: number,
		reason: ExternalSyncReason = 'SCHEDULED',
		args?: Record<string, unknown>,
	): Promise<void> {
		await this.sendCoreSyncCommandInner(
			item,
			intervalSeconds,
			reason,
			args,
			false,
		)
	}

	// 带回执的核心同步命令（P2-1）：用 sendCommandWithResult 等待 bridge completed。
	private async sendCoreSyncCommandWithResult(
		item: PortalBridgeCoreSyncAction,
		intervalSeconds: number,
		args?: Record<string, unknown>,
	): Promise<CommandResult | null> {
		return await this.sendCoreSyncCommandInner(
			item,
			intervalSeconds,
			'SCHEDULED',
			args,
			'commandResult',
		)
	}

	private async sendCoreSyncCommandWithSnapshotCompletion(
		item: PortalBridgeCoreSyncAction,
		intervalSeconds: number,
		args?: Record<string, unknown>,
	): Promise<CommandResult | null> {
		return await this.sendCoreSyncCommandInner(
			item,
			intervalSeconds,
			'SCHEDULED',
			args,
			'snapshotCompletion',
		)
	}

	private async sendCoreSyncCommandInner(
		item: PortalBridgeCoreSyncAction,
		intervalSeconds: number,
		reason: ExternalSyncReason,
		args: Record<string, unknown> | undefined,
		awaitResult: false | 'commandResult' | 'snapshotCompletion',
	): Promise<CommandResult | null> {
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
			return null
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

			// stats/advancements 默认需要真实 payload；显式参数仍可覆盖。
			const commandArgs = PAYLOAD_REQUIRED_CORE_SYNC_ACTIONS.has(item.action)
				? { includePayload: true, ...args }
				: args

			if (awaitResult === 'commandResult') {
				return await this.sendCommandWithResult(item.action, commandArgs)
			}

			if (awaitResult === 'snapshotCompletion') {
				return await this.sendCommandWithSnapshotCompletion(
					item.action,
					commandArgs,
				)
			}

			await this.sendCommand(item.action, commandArgs)
			return null
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

			return null
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
