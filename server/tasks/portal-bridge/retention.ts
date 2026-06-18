import { runPortalBridgeRetention } from '../../utils/portal-bridge/retention'

export default defineTask({
	meta: {
		name: 'portal-bridge:retention',
		description:
			'Prune append-only PortalBridge message receipts, terminal commands, and server snapshots beyond their retention windows.',
	},
	async run() {
		const result = await runPortalBridgeRetention()

		return {
			result,
		}
	},
})
