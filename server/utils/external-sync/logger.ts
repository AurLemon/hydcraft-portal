import type {
	ExternalSyncReason,
	ExternalSyncSource,
} from '~/generated/prisma/client'

const sourceLabels: Record<ExternalSyncSource, string> = {
	AUTHME: 'AuthMe',
	LUCKPERMS: 'LuckPerms',
	PORTAL_BRIDGE_PLAYERS: 'Bridge players',
	PORTAL_BRIDGE_PLAYERDATA: 'Bridge playerdata',
	PORTAL_BRIDGE_STATS: 'Bridge stats',
	PORTAL_BRIDGE_ADVANCEMENTS: 'Bridge advancements',
}

const formatDuration = (durationMs: number | null | undefined): string => {
	if (durationMs == null || !Number.isFinite(durationMs)) {
		return 'n/a'
	}

	return `${Math.max(0, Math.round(durationMs))}ms`
}

const formatLatency = (latencyMs: number | null | undefined): string => {
	if (latencyMs == null || !Number.isFinite(latencyMs)) {
		return 'n/a'
	}

	return `${Math.max(0, Math.round(latencyMs))}ms`
}

const describeContext = (input: {
	serverId?: string
	scope?: string
	source: ExternalSyncSource
	reason?: ExternalSyncReason | null
}): string =>
	`${sourceLabels[input.source]} sync [${
		input.serverId
			? `server=${input.serverId}`
			: `scope=${input.scope ?? 'GLOBAL'}`
	}] [reason=${input.reason ?? 'UNKNOWN'}]`

const quietSuccessSources = new Set<ExternalSyncSource>([
	'PORTAL_BRIDGE_PLAYERS',
])

const writeSyncLog = (
	level: 'info' | 'success' | 'error',
	message: string,
	error?: unknown,
): void => {
	if (level === 'error') {
		const line = `✖ [sync] ${message}`
		console.error(line)
		if (error !== undefined) {
			console.error(error)
		}
		return
	}

	if (level === 'success') {
		console.log(`✔ [sync] ${message}`)
		return
	}

	console.info(`[sync] ${message}`)
}

export const logExternalSyncStarted = (input: {
	serverId?: string
	scope?: string
	source: ExternalSyncSource
	reason?: ExternalSyncReason | null
}): void => {
	if (quietSuccessSources.has(input.source)) {
		return
	}

	writeSyncLog('info', `${describeContext(input)} started`)
}

export const logExternalSyncSucceeded = (input: {
	serverId?: string
	scope?: string
	source: ExternalSyncSource
	reason?: ExternalSyncReason | null
	rowsRead: number
	rowsMatched: number
	rowsChanged: number
	rowsSkipped: number
	startedAt?: Date | null
	finishedAt?: Date | null
	latencyMs?: number | null
}): void => {
	const durationMs =
		input.startedAt && input.finishedAt
			? input.finishedAt.getTime() - input.startedAt.getTime()
			: null

	if (quietSuccessSources.has(input.source)) {
		return
	}

	writeSyncLog(
		'success',
		`${describeContext(input)} completed [read=${input.rowsRead}] [matched=${input.rowsMatched}] [changed=${input.rowsChanged}] [skipped=${input.rowsSkipped}] [duration=${formatDuration(durationMs)}] [latency=${formatLatency(input.latencyMs)}]`,
	)
}

export const logExternalSyncFailed = (input: {
	serverId?: string
	scope?: string
	source: ExternalSyncSource
	reason?: ExternalSyncReason | null
	startedAt?: Date | null
	finishedAt?: Date | null
	latencyMs?: number | null
	error: unknown
}): void => {
	const durationMs =
		input.startedAt && input.finishedAt
			? input.finishedAt.getTime() - input.startedAt.getTime()
			: null
	const message =
		input.error instanceof Error ? input.error.message : String(input.error)

	writeSyncLog(
		'error',
		`${describeContext(input)} failed [duration=${formatDuration(durationMs)}] [latency=${formatLatency(input.latencyMs)}] ${message}`,
		input.error,
	)
}
