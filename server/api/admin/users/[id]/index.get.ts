import { getRouterParam } from 'h3'
import { requireAdminUser } from '../../../../utils/auth/session'
import { getAdminUser } from '../../../../utils/admin/users'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)

	return await getAdminUser(getRouterParam(event, 'id') ?? '')
})
