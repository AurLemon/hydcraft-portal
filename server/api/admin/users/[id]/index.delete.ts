import { getRouterParam } from 'h3'
import { requireAdminUser } from '../../../../utils/auth/session'
import { adminDeleteUser } from '../../../../utils/admin/users'

export default defineEventHandler(async (event) => {
	const actingUser = await requireAdminUser(event)

	return await adminDeleteUser({
		actingUser,
		userId: getRouterParam(event, 'id') ?? '',
	})
})
