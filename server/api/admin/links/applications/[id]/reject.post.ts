import { requireAdminUser } from '../../../../../utils/auth/session'
import { rejectFriendLinkApplication } from '../../../../../utils/friend-links/service'

export default defineEventHandler(async (event) => {
	const actor = await requireAdminUser(event)

	return await rejectFriendLinkApplication(
		actor,
		getRouterParam(event, 'id') || '',
	)
})
