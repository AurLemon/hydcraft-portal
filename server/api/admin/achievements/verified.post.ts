import { requireAdminUser } from '../../../utils/auth/session'
import { configureAdminVerified } from '../../../utils/admin/achievements'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const body = await readBody<Record<string, unknown>>(event)

	return await configureAdminVerified(body)
})
