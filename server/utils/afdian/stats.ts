import type { AfdianSponsorStatsResponse } from '~/utils/server/afdian'
import {
	cleanupManagedCache,
	readManagedCache,
	refreshManagedCache,
} from '~/server/utils/memory-cache-manager'
import { fetchAfdianSponsorStats } from './client'
import { AFDIAN_EVENT_NAMES, afdianEventBus } from './events'
import { isAfdianRuntimeConfigured } from './runtime'

const AFDIAN_CACHE_NAMESPACE = 'afdian'
const AFDIAN_CACHE_KEY = 'sponsor-stats'
const AFDIAN_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const AFDIAN_MAX_CACHE_ENTRIES = 4

const toErrorMessage = (error: unknown): string => {
	return error instanceof Error ? error.message : String(error)
}

const createEmptyStats = (): AfdianSponsorStatsResponse | null => {
	return null
}

const refreshAfdianSponsorStats = async (options: {
	reason: 'startup' | 'scheduled' | 'cache-miss'
	silent?: boolean
	startedAt?: number
}): Promise<void> => {
	const startedAt = options.startedAt ?? Date.now()

	await refreshManagedCache({
		namespace: AFDIAN_CACHE_NAMESPACE,
		key: AFDIAN_CACHE_KEY,
		loader: async () => await fetchAfdianSponsorStats(),
		ttlMs: AFDIAN_CACHE_TTL_MS,
		silent: options.silent,
		maxEntries: AFDIAN_MAX_CACHE_ENTRIES,
	})

	const cached = readManagedCache<AfdianSponsorStatsResponse>({
		namespace: AFDIAN_CACHE_NAMESPACE,
		key: AFDIAN_CACHE_KEY,
	})
	if (!cached.entry) {
		throw new Error('AFDIAN_CACHE_WRITE_FAILED')
	}

	afdianEventBus.emit(AFDIAN_EVENT_NAMES.REFRESH_SUCCEEDED, {
		reason: options.reason,
		asOfDate: cached.entry.data.asOfDate,
		nextRefreshAt: new Date(Date.now() + AFDIAN_CACHE_TTL_MS).toISOString(),
		durationMs: Date.now() - startedAt,
		supporterCount: cached.entry.data.supporterCount,
		totalAmount: cached.entry.data.totalAmount,
	})
}

const refreshAfdianSponsorStatsWithRetry = async (options: {
	reason: 'startup' | 'scheduled' | 'cache-miss'
	maxAttempts: number
	silent?: boolean
}): Promise<boolean> => {
	let lastError: unknown = null
	const startedAt = Date.now()

	afdianEventBus.emit(AFDIAN_EVENT_NAMES.REFRESH_REQUESTED, {
		reason: options.reason,
		at: new Date().toISOString(),
	})

	for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
		const attemptStartedAt = Date.now()
		try {
			await refreshAfdianSponsorStats({
				reason: options.reason,
				silent: options.silent,
				startedAt: attemptStartedAt,
			})
			return true
		} catch (error) {
			lastError = error
			if (attempt < options.maxAttempts) {
				afdianEventBus.emit(AFDIAN_EVENT_NAMES.REFRESH_RETRIED, {
					reason: options.reason,
					attempt,
					maxAttempts: options.maxAttempts,
					errorMessage: toErrorMessage(error),
					durationMs: Date.now() - attemptStartedAt,
					at: new Date().toISOString(),
				})
			}
		}
	}

	afdianEventBus.emit(AFDIAN_EVENT_NAMES.REFRESH_FAILED, {
		reason: options.reason,
		attempts: options.maxAttempts,
		finalErrorMessage: toErrorMessage(lastError),
		durationMs: Date.now() - startedAt,
		at: new Date().toISOString(),
	})

	if (!options.silent) {
		console.error(
			'[afdian] refresh failed after retries',
			toErrorMessage(lastError),
		)
	}

	return false
}

export const getPublicAfdianSponsorStats =
	async (): Promise<AfdianSponsorStatsResponse | null> => {
		if (!isAfdianRuntimeConfigured()) {
			return null
		}

		const now = Date.now()
		cleanupManagedCache({
			namespace: AFDIAN_CACHE_NAMESPACE,
			now,
			keepKey: AFDIAN_CACHE_KEY,
			maxEntries: AFDIAN_MAX_CACHE_ENTRIES,
		})

		const cached = readManagedCache<AfdianSponsorStatsResponse>({
			namespace: AFDIAN_CACHE_NAMESPACE,
			key: AFDIAN_CACHE_KEY,
			now,
		})

		if (cached.isFresh && cached.entry) {
			return cached.entry.data
		}

		if (cached.entry) {
			void refreshAfdianSponsorStatsWithRetry({
				reason: 'scheduled',
				maxAttempts: 1,
				silent: true,
			})
			return cached.entry.data
		}

		afdianEventBus.emit(AFDIAN_EVENT_NAMES.CACHE_MISS, {
			endpoint: '/api/public/server/afdian',
			at: new Date().toISOString(),
		})

		const loaded = await refreshAfdianSponsorStatsWithRetry({
			reason: 'cache-miss',
			maxAttempts: 1,
			silent: true,
		})

		if (loaded) {
			const afterLoad = readManagedCache<AfdianSponsorStatsResponse>({
				namespace: AFDIAN_CACHE_NAMESPACE,
				key: AFDIAN_CACHE_KEY,
			})
			if (afterLoad.entry) {
				return afterLoad.entry.data
			}
		}

		return createEmptyStats()
	}

export const warmupAfdianSponsorStats = async (): Promise<void> => {
	if (!isAfdianRuntimeConfigured()) {
		return
	}

	await refreshAfdianSponsorStatsWithRetry({
		reason: 'startup',
		maxAttempts: 3,
		silent: true,
	})
}

declare global {
	var __afdianRefreshTimer__: NodeJS.Timeout | undefined
}

export const startAfdianAutoRefresh = (): void => {
	if (globalThis.__afdianRefreshTimer__) {
		return
	}

	if (!isAfdianRuntimeConfigured()) {
		return
	}

	void warmupAfdianSponsorStats()
	globalThis.__afdianRefreshTimer__ = setInterval(() => {
		void refreshAfdianSponsorStatsWithRetry({
			reason: 'scheduled',
			maxAttempts: 1,
			silent: true,
		})
	}, AFDIAN_CACHE_TTL_MS)
}
