import { getRouterParam } from 'h3'
import { requireAdminUser } from '../../../../utils/auth/session'
import { getAdminPartner } from '../../../../utils/partners/service'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)

	return await getAdminPartner(getRouterParam(event, 'id') ?? '')
})
