import { getRouterParam } from 'h3'
import { requireAdminUser } from '../../../../../../utils/auth/session'
import { adminUnlinkOAuthConnection } from '../../../../../../utils/admin/users'

export default defineEventHandler(async (event) => {
	const actingUser = await requireAdminUser(event)

	return await adminUnlinkOAuthConnection({
		event,
		actingUser,
		userId: getRouterParam(event, 'id') ?? '',
		connectionId: getRouterParam(event, 'connectionId') ?? '',
	})
})
