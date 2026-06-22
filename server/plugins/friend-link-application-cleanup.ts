import { expireStaleFriendLinkApplications } from '../utils/friend-links/service'

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000

export default defineNitroPlugin(() => {
	if (import.meta.prerender) {
		return
	}

	const timer = setInterval(() => {
		void expireStaleFriendLinkApplications().catch((error) => {
			console.error('FRIEND_LINK_APPLICATION_CLEANUP_FAILED', error)
		})
	}, CLEANUP_INTERVAL_MS)

	if (typeof timer.unref === 'function') {
		timer.unref()
	}
})
