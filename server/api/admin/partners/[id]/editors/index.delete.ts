import { getRouterParam } from 'h3'
import { requireAdminUser } from '../../../../../utils/auth/session'
import { revokePartnerEditor } from '../../../../../utils/partners/service'

export default defineEventHandler(async (event) => {
	const actor = await requireAdminUser(event)
	const body = await readBody(event)

	return await revokePartnerEditor(
		actor,
		getRouterParam(event, 'id') ?? '',
		body,
	)
})
