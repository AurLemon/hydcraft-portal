import { getRouterParam } from 'h3'
import {
	findCurrentRefreshSession,
	requireAdminUser,
} from '../../../../../../utils/auth/session'
import { adminRevokeUserSession } from '../../../../../../utils/admin/users'

export default defineEventHandler(async (event) => {
	const actingUser = await requireAdminUser(event)
	const currentSession = await findCurrentRefreshSession(event)

	return await adminRevokeUserSession({
		event,
		actingUser,
		userId: getRouterParam(event, 'id') ?? '',
		sessionId: getRouterParam(event, 'sessionId') ?? '',
		currentSessionId: currentSession?.id,
	})
})
