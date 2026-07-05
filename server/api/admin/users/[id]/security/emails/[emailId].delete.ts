import { getRouterParam } from 'h3'
import { requireAdminUser } from '../../../../../../utils/auth/session'
import { adminDeleteSecondaryEmail } from '../../../../../../utils/admin/users'

export default defineEventHandler(async (event) => {
	const actingUser = await requireAdminUser(event)

	return await adminDeleteSecondaryEmail({
		event,
		actingUser,
		userId: getRouterParam(event, 'id') ?? '',
		emailId: getRouterParam(event, 'emailId') ?? '',
	})
})
