import { getRouterParam } from 'h3'
import {
	findCurrentRefreshSession,
	requireAdminUser,
} from '../../../../../utils/auth/session'
import { getAdminUserSecurity } from '../../../../../utils/admin/users'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const currentSession = await findCurrentRefreshSession(event)

	return await getAdminUserSecurity(
		getRouterParam(event, 'id') ?? '',
		currentSession?.id,
	)
})
