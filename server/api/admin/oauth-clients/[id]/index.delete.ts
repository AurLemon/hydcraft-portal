import { requireAdminUser } from '../../../../utils/auth/session'
import { deleteOAuthClient } from '../../../../utils/oauth-provider/service'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	await deleteOAuthClient(getRouterParam(event, 'id') ?? '')

	return { ok: true }
})
