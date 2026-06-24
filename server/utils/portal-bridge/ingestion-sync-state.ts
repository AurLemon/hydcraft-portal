import type {
	ExternalSyncReason,
	ExternalSyncSource,
	PortalBridgeCommandStatus,
	Prisma,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import {
	logExternalSyncFailed,
	logExternalSyncSucceeded,
} from '../external-sync/logger'

export const portalBridgeSyncSourceByAction: Partial<
	Record<string, ExternalSyncSource>
> = {
	'sync.players.now': 'PORTAL_BRIDGE_PLAYERS',
	'sync.playerdata.now': 'PORTAL_BRIDGE_PLAYERDATA',
	'sync.stats.now': 'PORTAL_BRIDGE_STATS',
	'sync.advancements.now': 'PORTAL_BRIDGE_ADVANCEMENTS',
}

const getPortalBridgeTaskKey = (
	serverId: string,
	source: ExternalSyncSource,
): string => `${serverId}:${source.toLowerCase()}`

export const updateSyncTaskProgress = async (input: {
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

export const updateCommandStatus = async (input: {
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

export const readCommandSource = async (
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

export const updateCommandAndSyncTask = async (input: {
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
