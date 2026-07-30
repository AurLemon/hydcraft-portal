import type { RouterConfig } from '@nuxt/schema'
import {
	clearPendingScrollRestore,
	getScrollRouteKey,
	getScrollSnapshot,
	isHomeScrollPath,
	normalizeScrollPath,
	queueAbsoluteScrollRestore,
	queueProgressScrollRestore,
	saveScrollSnapshot,
} from '../utils/scroll'

const HASH_SCROLL_RETRY_INTERVAL_MS = 50
const HASH_SCROLL_TIMEOUT_MS = 2000
const HASH_SCROLL_HEADER_GAP_PX = 24

const waitForHashScrollPosition = async (hash: string) => {
	if (!import.meta.client) {
		return { el: hash, behavior: 'smooth' as const }
	}

	const targetId = decodeURIComponent(hash.slice(1))
	const expiresAt = window.performance.now() + HASH_SCROLL_TIMEOUT_MS
	let target = document.getElementById(targetId)

	while (!target && window.performance.now() < expiresAt) {
		await new Promise<void>((resolve) => {
			window.setTimeout(resolve, HASH_SCROLL_RETRY_INTERVAL_MS)
		})
		target = document.getElementById(targetId)
	}

	if (!target) {
		return { el: hash, behavior: 'smooth' as const }
	}

	const header = document.querySelector<HTMLElement>('[data-page-header]')
	const headerHeight = header?.getBoundingClientRect().height ?? 0

	return {
		left: 0,
		top: Math.max(
			window.scrollY +
				target.getBoundingClientRect().top -
				headerHeight -
				HASH_SCROLL_HEADER_GAP_PX,
			0,
		),
		behavior: 'smooth' as const,
	}
}

export default <RouterConfig>{
	scrollBehavior(to, from, savedPosition) {
		if (savedPosition) {
			clearPendingScrollRestore()
			return savedPosition
		}

		if (to.hash) {
			clearPendingScrollRestore()
			return waitForHashScrollPosition(to.hash)
		}

		if (!import.meta.client) {
			return { left: 0, top: 0 }
		}

		saveScrollSnapshot(from.fullPath)

		if (isHomeScrollPath(to.fullPath)) {
			clearPendingScrollRestore()
			return { left: 0, top: 0 }
		}

		const fromNormalizedPath = normalizeScrollPath(from.fullPath)
		const toNormalizedPath = normalizeScrollPath(to.fullPath)
		const isLocaleSwitchWithinSamePage =
			fromNormalizedPath === toNormalizedPath &&
			getScrollRouteKey(from.fullPath) !== getScrollRouteKey(to.fullPath)

		if (isLocaleSwitchWithinSamePage) {
			const fromSnapshot = getScrollSnapshot(from.fullPath)

			if (fromSnapshot) {
				queueProgressScrollRestore(to.fullPath, fromSnapshot.progress)
				return { left: 0, top: fromSnapshot.top }
			}
		}

		const savedSnapshot = getScrollSnapshot(to.fullPath)

		if (savedSnapshot) {
			queueAbsoluteScrollRestore(to.fullPath, savedSnapshot.top)
			return false
		}

		clearPendingScrollRestore()
		return { left: 0, top: 0 }
	},
}
