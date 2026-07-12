import { requireAdminUser } from '../../../utils/auth/session'
import { emitEvent } from '../../../utils/events/event-bus'
import {
	type UpdateMinecraftServerInput,
	updateMinecraftServer,
} from '../../../utils/minecraft/server-management'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const serverId = getRouterParam(event, 'serverId') ?? ''
	const result = await updateMinecraftServer(
		serverId,
		await readBody<UpdateMinecraftServerInput>(event),
	)

	if (result.deletedPortalBridgeConfigId) {
		await emitEvent('minecraft-server.portal-bridge-config.deleted', {
			configId: result.deletedPortalBridgeConfigId,
		})
	}
	if (result.portalBridgeConfigId) {
		await emitEvent('minecraft-server.portal-bridge-config.saved', {
			configId: result.portalBridgeConfigId,
		})
	}

	return { server: result.server }
})
