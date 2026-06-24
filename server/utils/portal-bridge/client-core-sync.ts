import type { ExternalSyncReason } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { heavySyncDispatcher } from '../external-sync/heavy-sync-dispatcher'
import {
	logExternalSyncFailed,
	logExternalSyncStarted,
} from '../external-sync/logger'
import {
	PAYLOAD_REQUIRED_CORE_SYNC_ACTIONS,
	PORTAL_BRIDGE_ADVANCEMENTS_SYNC_ACTION,
	PORTAL_BRIDGE_CORE_SYNC_ACTIONS,
	PORTAL_BRIDGE_INCREMENTAL_FULL_SYNC_EVERY_N_ROUNDS,
	PORTAL_BRIDGE_PLAYER_SYNC_ACTION,
	PORTAL_BRIDGE_PLAYER_SYNC_INTERVAL_SECONDS,
	PORTAL_BRIDGE_PLAYERDATA_SYNC_ACTION,
	PORTAL_BRIDGE_STATS_SYNC_ACTION,
} from './client-constants'
import {
	getPortalBridgeCoreRoundJobKey,
	normalizeCoreSyncIntervalMinutes,
	readEnvelopePlayers,
	readPlayerString,
} from './client-helpers'
import {
	markPortalBridgeSyncFinished,
	markPortalBridgeSyncStarted,
} from './client-sync-state'
import type {
	CommandResult,
	PortalBridgeCommandWaitMode,
	PortalBridgeCoreSyncAction,
	PortalBridgeCoreSyncRuntime,
} from './client-types'
import type { PortalBridgeEnvelope } from './protocol'

export class PortalBridgeCoreSyncCoordinator {
	private coreSyncTimer: NodeJS.Timeout | null = null
	private playerSyncTimer: NodeJS.Timeout | null = null
	private statsHashCollector: Map<string, string> | null = null
	private advancementsHashCollector: Map<string, string> | null = null
	private coreRoundCount = 0

	constructor(private readonly runtime: PortalBridgeCoreSyncRuntime) {}

	start(): void {
		if (this.coreSyncTimer) {
			return
		}

		const intervalSeconds =
			normalizeCoreSyncIntervalMinutes(
				this.runtime.config.coreSyncIntervalMinutes,
			) * 60

		this.startPlayerSync()
		void this.scheduleCoreSyncRound(intervalSeconds)
		this.coreSyncTimer = setInterval(() => {
			void this.scheduleCoreSyncRound(intervalSeconds)
		}, intervalSeconds * 1000)
	}

	stop(): void {
		if (this.playerSyncTimer) {
			clearInterval(this.playerSyncTimer)
			this.playerSyncTimer = null
		}

		if (this.coreSyncTimer) {
			clearInterval(this.coreSyncTimer)
			this.coreSyncTimer = null
		}

		this.statsHashCollector = null
		this.advancementsHashCollector = null
	}

	handleEnvelope(envelope: PortalBridgeEnvelope): void {
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

	async sendCoreSyncNow(): Promise<void> {
		const intervalSeconds =
			normalizeCoreSyncIntervalMinutes(
				this.runtime.config.coreSyncIntervalMinutes,
			) * 60

		await this.sendCoreSyncCommand(
			PORTAL_BRIDGE_PLAYER_SYNC_ACTION,
			PORTAL_BRIDGE_PLAYER_SYNC_INTERVAL_SECONDS,
			'MANUAL',
		)
		await heavySyncDispatcher.enqueue(
			this.runtime.config.minecraftServer.serverId,
			getPortalBridgeCoreRoundJobKey(
				this.runtime.config.minecraftServer.serverId,
			),
			async () => {
				for (const item of PORTAL_BRIDGE_CORE_SYNC_ACTIONS) {
					await this.sendCoreSyncCommand(item, intervalSeconds, 'MANUAL')
				}

				return undefined
			},
		)
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
			this.runtime.config.minecraftServer.serverId,
			getPortalBridgeCoreRoundJobKey(
				this.runtime.config.minecraftServer.serverId,
			),
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
			const phaseOne = await this.sendCoreSyncCommandWithWait(
				item,
				intervalSeconds,
				'snapshotCompletion',
				{ includePayload: false },
			)

			if (!phaseOne?.success) {
				return
			}

			const changedUuids = await this.findChangedSnapshotUuids(
				this.runtime.config.minecraftServer.serverId,
				kind,
				collector,
			)

			if (changedUuids.length === 0) {
				return
			}

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
			null,
		)
	}

	private async sendCoreSyncCommandWithWait(
		item: PortalBridgeCoreSyncAction,
		intervalSeconds: number,
		waitMode: PortalBridgeCommandWaitMode,
		args?: Record<string, unknown>,
	): Promise<CommandResult | null> {
		return await this.sendCoreSyncCommandInner(
			item,
			intervalSeconds,
			'SCHEDULED',
			args,
			waitMode,
		)
	}

	private async sendCoreSyncCommandInner(
		item: PortalBridgeCoreSyncAction,
		intervalSeconds: number,
		reason: ExternalSyncReason,
		args: Record<string, unknown> | undefined,
		waitMode: PortalBridgeCommandWaitMode | null,
	): Promise<CommandResult | null> {
		const startedAt = new Date()
		const latencyMs = this.runtime.getLastHeartbeatLatencyMs()

		if (!this.runtime.isSocketOpen()) {
			const finishedAt = new Date()
			const error = 'PortalBridge websocket is not connected'

			await markPortalBridgeSyncFinished({
				serverId: this.runtime.config.minecraftServer.serverId,
				source: item.source,
				intervalSeconds,
				reason,
				error,
			})
			logExternalSyncFailed({
				serverId: this.runtime.config.minecraftServer.serverId,
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
				serverId: this.runtime.config.minecraftServer.serverId,
				source: item.source,
				intervalSeconds,
				reason,
			})
			logExternalSyncStarted({
				serverId: this.runtime.config.minecraftServer.serverId,
				source: item.source,
				reason,
			})

			const commandArgs = PAYLOAD_REQUIRED_CORE_SYNC_ACTIONS.has(item.action)
				? { includePayload: true, ...args }
				: args

			if (waitMode) {
				return await this.runtime.sendCommandAndWait(
					item.action,
					commandArgs,
					waitMode,
				)
			}

			await this.runtime.sendCommand(item.action, commandArgs)
			return null
		} catch (error) {
			const finishedAt = new Date()
			await markPortalBridgeSyncFinished({
				serverId: this.runtime.config.minecraftServer.serverId,
				source: item.source,
				intervalSeconds,
				reason,
				error:
					error instanceof Error ? error.message : 'PortalBridge sync failed',
			})
			logExternalSyncFailed({
				serverId: this.runtime.config.minecraftServer.serverId,
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
}
