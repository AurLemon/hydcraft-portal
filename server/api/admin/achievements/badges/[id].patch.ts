import { getRouterParam } from 'h3'
import { requireAdminUser } from '../../../../utils/auth/session'
import { updateAdminBadge } from '../../../../utils/admin/achievements'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const body = await readBody<Record<string, unknown>>(event)

	return await updateAdminBadge(getRouterParam(event, 'id') ?? '', body)
})
