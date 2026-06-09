import { requireAdminUser } from '../../../utils/auth/session'
import { createAdminBadge } from '../../../utils/admin/achievements'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const body = await readBody<Record<string, unknown>>(event)

	return await createAdminBadge(body)
})
