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
	onEvent('minecraft-server.portal-bridge-config.saved', (payload) => {
		void portalBridgeManager.refresh(payload.configId)
	})
	onEvent('minecraft-server.portal-bridge-config.deleted', (payload) => {
		portalBridgeManager.disconnect(payload.configId)
	})
})
