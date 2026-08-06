import { requireAdminUser } from '../../../utils/auth/session'
import { resolveOfflineMinecraftIdentity } from '../../../utils/admin/historical-player-creation'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const query = getQuery(event)

	return resolveOfflineMinecraftIdentity(
		typeof query.username === 'string' ? query.username : '',
	)
})
