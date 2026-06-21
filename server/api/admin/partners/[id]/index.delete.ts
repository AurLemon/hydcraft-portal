import { getRouterParam } from 'h3'
import { requireAdminUser } from '../../../../utils/auth/session'
import { disablePartner } from '../../../../utils/partners/service'

export default defineEventHandler(async (event) => {
	const actor = await requireAdminUser(event)

	return await disablePartner(actor, getRouterParam(event, 'id') ?? '')
})
