import { syncAuthMeSources } from '../../utils/external-sync/orchestrator'

export default defineTask({
	meta: {
		name: 'external-sync:authme',
		description: 'Read per-server AuthMe MySQL data and enrich server players.',
	},
	async run() {
		const result = await syncAuthMeSources('MANUAL')

		return {
			result,
		}
	},
})
