import { getRouterParam } from 'h3'
import { requireCurrentUser } from '../../../utils/auth/session'
import { updatePartnerProfile } from '../../../utils/partners/service'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const body = await readBody(event)

	return await updatePartnerProfile(
		user,
		getRouterParam(event, 'id') ?? '',
		body,
	)
})
