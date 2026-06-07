import { portalBridgeManager } from '../utils/portal-bridge/client'

export default defineNitroPlugin(() => {
	void portalBridgeManager.startEnabled()
})
