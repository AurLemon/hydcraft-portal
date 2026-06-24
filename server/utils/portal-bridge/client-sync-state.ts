import type {
	ExternalSyncReason,
	ExternalSyncSource,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { getPortalBridgeTaskKey } from './client-helpers'

export const markPortalBridgeSyncStarted = async (input: {
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

export const markPortalBridgeSyncFinished = async (input: {
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
