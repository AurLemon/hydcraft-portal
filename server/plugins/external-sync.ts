import { externalSyncScheduler } from '../utils/external-sync/orchestrator'

export default defineNitroPlugin(() => {
	if (
		import.meta.prerender ||
		process.env.HYDCRAFT_DISABLE_EXTERNAL_SYNC === '1'
	) {
		return
	}

	externalSyncScheduler.start()
})
