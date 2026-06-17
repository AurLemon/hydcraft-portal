import { syncLuckPermsSources } from '../../utils/external-sync/orchestrator'

export default defineTask({
	meta: {
		name: 'external-sync:luckperms',
		description:
			'Sync the global LuckPerms MySQL source into player and group snapshots.',
	},
	async run() {
		const result = await syncLuckPermsSources('MANUAL')

		return {
			result,
		}
	},
})
