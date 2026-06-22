import { requireAdminUser } from '../../../../../utils/auth/session'
import { approveFriendLinkApplication } from '../../../../../utils/friend-links/service'

export default defineEventHandler(async (event) => {
	const actor = await requireAdminUser(event)

	return await approveFriendLinkApplication(
		actor,
		getRouterParam(event, 'id') || '',
	)
})
