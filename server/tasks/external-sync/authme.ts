import { syncAuthMeSnapshots } from '../../utils/external-sync/authme'

export default defineTask({
	meta: {
		name: 'external-sync:authme',
		description: 'Read AuthMe MySQL data and upsert Portal snapshots.',
	},
	async run() {
		const result = await syncAuthMeSnapshots()

		return {
			result,
		}
	},
})
