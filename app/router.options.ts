import type { RouterConfig } from '@nuxt/schema'

const scrollPositions = new Map<string, number>()

const LOCALE_PREFIX_RE = /^\/(?:zh-CN|zh-TW|en-US)(?=\/|$)/

const getScrollKey = (fullPath: string | undefined): string => {
	const pathWithoutHash = (fullPath ?? '').split('#', 1)[0] ?? ''
	const normalizedPath = pathWithoutHash.replace(LOCALE_PREFIX_RE, '')

	return normalizedPath || '/'
}

export default <RouterConfig>{
	scrollBehavior(to, from, savedPosition) {
		if (savedPosition) {
			return savedPosition
		}

		if (import.meta.client) {
			scrollPositions.set(getScrollKey(from.fullPath), window.scrollY)
		}

		if (to.hash) {
			return { el: to.hash, behavior: 'smooth' }
		}

		if (import.meta.client) {
			const savedScroll = scrollPositions.get(getScrollKey(to.fullPath))

			if (savedScroll !== undefined) {
				return { left: 0, top: savedScroll }
			}
		}

		return { left: 0, top: 0 }
	},
}
