import { getRouterParam } from 'h3'
import { requireAdminUser } from '../../../../utils/auth/session'
import { adminUnassignHistoricalAccount } from '../../../../utils/minecraft/historical-accounts'

export default defineEventHandler(async (event) => {
	const actingUser = await requireAdminUser(event)
	const accountId = getRouterParam(event, 'accountId') ?? ''

	await adminUnassignHistoricalAccount({
		actingUser,
		minecraftAccountId: accountId,
	})

	return {
		ok: true,
	}
})
