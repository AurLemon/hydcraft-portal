import { getRouterParam } from 'h3'
import { requireAdminUser } from '../../../../../utils/auth/session'
import {
	adminBindMinecraftAccountToUser,
	getAdminUser,
} from '../../../../../utils/admin/users'

interface AdminBindMinecraftAccountBody {
	username?: string
}

export default defineEventHandler(async (event) => {
	const actingUser = await requireAdminUser(event)
	const userId = getRouterParam(event, 'id') ?? ''
	const body = await readBody<AdminBindMinecraftAccountBody>(event)

	await adminBindMinecraftAccountToUser({
		actingUser,
		userId,
		username: body.username ?? '',
	})

	return await getAdminUser(userId)
})
