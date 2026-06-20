import { getRouterParam } from 'h3'
import { requireAdminUser } from '../../../../../utils/auth/session'
import {
	adminSetPrimaryMinecraftAccount,
	getAdminUser,
} from '../../../../../utils/admin/users'
import { createBadRequestError } from '../../../../../utils/errors'

interface AdminUpdateMinecraftAccountBody {
	isPrimary?: boolean
}

export default defineEventHandler(async (event) => {
	const actingUser = await requireAdminUser(event)
	const userId = getRouterParam(event, 'id') ?? ''
	const minecraftAccountId = getRouterParam(event, 'accountId') ?? ''
	const body = await readBody<AdminUpdateMinecraftAccountBody>(event)

	if (!body.isPrimary) {
		throw createBadRequestError('MINECRAFT_PRIMARY_ACCOUNT_REQUIRED')
	}

	await adminSetPrimaryMinecraftAccount({
		actingUser,
		userId,
		minecraftAccountId,
	})

	return await getAdminUser(userId)
})
