import { getRouterParam } from 'h3'
import {
	findCurrentRefreshSession,
	requireAdminUser,
} from '../../../../../../utils/auth/session'
import { adminRevokeAllUserSessions } from '../../../../../../utils/admin/users'

export default defineEventHandler(async (event) => {
	const actingUser = await requireAdminUser(event)
	const currentSession = await findCurrentRefreshSession(event)

	return await adminRevokeAllUserSessions({
		event,
		actingUser,
		userId: getRouterParam(event, 'id') ?? '',
		currentSessionId: currentSession?.id,
	})
})
