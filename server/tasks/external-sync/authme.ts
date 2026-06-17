import { syncAuthMeSources } from '../../utils/external-sync/orchestrator'

export default defineTask({
	meta: {
		name: 'external-sync:authme',
		description: 'Sync the global AuthMe MySQL source into account snapshots.',
	},
	async run() {
		const result = await syncAuthMeSources('MANUAL')

		return {
			result,
		}
	},
})
