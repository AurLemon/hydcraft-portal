import {
	AFDIAN_EVENT_NAMES,
	afdianEventBus,
} from '~/server/utils/afdian/events'

const formatDuration = (durationMs: number): string => {
	return `${Math.max(0, Math.round(durationMs))}ms`
}

declare global {
	var __afdianLogListenersReady__: boolean | undefined
}

export default defineNitroPlugin(() => {
	if (globalThis.__afdianLogListenersReady__) {
		return
	}

	globalThis.__afdianLogListenersReady__ = true

	afdianEventBus.on(AFDIAN_EVENT_NAMES.REFRESH_REQUESTED, (payload) => {
		console.info(`[afdian] refresh start reason=${payload.reason}`)
	})

	afdianEventBus.on(AFDIAN_EVENT_NAMES.REFRESH_SUCCEEDED, (payload) => {
		console.info(
			`[afdian] refresh ok reason=${payload.reason} duration=${formatDuration(payload.durationMs)} supporters=${payload.supporterCount} total=${payload.totalAmount} asOf=${payload.asOfDate}`,
		)
	})

	afdianEventBus.on(AFDIAN_EVENT_NAMES.REFRESH_RETRIED, (payload) => {
		console.warn(
			`[afdian] refresh retry reason=${payload.reason} attempt=${payload.attempt}/${payload.maxAttempts} duration=${formatDuration(payload.durationMs)} error=${payload.errorMessage}`,
		)
	})

	afdianEventBus.on(AFDIAN_EVENT_NAMES.REFRESH_FAILED, (payload) => {
		console.error(
			`[afdian] refresh failed reason=${payload.reason} attempts=${payload.attempts} duration=${formatDuration(payload.durationMs)} error=${payload.finalErrorMessage}`,
		)
	})

	afdianEventBus.on(AFDIAN_EVENT_NAMES.CACHE_MISS, (payload) => {
		console.info(`[afdian] cache miss endpoint=${payload.endpoint}`)
	})
})
