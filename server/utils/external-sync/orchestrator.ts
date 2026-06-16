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
	serverId: string
	source: ExternalSyncSource
	intervalSeconds: number
	reason: ExternalSyncReason
	handler: () => Promise<ExternalSyncTaskResult>
}

const CHECK_INTERVAL_MS = 60_000
const MIN_INTERVAL_SECONDS = 60

const normalizeIntervalSeconds = (value: number): number =>
	Math.max(MIN_INTERVAL_SECONDS, Math.floor(value || 1800))

export const getExternalSyncTaskKey = (
	serverId: string,
	source: ExternalSyncSource,
): string => `${serverId}:${source.toLowerCase()}`

const shouldRunTask = async (input: {
	taskKey: string
	intervalSeconds: number
}): Promise<boolean> => {
	const state = await prisma.externalSyncTaskState.findUnique({
		where: {
			taskKey: input.taskKey,
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

export const runExternalSyncTask = async (
	input: ExternalSyncTaskInput,
): Promise<ExternalSyncTaskResult | null> => {
	const intervalSeconds = normalizeIntervalSeconds(input.intervalSeconds)
	const startedAt = new Date()
	await prisma.externalSyncTaskState.upsert({
		where: {
			taskKey: input.taskKey,
		},
		create: {
			taskKey: input.taskKey,
			serverId: input.serverId,
			source: input.source,
			reason: input.reason,
			running: false,
			intervalSeconds,
		},
		update: {
			serverId: input.serverId,
			source: input.source,
			reason: input.reason,
			intervalSeconds,
		},
	})

	const claimed = await prisma.externalSyncTaskState.updateMany({
		where: {
			taskKey: input.taskKey,
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
		serverId: input.serverId,
		source: input.source,
		reason: input.reason,
	})

	try {
		const result = await input.handler()
		const finishedAt = new Date()

		await prisma.externalSyncTaskState.update({
			where: {
				taskKey: input.taskKey,
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
			serverId: input.serverId,
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

		await prisma.externalSyncTaskState.update({
			where: {
				taskKey: input.taskKey,
			},
			data: {
				running: false,
				lastFinishedAt: finishedAt,
				lastError:
					error instanceof Error ? error.message : 'Unknown sync task error',
			},
		})

		logExternalSyncFailed({
			serverId: input.serverId,
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
	const configs = await prisma.authMeSourceConfig.findMany({
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
	let rowsRead = 0
	let rowsMatched = 0
	let rowsChanged = 0
	let rowsSkipped = 0
	let serversRead = 0

	for (const config of configs) {
		const taskKey = getExternalSyncTaskKey(
			config.minecraftServer.serverId,
			'AUTHME',
		)

		if (
			options.onlyDue &&
			!(await shouldRunTask({
				taskKey,
				intervalSeconds: config.syncIntervalSeconds,
			}))
		) {
			continue
		}

		const result = await heavySyncDispatcher.enqueue(
			config.minecraftServer.serverId,
			taskKey,
			() =>
				runExternalSyncTask({
					taskKey,
					serverId: config.minecraftServer.serverId,
					source: 'AUTHME',
					intervalSeconds: config.syncIntervalSeconds,
					reason,
					handler: () => syncAuthMeSource(config),
				}),
		)

		if (result) {
			serversRead += 1
			rowsRead += result.rowsRead
			rowsMatched += result.rowsMatched
			rowsChanged += result.rowsChanged
			rowsSkipped += result.rowsSkipped
		}
	}

	return { serversRead, rowsRead, rowsMatched, rowsChanged, rowsSkipped }
}

export const syncLuckPermsSources = async (
	reason: ExternalSyncReason,
	options: { onlyDue?: boolean } = {},
): Promise<ExternalSyncResult> => {
	const configs = await prisma.luckPermsSourceConfig.findMany({
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
	let rowsRead = 0
	let rowsMatched = 0
	let rowsChanged = 0
	let rowsSkipped = 0
	let serversRead = 0

	for (const config of configs) {
		const taskKey = getExternalSyncTaskKey(
			config.minecraftServer.serverId,
			'LUCKPERMS',
		)

		if (
			options.onlyDue &&
			!(await shouldRunTask({
				taskKey,
				intervalSeconds: config.syncIntervalSeconds,
			}))
		) {
			continue
		}

		const result = await heavySyncDispatcher.enqueue(
			config.minecraftServer.serverId,
			taskKey,
			() =>
				runExternalSyncTask({
					taskKey,
					serverId: config.minecraftServer.serverId,
					source: 'LUCKPERMS',
					intervalSeconds: config.syncIntervalSeconds,
					reason,
					handler: () => syncLuckPermsSource(config),
				}),
		)

		if (result) {
			serversRead += 1
			rowsRead += result.rowsRead
			rowsMatched += result.rowsMatched
			rowsChanged += result.rowsChanged
			rowsSkipped += result.rowsSkipped
		}
	}

	return { serversRead, rowsRead, rowsMatched, rowsChanged, rowsSkipped }
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
	const config = await prisma.authMeSourceConfig.findFirst({
		where: {
			minecraftServer: {
				serverId: input.serverId,
				enabled: true,
			},
			enabled: true,
		},
		include: {
			minecraftServer: {
				select: {
					serverId: true,
				},
			},
		},
	})

	if (!config) {
		return null
	}

	const taskKey = getExternalSyncTaskKey(input.serverId, 'AUTHME')

	return await heavySyncDispatcher.enqueue(input.serverId, taskKey, () =>
		runExternalSyncTask({
			taskKey,
			serverId: input.serverId,
			source: 'AUTHME',
			intervalSeconds: config.syncIntervalSeconds,
			reason: input.reason,
			handler: () => syncAuthMeSource(config),
		}),
	)
}

export const triggerLuckPermsSyncForServer = async (input: {
	serverId: string
	reason: ExternalSyncReason
}): Promise<ExternalSyncTaskResult | null> => {
	const config = await prisma.luckPermsSourceConfig.findFirst({
		where: {
			minecraftServer: {
				serverId: input.serverId,
				enabled: true,
			},
			enabled: true,
		},
		include: {
			minecraftServer: {
				select: {
					serverId: true,
				},
			},
		},
	})

	if (!config) {
		return null
	}

	const taskKey = getExternalSyncTaskKey(input.serverId, 'LUCKPERMS')

	return await heavySyncDispatcher.enqueue(input.serverId, taskKey, () =>
		runExternalSyncTask({
			taskKey,
			serverId: input.serverId,
			source: 'LUCKPERMS',
			intervalSeconds: config.syncIntervalSeconds,
			reason: input.reason,
			handler: () => syncLuckPermsSource(config),
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
