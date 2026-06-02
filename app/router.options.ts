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

export default <RouterConfig>{
	scrollBehavior(to, from, savedPosition) {
		if (savedPosition) {
			clearPendingScrollRestore()
			return savedPosition
		}

		if (to.hash) {
			clearPendingScrollRestore()
			return { el: to.hash, behavior: 'smooth' }
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
				return false
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
