import type {
	ExternalSyncReason,
	ExternalSyncSource,
	MinecraftServerSnapshotKind,
	PortalBridgeCommandStatus,
	Prisma,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import {
	logExternalSyncFailed,
	logExternalSyncSucceeded,
} from '../external-sync/logger'
import { createServerPlayerIdentityEvidence } from '../minecraft/identity-evidence'
import { normalizeMinecraftUsername } from '../minecraft/normalize'
import {
	syncMinecraftServerPlayerAdvancementsSnapshot,
	syncMinecraftServerPlayerData,
	syncMinecraftServerPlayerStatsSnapshot,
	upsertMinecraftServerPlayerFromIdentity,
} from '../minecraft/server-player'
import type { PortalBridgeEnvelope } from './protocol'

const portalBridgeSyncSourceByAction: Partial<
	Record<string, ExternalSyncSource>
> = {
	'sync.players.now': 'PORTAL_BRIDGE_PLAYERS',
	'sync.playerdata.now': 'PORTAL_BRIDGE_PLAYERDATA',
	'sync.stats.now': 'PORTAL_BRIDGE_STATS',
	'sync.advancements.now': 'PORTAL_BRIDGE_ADVANCEMENTS',
}

const snapshotKindByTopic: ReadonlyMap<string, MinecraftServerSnapshotKind> =
	new Map([
		['mc.server.info.snapshot', 'SERVER_INFO'],
		['mc.server.status.snapshot', 'SERVER_STATUS'],
		['mc.server.worlds.snapshot', 'WORLDS'],
		['mc.player.online.snapshot', 'ONLINE_PLAYERS'],
		['mc.player.snapshot', 'PLAYER_SNAPSHOT'],
		['bridge.heartbeat', 'HEARTBEAT'],
		['bridge.metrics', 'METRICS'],
		['mc.playerdata.scan.started', 'PLAYERDATA_SCAN'],
		['mc.playerdata.scan.chunk', 'PLAYERDATA_SCAN'],
		['mc.playerdata.scan.completed', 'PLAYERDATA_SCAN'],
		['mc.stats.snapshot.manifest', 'STATS_SNAPSHOT'],
		['mc.stats.snapshot.chunk', 'STATS_SNAPSHOT'],
		['mc.stats.snapshot.completed', 'STATS_SNAPSHOT'],
		['mc.advancements.snapshot.manifest', 'ADVANCEMENTS_SNAPSHOT'],
		['mc.advancements.snapshot.chunk', 'ADVANCEMENTS_SNAPSHOT'],
		['mc.advancements.snapshot.completed', 'ADVANCEMENTS_SNAPSHOT'],
		['command.accepted', 'COMMAND_RESULT'],
		['command.rejected', 'COMMAND_RESULT'],
		['command.result', 'COMMAND_RESULT'],
	])

const readString = (payload: unknown, key: string): string | null => {
	if (!payload || typeof payload !== 'object') {
		return null
	}

	const value = (payload as Record<string, unknown>)[key]

	return typeof value === 'string' ? value : null
}

const readBoolean = (payload: unknown, key: string): boolean | null => {
	if (!payload || typeof payload !== 'object') {
		return null
	}

	const value = (payload as Record<string, unknown>)[key]

	return typeof value === 'boolean' ? value : null
}

const readNumber = (payload: unknown, key: string): number | null => {
	if (!payload || typeof payload !== 'object') {
		return null
	}

	const value = (payload as Record<string, unknown>)[key]

	return typeof value === 'number' && Number.isFinite(value) ? value : null
}

const readArray = (payload: unknown, key: string): unknown[] => {
	if (!payload || typeof payload !== 'object') {
		return []
	}

	const value = (payload as Record<string, unknown>)[key]

	return Array.isArray(value) ? value : []
}

const parseDate = (value: string | null | undefined): Date | null => {
	if (!value) {
		return null
	}

	if (/^\d+$/.test(value)) {
		const timestamp = Number(value)
		const date = new Date(timestamp)

		return Number.isNaN(date.getTime()) ? null : date
	}

	const date = new Date(value)

	return Number.isNaN(date.getTime()) ? null : date
}

const getEarliestDate = (
	left: Date | null | undefined,
	right: Date | null | undefined,
): Date | null => {
	if (!left) {
		return right ?? null
	}

	if (!right) {
		return left
	}

	return left.getTime() <= right.getTime() ? left : right
}

const getPortalBridgeTaskKey = (
	serverId: string,
	source: ExternalSyncSource,
): string => `${serverId}:${source.toLowerCase()}`

const getBridgeEnvelopeLatencyMs = (
	envelope: PortalBridgeEnvelope,
): number | null => {
	if (!envelope.sentAt) {
		return null
	}

	const sentAt = new Date(envelope.sentAt)
	const observedAt = new Date(envelope.observedAt)

	if (Number.isNaN(sentAt.getTime()) || Number.isNaN(observedAt.getTime())) {
		return null
	}

	return Math.max(0, observedAt.getTime() - sentAt.getTime())
}

const updateSyncTaskProgress = async (input: {
	serverId: string
	source: ExternalSyncSource
	rowsRead?: number
	rowsMatchedDelta?: number
	rowsChangedDelta?: number
	rowsSkippedDelta?: number
	finish?: 'success' | 'failure'
	error?: string | null
	reason?: ExternalSyncReason | null
	startedAt?: Date | null
	finishedAt?: Date | null
	latencyMs?: number | null
}) => {
	const taskKey = getPortalBridgeTaskKey(input.serverId, input.source)
	const state = input.finish
		? await prisma.externalSyncTaskState.findUnique({
				where: {
					taskKey,
				},
			})
		: null
	const data: Prisma.ExternalSyncTaskStateUpdateManyMutationInput = {}

	if (input.finish && !state?.running) {
		return
	}

	if (input.rowsRead != null) {
		data.rowsRead = input.rowsRead
	}

	if (input.rowsMatchedDelta != null && input.rowsMatchedDelta > 0) {
		data.rowsMatched = {
			increment: input.rowsMatchedDelta,
		}
	}

	if (input.rowsChangedDelta != null && input.rowsChangedDelta > 0) {
		data.rowsChanged = {
			increment: input.rowsChangedDelta,
		}
	}

	if (input.rowsSkippedDelta != null && input.rowsSkippedDelta > 0) {
		data.rowsSkipped = {
			increment: input.rowsSkippedDelta,
		}
	}

	if (input.finish) {
		const finishedAt = input.finishedAt ?? new Date()
		data.running = false
		data.lastFinishedAt = finishedAt

		if (input.finish === 'success') {
			data.lastSuccessAt = finishedAt
			data.lastError = null
		} else {
			data.lastError = input.error ?? 'PortalBridge sync failed'
		}
	}

	if (Object.keys(data).length === 0) {
		return
	}

	const updateResult = await prisma.externalSyncTaskState.updateMany({
		where: {
			taskKey,
			...(input.finish ? { running: true } : {}),
		},
		data,
	})

	if (!input.finish || (input.finish && updateResult.count === 0)) {
		return
	}

	const finishedAt = input.finishedAt ?? new Date()
	const startedAt = input.startedAt ?? state?.lastStartedAt ?? null
	const reason = input.reason ?? state?.reason ?? null
	const rowsRead = input.rowsRead ?? state?.rowsRead ?? 0
	const rowsMatched = (state?.rowsMatched ?? 0) + (input.rowsMatchedDelta ?? 0)
	const rowsChanged = (state?.rowsChanged ?? 0) + (input.rowsChangedDelta ?? 0)
	const rowsSkipped = (state?.rowsSkipped ?? 0) + (input.rowsSkippedDelta ?? 0)

	if (input.finish === 'success') {
		logExternalSyncSucceeded({
			serverId: input.serverId,
			source: input.source,
			reason,
			rowsRead,
			rowsMatched,
			rowsChanged,
			rowsSkipped,
			startedAt,
			finishedAt,
			latencyMs: input.latencyMs,
		})
		return
	}

	logExternalSyncFailed({
		serverId: input.serverId,
		source: input.source,
		reason,
		startedAt,
		finishedAt,
		latencyMs: input.latencyMs,
		error: input.error ?? 'PortalBridge sync failed',
	})
}

const updateCommandStatus = async (input: {
	commandId: string
	status: PortalBridgeCommandStatus
	completedAt?: Date | null
	errorMessage?: string | null
}) => {
	await prisma.portalBridgeCommand.updateMany({
		where: {
			commandId: input.commandId,
		},
		data: {
			status: input.status,
			completedAt: input.completedAt ?? undefined,
			errorMessage:
				input.errorMessage === undefined ? undefined : input.errorMessage,
		},
	})
}

const readCommandSource = async (
	commandId: string,
): Promise<ExternalSyncSource | null> => {
	const command = await prisma.portalBridgeCommand.findUnique({
		where: {
			commandId,
		},
		select: {
			action: true,
		},
	})

	if (!command) {
		return null
	}

	return portalBridgeSyncSourceByAction[command.action] ?? null
}

const updateCommandAndSyncTask = async (input: {
	serverId: string
	commandId: string
	status: PortalBridgeCommandStatus
	completedAt?: Date | null
	errorMessage?: string | null
	finishSync?: boolean
	latencyMs?: number | null
}) => {
	await updateCommandStatus({
		commandId: input.commandId,
		status: input.status,
		completedAt: input.completedAt,
		errorMessage: input.errorMessage,
	})

	if (!input.finishSync && !input.errorMessage) {
		return
	}

	const source = await readCommandSource(input.commandId)

	if (!source) {
		return
	}

	if (input.errorMessage) {
		await updateSyncTaskProgress({
			serverId: input.serverId,
			source,
			finish: 'failure',
			error: input.errorMessage,
			finishedAt: input.completedAt ?? new Date(),
			latencyMs: input.latencyMs,
		})
		return
	}

	if (input.finishSync) {
		await updateSyncTaskProgress({
			serverId: input.serverId,
			source,
			finish: 'success',
			finishedAt: input.completedAt ?? new Date(),
			latencyMs: input.latencyMs,
		})
	}
}

export const ingestPortalBridgeEnvelope = async (input: {
	bridgeConfigId: string
	serverId: string
	envelope: PortalBridgeEnvelope
}): Promise<{ duplicate: boolean }> => {
	const seq = input.envelope.seq == null ? null : BigInt(input.envelope.seq)

	try {
		await prisma.portalBridgeMessageReceipt.create({
			data: {
				bridgeConfigId: input.bridgeConfigId,
				messageId: input.envelope.id,
				seq,
				topic: input.envelope.topic,
				payload: input.envelope as unknown as Prisma.InputJsonValue,
			},
		})
	} catch (error) {
		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			(error as { code?: string }).code === 'P2002'
		) {
			return { duplicate: true }
		}

		throw error
	}

	await projectPortalBridgeEnvelope(input.serverId, input.envelope)

	return { duplicate: false }
}

const projectPortalBridgeEnvelope = async (
	serverId: string,
	envelope: PortalBridgeEnvelope,
): Promise<void> => {
	const observedAt = new Date(envelope.observedAt)
	const snapshotKind = snapshotKindByTopic.get(envelope.topic)

	if (snapshotKind) {
		await prisma.minecraftServerSnapshot.create({
			data: {
				serverId,
				kind: snapshotKind,
				observedAt,
				payload: envelope.payload as Prisma.InputJsonValue,
			},
		})
	}

	if (envelope.topic === 'mc.player.identity.observed') {
		await createServerPlayerIdentityEvidence({
			source: 'PORTAL_BRIDGE',
			sourceMessageId: envelope.id,
			serverId,
			uuid: readString(envelope.payload, 'uuid'),
			username: readString(envelope.payload, 'username'),
			uuidSource: readString(envelope.payload, 'uuidSource'),
			observedAt,
			payload: envelope.payload as Prisma.InputJsonValue,
		})
	}

	if (envelope.topic === 'mc.player.snapshot') {
		const playerCount = readArray(envelope.payload, 'players').length

		if (playerCount >= 0) {
			await updateSyncTaskProgress({
				serverId,
				source: 'PORTAL_BRIDGE_PLAYERS',
				rowsRead: playerCount,
				rowsMatchedDelta: playerCount,
				rowsChangedDelta: playerCount,
			})
		}

		for (const player of readArray(envelope.payload, 'players')) {
			const uuid = readString(player, 'uuid')
			const username = readString(player, 'username')

			if (!uuid) {
				continue
			}

			await upsertMinecraftServerPlayerFromIdentity({
				serverId,
				uuid,
				username,
				normalizedUsername: readString(player, 'normalizedUsername'),
				uuidSource: readString(player, 'uuidSource'),
				observedAt: parseDate(readString(player, 'lastSeenAt')) ?? observedAt,
			})
		}
	}

	if (envelope.topic === 'mc.playerdata.scan.chunk') {
		let matchedRows = 0
		let changedRows = 0
		const playersByUuid = new Map<
			string,
			{
				uuid: string
				playerDataFile: string | null
				lastModifiedAt: Date | null
				hasStatsFile: boolean
				hasAdvancementsFile: boolean
				lastKnownName: string | null
				firstPlayedAt: Date | null
				lastPlayedAt: Date | null
			}
		>()

		for (const player of readArray(envelope.payload, 'players')) {
			const uuid = readString(player, 'uuid')

			if (!uuid) {
				continue
			}

			await createServerPlayerIdentityEvidence({
				source: 'PLAYERDATA_SCAN',
				sourceMessageId: `${envelope.id}:${uuid}`,
				serverId,
				uuid,
				username: readString(player, 'lastKnownName'),
				uuidSource: 'PLAYERDATA_SCAN',
				observedAt:
					parseDate(readString(player, 'lastModifiedAt')) ?? observedAt,
				payload: player as Prisma.InputJsonValue,
			})

			const existing = playersByUuid.get(uuid)
			const lastModifiedAt = parseDate(readString(player, 'lastModifiedAt'))
			const next = {
				uuid,
				playerDataFile:
					readString(player, 'playerDataFile') ??
					existing?.playerDataFile ??
					null,
				lastModifiedAt: getEarliestDate(
					existing?.lastModifiedAt,
					lastModifiedAt,
				),
				hasStatsFile:
					(existing?.hasStatsFile ?? false) ||
					(readBoolean(player, 'hasStatsFile') ?? false),
				hasAdvancementsFile:
					(existing?.hasAdvancementsFile ?? false) ||
					(readBoolean(player, 'hasAdvancementsFile') ?? false),
				lastKnownName:
					readString(player, 'lastKnownName') ??
					existing?.lastKnownName ??
					null,
				firstPlayedAt:
					parseDate(readString(player, 'firstPlayedAt')) ??
					existing?.firstPlayedAt ??
					null,
				lastPlayedAt:
					parseDate(readString(player, 'lastPlayedAt')) ??
					existing?.lastPlayedAt ??
					null,
			}

			playersByUuid.set(uuid, next)
		}

		for (const player of playersByUuid.values()) {
			const result = await syncMinecraftServerPlayerData({
				serverId,
				uuid: player.uuid,
				playerDataFile: player.playerDataFile,
				lastModifiedAt: player.lastModifiedAt,
				hasStatsFile: player.hasStatsFile,
				hasAdvancementsFile: player.hasAdvancementsFile,
				lastKnownName: player.lastKnownName,
				firstPlayedAt: player.firstPlayedAt,
				lastPlayedAt: player.lastPlayedAt,
				syncedAt: observedAt,
			})

			if (result.matched) {
				matchedRows += 1
			}

			if (result.changed) {
				changedRows += 1
			}
		}

		if (matchedRows > 0) {
			await updateSyncTaskProgress({
				serverId,
				source: 'PORTAL_BRIDGE_PLAYERDATA',
				rowsMatchedDelta: matchedRows,
				rowsChangedDelta: changedRows,
				rowsSkippedDelta: Math.max(0, matchedRows - changedRows),
			})
		}
	}

	if (envelope.topic === 'mc.playerdata.scan.completed') {
		const commandId = readString(envelope.payload, 'commandId')
		const playersObserved = readNumber(envelope.payload, 'playersObserved')

		await updateSyncTaskProgress({
			serverId,
			source: 'PORTAL_BRIDGE_PLAYERDATA',
			rowsRead: playersObserved ?? 0,
			finish: 'success',
			finishedAt:
				parseDate(readString(envelope.payload, 'completedAt')) ?? observedAt,
			latencyMs: getBridgeEnvelopeLatencyMs(envelope),
		})

		if (commandId) {
			await updateCommandAndSyncTask({
				serverId,
				commandId,
				status: 'COMPLETED',
				completedAt: parseDate(readString(envelope.payload, 'completedAt')),
			})
		}
	}

	if (envelope.topic === 'mc.stats.snapshot.chunk') {
		const snapshotId = readString(envelope.payload, 'snapshotId')

		if (snapshotId) {
			let matchedRows = 0
			let changedRows = 0

			for (const player of readArray(envelope.payload, 'players')) {
				const uuid = readString(player, 'uuid')

				if (!uuid || !player || typeof player !== 'object') {
					continue
				}

				const stats = (player as Record<string, unknown>).stats

				const result = await syncMinecraftServerPlayerStatsSnapshot({
					serverId,
					uuid,
					snapshotId,
					statsHash: readString(player, 'statsHash'),
					observedAt:
						parseDate(readString(player, 'lastScannedAt')) ?? observedAt,
					lastScannedAt: parseDate(readString(player, 'lastScannedAt')),
					stats: (stats ?? {}) as Prisma.InputJsonValue,
				})

				if (result.matched) {
					matchedRows += 1
				}

				if (result.changed) {
					changedRows += 1
				}
			}

			if (matchedRows > 0) {
				await updateSyncTaskProgress({
					serverId,
					source: 'PORTAL_BRIDGE_STATS',
					rowsMatchedDelta: matchedRows,
					rowsChangedDelta: changedRows,
					rowsSkippedDelta: Math.max(0, matchedRows - changedRows),
				})
			}
		}
	}

	if (envelope.topic === 'mc.stats.snapshot.completed') {
		const commandId = readString(envelope.payload, 'commandId')
		const playerCount = readNumber(envelope.payload, 'playerCount')

		await updateSyncTaskProgress({
			serverId,
			source: 'PORTAL_BRIDGE_STATS',
			rowsRead: playerCount ?? 0,
			finish: 'success',
			finishedAt:
				parseDate(readString(envelope.payload, 'completedAt')) ?? observedAt,
			latencyMs: getBridgeEnvelopeLatencyMs(envelope),
		})

		if (commandId) {
			await updateCommandAndSyncTask({
				serverId,
				commandId,
				status: 'COMPLETED',
				completedAt: parseDate(readString(envelope.payload, 'completedAt')),
			})
		}
	}

	if (envelope.topic === 'mc.advancements.snapshot.chunk') {
		const snapshotId = readString(envelope.payload, 'snapshotId')

		if (snapshotId) {
			let matchedRows = 0
			let changedRows = 0

			for (const player of readArray(envelope.payload, 'players')) {
				const uuid = readString(player, 'uuid')

				if (!uuid || !player || typeof player !== 'object') {
					continue
				}

				const advancements = (player as Record<string, unknown>).advancements

				const result = await syncMinecraftServerPlayerAdvancementsSnapshot({
					serverId,
					uuid,
					snapshotId,
					advancementsHash: readString(player, 'advancementsHash'),
					observedAt:
						parseDate(readString(player, 'lastScannedAt')) ?? observedAt,
					lastScannedAt: parseDate(readString(player, 'lastScannedAt')),
					advancements: (advancements ?? {}) as Prisma.InputJsonValue,
				})

				if (result.matched) {
					matchedRows += 1
				}

				if (result.changed) {
					changedRows += 1
				}
			}

			if (matchedRows > 0) {
				await updateSyncTaskProgress({
					serverId,
					source: 'PORTAL_BRIDGE_ADVANCEMENTS',
					rowsMatchedDelta: matchedRows,
					rowsChangedDelta: changedRows,
					rowsSkippedDelta: Math.max(0, matchedRows - changedRows),
				})
			}
		}
	}

	if (envelope.topic === 'mc.advancements.snapshot.completed') {
		const commandId = readString(envelope.payload, 'commandId')
		const playerCount = readNumber(envelope.payload, 'playerCount')

		await updateSyncTaskProgress({
			serverId,
			source: 'PORTAL_BRIDGE_ADVANCEMENTS',
			rowsRead: playerCount ?? 0,
			finish: 'success',
			finishedAt:
				parseDate(readString(envelope.payload, 'completedAt')) ?? observedAt,
			latencyMs: getBridgeEnvelopeLatencyMs(envelope),
		})

		if (commandId) {
			await updateCommandAndSyncTask({
				serverId,
				commandId,
				status: 'COMPLETED',
				completedAt: parseDate(readString(envelope.payload, 'completedAt')),
			})
		}
	}

	if (envelope.topic === 'command.accepted') {
		const commandId = readString(envelope.payload, 'commandId')

		if (commandId) {
			await updateCommandStatus({
				commandId,
				status: 'ACCEPTED',
				errorMessage: null,
			})
		}
	}

	if (envelope.topic === 'command.rejected') {
		const commandId = readString(envelope.payload, 'commandId')
		const message =
			readString(envelope.payload, 'message') ?? 'PortalBridge command rejected'

		if (commandId) {
			await updateCommandAndSyncTask({
				serverId,
				commandId,
				status: 'REJECTED',
				completedAt: observedAt,
				errorMessage: message,
				latencyMs: getBridgeEnvelopeLatencyMs(envelope),
			})
		}
	}

	if (envelope.topic === 'command.result') {
		const commandId = readString(envelope.payload, 'commandId')
		const status = readString(envelope.payload, 'status')
		const message = readString(envelope.payload, 'message')
		const success = readBoolean(envelope.payload, 'success')
		const completedAt =
			parseDate(readString(envelope.payload, 'completedAt')) ?? observedAt

		if (commandId) {
			const source = await readCommandSource(commandId)
			const isOk = success !== false && status === 'OK'
			const shouldFinishOnResult = source === 'PORTAL_BRIDGE_PLAYERS'

			await updateCommandAndSyncTask({
				serverId,
				commandId,
				status: isOk ? 'COMPLETED' : 'FAILED',
				completedAt,
				errorMessage: isOk
					? null
					: (message ?? status ?? 'PortalBridge command failed'),
				finishSync: isOk && shouldFinishOnResult,
				latencyMs: getBridgeEnvelopeLatencyMs(envelope),
			})
		}
	}

	if (envelope.topic === 'mc.player.session.opened') {
		const sessionId = readString(envelope.payload, 'sessionId')
		const uuid = readString(envelope.payload, 'uuid')
		const username = readString(envelope.payload, 'username')

		if (uuid && sessionId) {
			await prisma.serverPlayerSession.upsert({
				where: {
					serverId_sessionId: {
						serverId,
						sessionId,
					},
				},
				create: {
					serverId,
					sessionId,
					uuid,
					username,
					normalizedUsername: normalizeMinecraftUsername(username),
					openedAt:
						parseDate(readString(envelope.payload, 'openedAt')) ??
						parseDate(readString(envelope.payload, 'startedAt')) ??
						observedAt,
				},
				update: {
					username,
					normalizedUsername: normalizeMinecraftUsername(username),
					openedAt:
						parseDate(readString(envelope.payload, 'openedAt')) ??
						parseDate(readString(envelope.payload, 'startedAt')) ??
						observedAt,
				},
			})
		} else if (uuid) {
			await prisma.serverPlayerSession.create({
				data: {
					serverId,
					uuid,
					username,
					normalizedUsername: normalizeMinecraftUsername(username),
					openedAt:
						parseDate(readString(envelope.payload, 'openedAt')) ??
						parseDate(readString(envelope.payload, 'startedAt')) ??
						observedAt,
				},
			})
		}
	}

	if (envelope.topic === 'mc.player.session.closed') {
		const sessionId = readString(envelope.payload, 'sessionId')
		const uuid = readString(envelope.payload, 'uuid')

		if (sessionId) {
			await prisma.serverPlayerSession.updateMany({
				where: {
					serverId,
					sessionId,
				},
				data: {
					closedAt:
						parseDate(readString(envelope.payload, 'closedAt')) ??
						parseDate(readString(envelope.payload, 'endedAt')) ??
						observedAt,
					closeReason:
						readString(envelope.payload, 'closeReason') ??
						readString(envelope.payload, 'reason'),
				},
			})
		} else if (uuid) {
			await prisma.serverPlayerSession.updateMany({
				where: {
					serverId,
					uuid,
					closedAt: null,
				},
				data: {
					closedAt: observedAt,
					closeReason:
						readString(envelope.payload, 'closeReason') ??
						readString(envelope.payload, 'reason'),
				},
			})
		}
	}
}
