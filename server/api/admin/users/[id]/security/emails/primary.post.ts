import { getRouterParam } from 'h3'
import { requireAdminUser } from '../../../../../../utils/auth/session'
import { createApiError } from '../../../../../../utils/errors'
import { adminSetPrimaryEmail } from '../../../../../../utils/admin/users'

interface AdminSetPrimaryEmailBody {
	emailId?: string
}

export default defineEventHandler(async (event) => {
	const actingUser = await requireAdminUser(event)
	const body = await readBody<AdminSetPrimaryEmailBody>(event)

	if (!body.emailId) {
		throw createApiError({ statusCode: 400, code: 'EMAIL_ID_REQUIRED' })
	}

	return await adminSetPrimaryEmail({
		event,
		actingUser,
		userId: getRouterParam(event, 'id') ?? '',
		emailId: body.emailId,
	})
})
