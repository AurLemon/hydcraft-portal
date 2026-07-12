import {
	drainPostCommitEvents,
	schedulePostCommitEventDrain,
} from '../utils/events/post-commit'

const DISPATCH_INTERVAL_MS = 30_000

export default defineNitroPlugin(() => {
	if (import.meta.prerender) {
		return
	}

	const timer = setInterval(() => {
		schedulePostCommitEventDrain()
	}, DISPATCH_INTERVAL_MS)

	if (typeof timer.unref === 'function') {
		timer.unref()
	}

	void drainPostCommitEvents().catch((error) => {
		console.error('POST_COMMIT_EVENT_STARTUP_DRAIN_FAILED', error)
	})
})
