import { requireAdminUser } from '../../../utils/auth/session'
import { createFriendLink } from '../../../utils/friend-links/service'

export default defineEventHandler(async (event) => {
	const actor = await requireAdminUser(event)
	const body = await readBody(event)

	return await createFriendLink(actor, body)
})
