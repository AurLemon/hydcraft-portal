import { getRouterParam } from 'h3'
import { requireAdminUser } from '../../../../utils/auth/session'
import { updatePartner } from '../../../../utils/partners/service'

export default defineEventHandler(async (event) => {
	const actor = await requireAdminUser(event)
	const body = await readBody(event)

	return await updatePartner(actor, getRouterParam(event, 'id') ?? '', body)
})
