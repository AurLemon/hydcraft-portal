import { getRouterParam } from 'h3'
import { requireAdminUser } from '../../../../../utils/auth/session'
import {
	adminUnbindMinecraftAccountFromUser,
	getAdminUser,
} from '../../../../../utils/admin/users'

export default defineEventHandler(async (event) => {
	const actingUser = await requireAdminUser(event)
	const userId = getRouterParam(event, 'id') ?? ''
	const minecraftAccountId = getRouterParam(event, 'accountId') ?? ''

	await adminUnbindMinecraftAccountFromUser({
		actingUser,
		userId,
		minecraftAccountId,
	})

	return await getAdminUser(userId)
})
