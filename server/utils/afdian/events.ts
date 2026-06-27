import { EventEmitter } from 'node:events'

export const AFDIAN_EVENT_NAMES = {
	REFRESH_REQUESTED: 'afdian.refresh.requested',
	REFRESH_RETRIED: 'afdian.refresh.retried',
	REFRESH_SUCCEEDED: 'afdian.refresh.succeeded',
	REFRESH_FAILED: 'afdian.refresh.failed',
	CACHE_MISS: 'afdian.cache.miss',
} as const

export interface AfdianRefreshRequestedEvent {
	reason: 'startup' | 'scheduled' | 'cache-miss'
	at: string
}

export interface AfdianRefreshRetriedEvent {
	reason: 'startup' | 'scheduled' | 'cache-miss'
	attempt: number
	maxAttempts: number
	errorMessage: string
	durationMs: number
	at: string
}

export interface AfdianRefreshSucceededEvent {
	reason: 'startup' | 'scheduled' | 'cache-miss'
	asOfDate: string
	nextRefreshAt: string
	durationMs: number
	supporterCount: number
	totalAmount: string
}

export interface AfdianRefreshFailedEvent {
	reason: 'startup' | 'scheduled' | 'cache-miss'
	attempts: number
	finalErrorMessage: string
	durationMs: number
	at: string
}

export interface AfdianCacheMissEvent {
	endpoint: '/api/public/server/afdian'
	at: string
}

interface AfdianEventMap {
	[AFDIAN_EVENT_NAMES.REFRESH_REQUESTED]: AfdianRefreshRequestedEvent
	[AFDIAN_EVENT_NAMES.REFRESH_RETRIED]: AfdianRefreshRetriedEvent
	[AFDIAN_EVENT_NAMES.REFRESH_SUCCEEDED]: AfdianRefreshSucceededEvent
	[AFDIAN_EVENT_NAMES.REFRESH_FAILED]: AfdianRefreshFailedEvent
	[AFDIAN_EVENT_NAMES.CACHE_MISS]: AfdianCacheMissEvent
}

class AfdianEventBus extends EventEmitter {
	override emit<K extends keyof AfdianEventMap>(
		eventName: K,
		payload: AfdianEventMap[K],
	) {
		return super.emit(eventName, payload)
	}

	override on<K extends keyof AfdianEventMap>(
		eventName: K,
		listener: (payload: AfdianEventMap[K]) => void | Promise<void>,
	) {
		return super.on(eventName, listener)
	}
}

declare global {
	var __afdianEventBus__: AfdianEventBus | undefined
}

export const afdianEventBus =
	globalThis.__afdianEventBus__ ?? new AfdianEventBus()

if (!globalThis.__afdianEventBus__) {
	globalThis.__afdianEventBus__ = afdianEventBus
}
