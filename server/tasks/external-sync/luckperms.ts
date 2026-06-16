import { syncLuckPermsSources } from '../../utils/external-sync/orchestrator'

export default defineTask({
	meta: {
		name: 'external-sync:luckperms',
		description: 'Read per-server LuckPerms groups and enrich server players.',
	},
	async run() {
		const result = await syncLuckPermsSources('MANUAL')

		return {
			result,
		}
	},
})
