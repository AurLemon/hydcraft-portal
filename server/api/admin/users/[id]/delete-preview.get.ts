import { getRouterParam } from 'h3'
import { requireAdminUser } from '../../../../utils/auth/session'
import { previewAdminUserDeletion } from '../../../../utils/admin/users'

export default defineEventHandler(async (event) => {
	const actingUser = await requireAdminUser(event)

	return await previewAdminUserDeletion(
		actingUser,
		getRouterParam(event, 'id') ?? '',
	)
})
