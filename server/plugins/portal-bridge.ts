import { onEvent } from '../utils/events/event-bus'
import { portalBridgeManager } from '../utils/portal-bridge/client'

export default defineNitroPlugin(() => {
	if (
		import.meta.prerender ||
		process.env.HYDCRAFT_DISABLE_PORTAL_BRIDGE === '1'
	) {
		return
	}

	void portalBridgeManager.startEnabled()
	onEvent('minecraft-server.lifecycle.updated', (payload) => {
		void portalBridgeManager.refreshForServer(payload.serverId)
	})
})
