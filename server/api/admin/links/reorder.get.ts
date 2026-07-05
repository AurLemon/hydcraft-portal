import { requireAdminUser } from '../../../utils/auth/session'
import { listAdminFriendLinksForReorder } from '../../../utils/friend-links/service'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)

	return await listAdminFriendLinksForReorder()
})
