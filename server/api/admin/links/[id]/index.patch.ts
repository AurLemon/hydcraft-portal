import { requireAdminUser } from '../../../../utils/auth/session'
import { updateFriendLink } from '../../../../utils/friend-links/service'

export default defineEventHandler(async (event) => {
	const actor = await requireAdminUser(event)
	const body = await readBody(event)

	return await updateFriendLink(actor, getRouterParam(event, 'id') || '', body)
})
