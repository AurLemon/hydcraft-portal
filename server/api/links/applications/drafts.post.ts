import { requireCurrentUser } from '../../../utils/auth/session'
import { createFriendLinkApplicationDraft } from '../../../utils/friend-links/service'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)

	return await createFriendLinkApplicationDraft(user)
})
