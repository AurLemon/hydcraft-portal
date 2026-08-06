import { requireAdminUser } from '../../../utils/auth/session'
import { createHistoricalMinecraftPlayer } from '../../../utils/admin/historical-player-creation'

interface CreateHistoricalPlayerBody {
	username?: string
}

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const body = await readBody<CreateHistoricalPlayerBody>(event)

	return await createHistoricalMinecraftPlayer({
		username: body.username ?? '',
	})
})
