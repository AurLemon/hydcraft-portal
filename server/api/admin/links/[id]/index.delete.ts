import { requireAdminUser } from '../../../../utils/auth/session'
import { deleteFriendLink } from '../../../../utils/friend-links/service'

export default defineEventHandler(async (event) => {
	const actor = await requireAdminUser(event)

	await deleteFriendLink(actor, getRouterParam(event, 'id') || '')

	return {
		ok: true,
	}
})
