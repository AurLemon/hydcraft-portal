import { requireAdminUser } from '../../../../utils/auth/session'
import { getMinecraftServerOverview } from '../../../../utils/minecraft/server-overview'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const serverId = getRouterParam(event, 'serverId') ?? ''

	return getMinecraftServerOverview(serverId)
})
