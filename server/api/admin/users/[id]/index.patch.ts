import { getRouterParam } from 'h3'
import { requireAdminUser } from '../../../../utils/auth/session'
import { updateAdminUser } from '../../../../utils/admin/users'

export default defineEventHandler(async (event) => {
	const actingUser = await requireAdminUser(event)
	const body = await readBody(event)

	return await updateAdminUser(
		actingUser,
		getRouterParam(event, 'id') ?? '',
		body,
	)
})
