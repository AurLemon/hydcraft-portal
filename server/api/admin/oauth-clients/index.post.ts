import { requireAdminUser } from '../../../utils/auth/session'
import { createOAuthClient } from '../../../utils/oauth-provider/service'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	return await createOAuthClient(await readBody(event))
})
