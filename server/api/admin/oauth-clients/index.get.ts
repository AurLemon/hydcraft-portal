import { requireAdminUser } from '../../../utils/auth/session'
import { listOAuthClients } from '../../../utils/oauth-provider/service'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	return { items: await listOAuthClients() }
})
