import type {
	ExternalSyncReason,
	ExternalSyncSource,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { syncAuthMeSource } from './authme'
import { heavySyncDispatcher } from './heavy-sync-dispatcher'
import {
	logExternalSyncFailed,
	logExternalSyncStarted,
	logExternalSyncSucceeded,
} from './logger'
import { syncLuckPermsSource } from './luckperms'
import {
	readAuthMeSourceConfig,
	readLuckPermsSourceConfig,
} from './source-config'

export interface ExternalSyncResult {
	serversRead: number
	rowsRead: number
	rowsMatched: number
	rowsChanged: number
	rowsSkipped: number
}

export interface ExternalSyncTaskResult {
	rowsRead: number
	rowsMatched: number
	rowsChanged: number
	rowsSkipped: number
	latencyMs?: number | null
}

interface ExternalSyncTaskInput {
	taskKey: string
	source: ExternalSyncSource
	intervalSeconds: number
	enabled: boolean
	reason: ExternalSyncReason
	handler: () => Promise<ExternalSyncTaskResult>
}

const CHECK_INTERVAL_MS = 60_000
const MIN_INTERVAL_SECONDS = 60
const MIN_STALE_RUNNING_TIMEOUT_MS = 10 * 60_000

const normalizeIntervalSeconds = (value: number): number =>
	Math.max(MIN_INTERVAL_SECONDS, Math.floor(value || 1800))

const getStaleRunningTimeoutMs = (intervalSeconds: number): number =>
	Math.max(
		normalizeIntervalSeconds(intervalSeconds) * 2 * 1000,
		MIN_STALE_RUNNING_TIMEOUT_MS,
	)

export const getExternalSyncTaskKey = (source: ExternalSyncSource): string =>
	source.toLowerCase()

// 按 source 分配 dispatcher lane：AuthMe 与 LuckPerms 数据源独立，
// 分 lane 后二者可并行同步，互不阻塞（此前共用 'GLOBAL' lane 导致串行）。
export const getExternalSyncLaneKey = (source: ExternalSyncSource): string =>
	`EXTERNAL_SYNC:${source}`

const shouldRunTask = async (input: {
	source: ExternalSyncSource
	intervalSeconds: number
}): Promise<boolean> => {
	const state = await prisma.externalSyncState.findUnique({
		where: {
			source: input.source,
		},
	})

	if (!state?.lastSuccessAt) {
		return true
	}

	return (
		Date.now() - state.lastSuccessAt.getTime() >=
		normalizeIntervalSeconds(input.intervalSeconds) * 1000
	)
}

const reclaimStaleRunningTask = async (input: {
	source: ExternalSyncSource
	intervalSeconds: number
}): Promise<void> => {
	const timeoutMs = getStaleRunningTimeoutMs(input.intervalSeconds)
	const staleStartedBefore = new Date(Date.now() - timeoutMs)

	await prisma.externalSyncState.updateMany({
		where: {
			source: input.source,
			running: true,
			OR: [
				{
					lastStartedAt: null,
				},
				{
					lastStartedAt: {
						lt: staleStartedBefore,
					},
				},
			],
		},
		data: {
			running: false,
			lastFinishedAt: new Date(),
			lastError: 'External sync task lock expired and was reclaimed.',
		},
	})
}

export const runExternalSyncTask = async (
	input: ExternalSyncTaskInput,
): Promise<ExternalSyncTaskResult | null> => {
	const intervalSeconds = normalizeIntervalSeconds(input.intervalSeconds)
	const startedAt = new Date()
	await prisma.externalSyncState.upsert({
		where: {
			source: input.source,
		},
		create: {
			source: input.source,
			reason: input.reason,
			running: false,
			enabled: input.enabled,
			intervalSeconds,
		},
		update: {
			source: input.source,
			reason: input.reason,
			enabled: input.enabled,
			intervalSeconds,
		},
	})

	await reclaimStaleRunningTask({
		source: input.source,
		intervalSeconds,
	})

	const claimed = await prisma.externalSyncState.updateMany({
		where: {
			source: input.source,
			running: false,
		},
		data: {
			reason: input.reason,
			running: true,
			intervalSeconds,
			lastStartedAt: startedAt,
			lastError: null,
			rowsRead: 0,
			rowsMatched: 0,
			rowsChanged: 0,
			rowsSkipped: 0,
		},
	})

	if (claimed.count === 0) {
		return null
	}

	logExternalSyncStarted({
		scope: 'GLOBAL',
		source: input.source,
		reason: input.reason,
	})

	try {
		const result = await input.handler()
		const finishedAt = new Date()

		await prisma.externalSyncState.update({
			where: {
				source: input.source,
			},
			data: {
				running: false,
				lastFinishedAt: finishedAt,
				lastSuccessAt: finishedAt,
				lastError: null,
				rowsRead: result.rowsRead,
				rowsMatched: result.rowsMatched,
				rowsChanged: result.rowsChanged,
				rowsSkipped: result.rowsSkipped,
			},
		})

		logExternalSyncSucceeded({
			scope: 'GLOBAL',
			source: input.source,
			reason: input.reason,
			rowsRead: result.rowsRead,
			rowsMatched: result.rowsMatched,
			rowsChanged: result.rowsChanged,
			rowsSkipped: result.rowsSkipped,
			startedAt,
			finishedAt,
			latencyMs: result.latencyMs,
		})

		return result
	} catch (error) {
		const finishedAt = new Date()

		await prisma.externalSyncState.update({
			where: {
				source: input.source,
			},
			data: {
				running: false,
				lastFinishedAt: finishedAt,
				lastError:
					error instanceof Error ? error.message : 'Unknown sync task error',
			},
		})

		logExternalSyncFailed({
			scope: 'GLOBAL',
			source: input.source,
			reason: input.reason,
			startedAt,
			finishedAt,
			error,
		})

		throw error
	}
}

export const syncAuthMeSources = async (
	reason: ExternalSyncReason,
	options: { onlyDue?: boolean } = {},
): Promise<ExternalSyncResult> => {
	const config = readAuthMeSourceConfig()
	const taskKey = getExternalSyncTaskKey('AUTHME')

	if (!config.enabled) {
		await prisma.externalSyncState.upsert({
			where: {
				source: 'AUTHME',
			},
			create: {
				source: 'AUTHME',
				reason,
				enabled: false,
				intervalSeconds: config.intervalSeconds,
			},
			update: {
				reason,
				enabled: false,
				intervalSeconds: config.intervalSeconds,
			},
		})
		return {
			serversRead: 0,
			rowsRead: 0,
			rowsMatched: 0,
			rowsChanged: 0,
			rowsSkipped: 0,
		}
	}

	if (
		options.onlyDue &&
		!(await shouldRunTask({
			source: 'AUTHME',
			intervalSeconds: config.intervalSeconds,
		}))
	) {
		return {
			serversRead: 0,
			rowsRead: 0,
			rowsMatched: 0,
			rowsChanged: 0,
			rowsSkipped: 0,
		}
	}

	const result = await heavySyncDispatcher.enqueue(
		getExternalSyncLaneKey('AUTHME'),
		taskKey,
		() =>
			runExternalSyncTask({
				taskKey,
				source: 'AUTHME',
				enabled: config.enabled,
				intervalSeconds: config.intervalSeconds,
				reason,
				handler: () => syncAuthMeSource(),
			}),
	)

	return result
		? { serversRead: 1, ...result }
		: {
				serversRead: 0,
				rowsRead: 0,
				rowsMatched: 0,
				rowsChanged: 0,
				rowsSkipped: 0,
			}
}

export const syncLuckPermsSources = async (
	reason: ExternalSyncReason,
	options: { onlyDue?: boolean } = {},
): Promise<ExternalSyncResult> => {
	const config = readLuckPermsSourceConfig()
	const taskKey = getExternalSyncTaskKey('LUCKPERMS')

	if (!config.enabled) {
		await prisma.externalSyncState.upsert({
			where: {
				source: 'LUCKPERMS',
			},
			create: {
				source: 'LUCKPERMS',
				reason,
				enabled: false,
				intervalSeconds: config.intervalSeconds,
			},
			update: {
				reason,
				enabled: false,
				intervalSeconds: config.intervalSeconds,
			},
		})
		return {
			serversRead: 0,
			rowsRead: 0,
			rowsMatched: 0,
			rowsChanged: 0,
			rowsSkipped: 0,
		}
	}

	if (
		options.onlyDue &&
		!(await shouldRunTask({
			source: 'LUCKPERMS',
			intervalSeconds: config.intervalSeconds,
		}))
	) {
		return {
			serversRead: 0,
			rowsRead: 0,
			rowsMatched: 0,
			rowsChanged: 0,
			rowsSkipped: 0,
		}
	}

	const result = await heavySyncDispatcher.enqueue(
		getExternalSyncLaneKey('LUCKPERMS'),
		taskKey,
		() =>
			runExternalSyncTask({
				taskKey,
				source: 'LUCKPERMS',
				enabled: config.enabled,
				intervalSeconds: config.intervalSeconds,
				reason,
				handler: () => syncLuckPermsSource(),
			}),
	)

	return result
		? { serversRead: 1, ...result }
		: {
				serversRead: 0,
				rowsRead: 0,
				rowsMatched: 0,
				rowsChanged: 0,
				rowsSkipped: 0,
			}
}

export const syncExternalSources = async (
	reason: ExternalSyncReason,
	options: { onlyDue?: boolean } = {},
): Promise<ExternalSyncResult> => {
	const authMe = await syncAuthMeSources(reason, options)
	const luckPerms = await syncLuckPermsSources(reason, options)

	return {
		serversRead: authMe.serversRead + luckPerms.serversRead,
		rowsRead: authMe.rowsRead + luckPerms.rowsRead,
		rowsMatched: authMe.rowsMatched + luckPerms.rowsMatched,
		rowsChanged: authMe.rowsChanged + luckPerms.rowsChanged,
		rowsSkipped: authMe.rowsSkipped + luckPerms.rowsSkipped,
	}
}

export const triggerAuthMeSyncForServer = async (input: {
	serverId: string
	reason: ExternalSyncReason
}): Promise<ExternalSyncTaskResult | null> => {
	const config = readAuthMeSourceConfig()

	if (!config.enabled) {
		return null
	}

	const taskKey = getExternalSyncTaskKey('AUTHME')

	return await heavySyncDispatcher.enqueue(
		getExternalSyncLaneKey('AUTHME'),
		taskKey,
		() =>
			runExternalSyncTask({
				taskKey,
				source: 'AUTHME',
				enabled: config.enabled,
				intervalSeconds: config.intervalSeconds,
				reason: input.reason,
				handler: () => syncAuthMeSource(),
			}),
	)
}

export const triggerLuckPermsSyncForServer = async (input: {
	serverId: string
	reason: ExternalSyncReason
}): Promise<ExternalSyncTaskResult | null> => {
	const config = readLuckPermsSourceConfig()

	if (!config.enabled) {
		return null
	}

	const taskKey = getExternalSyncTaskKey('LUCKPERMS')

	return await heavySyncDispatcher.enqueue(
		getExternalSyncLaneKey('LUCKPERMS'),
		taskKey,
		() =>
			runExternalSyncTask({
				taskKey,
				source: 'LUCKPERMS',
				enabled: config.enabled,
				intervalSeconds: config.intervalSeconds,
				reason: input.reason,
				handler: () => syncLuckPermsSource(),
			}),
	)
}

class ExternalSyncScheduler {
	private timer: ReturnType<typeof setInterval> | null = null
	private running = false

	start(): void {
		if (this.timer) {
			return
		}

		void this.tick('STARTUP')
		this.timer = setInterval(() => {
			void this.tick('SCHEDULED')
		}, CHECK_INTERVAL_MS)
	}

	stop(): void {
		if (!this.timer) {
			return
		}

		clearInterval(this.timer)
		this.timer = null
	}

	private async tick(reason: ExternalSyncReason): Promise<void> {
		if (this.running) {
			return
		}

		this.running = true

		try {
			await syncExternalSources(reason, { onlyDue: true })
		} finally {
			this.running = false
		}
	}
}

export const externalSyncScheduler = new ExternalSyncScheduler()
