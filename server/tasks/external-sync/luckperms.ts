import { syncLuckPermsSnapshots } from '../../utils/external-sync/luckperms'

export default defineTask({
	meta: {
		name: 'external-sync:luckperms',
		description: 'Read LuckPerms MySQL data and upsert Portal snapshots.',
	},
	async run() {
		const result = await syncLuckPermsSnapshots()

		return {
			result,
		}
	},
})
