import type {
	ExternalSyncSource,
	PortalBridgeConfig,
} from '~/generated/prisma/client'
import type { PortalBridgeCommandAction } from './protocol'

export interface BridgeRuntimeConfig extends PortalBridgeConfig {
	streamEpoch: string | null
	minecraftServer: {
		serverId: string
	}
}

export interface PortalBridgeRuntimeSnapshot {
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

export interface CommandResult {
	commandId: string
	success: boolean
	status: string
	message?: string | null
}

export interface PortalBridgeCoreSyncAction {
	action: PortalBridgeCommandAction
	source: ExternalSyncSource
}

export interface ReportedConnectionError {
	fingerprint: string
	message: string
}

export type PortalBridgeCommandWaitMode = 'commandResult' | 'snapshotCompletion'

export interface PendingCommandWaiter {
	mode: PortalBridgeCommandWaitMode
	resolve: (result: CommandResult) => void
	reject: (error: unknown) => void
}

export interface PortalBridgeCoreSyncRuntime {
	readonly config: BridgeRuntimeConfig
	getLastHeartbeatLatencyMs(): number | null
	isSocketOpen(): boolean
	sendCommand(
		action: PortalBridgeCommandAction,
		args?: Record<string, unknown>,
	): Promise<string>
	sendCommandAndWait(
		action: PortalBridgeCommandAction,
		args: Record<string, unknown> | undefined,
		mode: PortalBridgeCommandWaitMode,
	): Promise<CommandResult>
}
