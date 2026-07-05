import { requireAdminUser } from '../../../utils/auth/session'
import { reorderFriendLinks } from '../../../utils/friend-links/service'

export default defineEventHandler(async (event) => {
	const actor = await requireAdminUser(event)
	const body = await readBody(event)

	return await reorderFriendLinks(actor, body)
})
