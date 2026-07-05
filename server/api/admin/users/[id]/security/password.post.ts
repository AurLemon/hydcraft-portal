import { getRouterParam } from 'h3'
import { requireAdminUser } from '../../../../../utils/auth/session'
import { createBadRequestError } from '../../../../../utils/errors'
import { adminSetUserPassword } from '../../../../../utils/admin/users'

interface AdminSetUserPasswordBody {
	password?: string
}

export default defineEventHandler(async (event) => {
	const actingUser = await requireAdminUser(event)
	const body = await readBody<AdminSetUserPasswordBody>(event)

	if (!body.password) {
		throw createBadRequestError('FIELD_REQUIRED')
	}

	return await adminSetUserPassword({
		event,
		actingUser,
		userId: getRouterParam(event, 'id') ?? '',
		password: body.password,
	})
})
