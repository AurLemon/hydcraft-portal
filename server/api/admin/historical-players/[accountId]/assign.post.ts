import { getRouterParam } from 'h3'
import { requireAdminUser } from '../../../../utils/auth/session'
import { createBadRequestError } from '../../../../utils/errors'
import { adminAssignHistoricalAccountByUsername } from '../../../../utils/minecraft/historical-accounts'

interface AssignHistoricalAccountBody {
	username?: string
}

export default defineEventHandler(async (event) => {
	const actingUser = await requireAdminUser(event)
	const accountId = getRouterParam(event, 'accountId') ?? ''
	const body = await readBody<AssignHistoricalAccountBody>(event)

	if (!body.username?.trim()) {
		throw createBadRequestError('USERNAME_REQUIRED')
	}

	await adminAssignHistoricalAccountByUsername({
		actingUser,
		minecraftAccountId: accountId,
		username: body.username,
	})

	return {
		ok: true,
	}
})
