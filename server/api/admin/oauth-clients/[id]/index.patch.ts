import { requireAdminUser } from '../../../../utils/auth/session'
import { updateOAuthClient } from '../../../../utils/oauth-provider/service'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	return await updateOAuthClient(
		getRouterParam(event, 'id') ?? '',
		await readBody(event),
	)
})
