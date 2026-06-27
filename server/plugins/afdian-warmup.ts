import { startAfdianAutoRefresh } from '~/server/utils/afdian/stats'

export default defineNitroPlugin(() => {
	if (import.meta.prerender) {
		return
	}

	startAfdianAutoRefresh()
})
