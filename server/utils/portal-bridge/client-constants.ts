import type { ExternalSyncSource } from '~/generated/prisma/client'
import type { PortalBridgeCommandAction } from './protocol'
import type { PortalBridgeCoreSyncAction } from './client-types'

const readEnvInt = (value: string | undefined, fallback: number): number => {
	if (!value) {
		return fallback
	}

	const parsed = Number.parseInt(value, 10)

	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

// 重连退避参数（P1-1），对齐 bridge 端 reconnect 配置语义。
// 首次重试 1s，指数退避封顶 60s，±20% jitter 防多 server 惊群。
export const RECONNECT_INITIAL_DELAY_MS = 1_000
export const RECONNECT_MAX_DELAY_MS = 60_000
export const RECONNECT_JITTER_RATIO = 0.2
// 最大重试次数；null = 无限重试。达到上限后 RetryController 置 manualRequired，停止调度。
export const RECONNECT_MAX_ATTEMPTS: number | null = null
export const PORTAL_BRIDGE_PLAYER_SYNC_INTERVAL_SECONDS = readEnvInt(
	process.env.PORTAL_BRIDGE_PLAYER_SYNC_INTERVAL_SECONDS,
	60,
)
export const DEFAULT_HEARTBEAT_INTERVAL_SECONDS = 60
// liveness 看门狗阈值 = 协商心跳间隔 × 此倍数。任意消息（不限于心跳）都会重置计时。
// 取 2.5× 留抖动余量（业界 liveness 通常 2-3 倍心跳）。
export const LIVENESS_WATCHDOG_MULTIPLIER = 2.5
// 看门狗自检频率，不低于 5s，避免空转。
export const LIVENESS_CHECK_MIN_INTERVAL_MS = 5_000
// seq 游标批量 flush 间隔（P1-2）。游标内存化后定时落库，崩溃时靠去重幂等兜底。
export const RESUME_SEQ_FLUSH_INTERVAL_MS = 5_000
// 两阶段增量同步：每 N 轮强制一次全量同步，防止 hash 漂移导致长期漏更新。
export const PORTAL_BRIDGE_INCREMENTAL_FULL_SYNC_EVERY_N_ROUNDS = 10
// 命令回执等待超时（P2-1）：bridge 扫描可能耗时，给宽松上限。
export const PORTAL_BRIDGE_COMMAND_RESULT_TIMEOUT_MS = 120_000

export const PORTAL_BRIDGE_PLAYER_SYNC_ACTION: {
	action: PortalBridgeCommandAction
	source: ExternalSyncSource
} = {
	action: 'sync.players.now',
	source: 'PORTAL_BRIDGE_PLAYERS',
}

export const PORTAL_BRIDGE_CORE_SYNC_ACTIONS: readonly PortalBridgeCoreSyncAction[] =
	[
		{ action: 'sync.playerdata.now', source: 'PORTAL_BRIDGE_PLAYERDATA' },
		{ action: 'sync.stats.now', source: 'PORTAL_BRIDGE_STATS' },
		{
			action: 'sync.advancements.now',
			source: 'PORTAL_BRIDGE_ADVANCEMENTS',
		},
	]

// 命名引用，规避 noUncheckedIndexedAccess 下的 undefined 风险（P2-1 两阶段编排用）。
export const PORTAL_BRIDGE_PLAYERDATA_SYNC_ACTION: PortalBridgeCoreSyncAction =
	{
		action: 'sync.playerdata.now',
		source: 'PORTAL_BRIDGE_PLAYERDATA',
	}

export const PORTAL_BRIDGE_STATS_SYNC_ACTION: PortalBridgeCoreSyncAction = {
	action: 'sync.stats.now',
	source: 'PORTAL_BRIDGE_STATS',
}

export const PORTAL_BRIDGE_ADVANCEMENTS_SYNC_ACTION: PortalBridgeCoreSyncAction =
	{
		action: 'sync.advancements.now',
		source: 'PORTAL_BRIDGE_ADVANCEMENTS',
	}

// bridge 默认只回 statsHash 不回 payload（省带宽），portal 需要 payload 才能在前端展示
// 每个玩家真实的统计数值 / 成就内容，所以这两类命令必须显式声明 includePayload。
export const PAYLOAD_REQUIRED_CORE_SYNC_ACTIONS =
	new Set<PortalBridgeCommandAction>([
		'sync.stats.now',
		'sync.advancements.now',
	])

export const SNAPSHOT_COMPLETION_TOPICS: readonly string[] = [
	'mc.stats.snapshot.completed',
	'mc.advancements.snapshot.completed',
]
