import { requireAdminUser } from '../../../../../utils/auth/session'
import { listServerPlayers } from '../../../../../utils/admin/server-players'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const serverId = getRouterParam(event, 'serverId') ?? ''
	const players = await listServerPlayers({
		serverId,
		page: 1,
		pageSize: 100,
	})

	return {
		identities: players.items,
	}
})
