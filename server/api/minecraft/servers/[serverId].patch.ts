import { requireAdminUser } from '../../../utils/auth/session'
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

	return { server: result.server }
})
