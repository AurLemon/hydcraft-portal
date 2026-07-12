import { requireAdminUser } from '../../../utils/auth/session'
import { emitEvent } from '../../../utils/events/event-bus'
import {
	createMinecraftServer,
	type CreateMinecraftServerInput,
} from '../../../utils/minecraft/server-management'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const result = await createMinecraftServer(
		await readBody<CreateMinecraftServerInput>(event),
	)

	if (result.portalBridgeConfigId) {
		await emitEvent('minecraft-server.portal-bridge-config.saved', {
			configId: result.portalBridgeConfigId,
		})
	}

	return { server: result.server }
})
