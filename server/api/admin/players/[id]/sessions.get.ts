import { getRouterParam } from 'h3'
import { getAdminMinecraftAccountSessionHistory } from '../../../../utils/admin/players'
import { requireAdminUser } from '../../../../utils/auth/session'
import { createApiError } from '../../../../utils/errors'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)

	const accountId = getRouterParam(event, 'id')?.trim() ?? ''

	if (!accountId) {
		throw createApiError({
			statusCode: 400,
			code: 'INVALID_REQUEST',
		})
	}

	const history = await getAdminMinecraftAccountSessionHistory(accountId)

	if (!history) {
		throw createApiError({
			statusCode: 404,
			code: 'MINECRAFT_ACCOUNT_NOT_FOUND',
		})
	}

	return history
})
