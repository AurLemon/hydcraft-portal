import { requireCurrentUser } from '../../../../utils/auth/session'
import { prisma } from '../../../../utils/db/prisma'
import { createApiError } from '../../../../utils/errors'
import { recordSecurityEvent } from '../../../../utils/security/security-events'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const emailId = getRouterParam(event, 'id')

	if (!emailId) {
		throw createApiError({ statusCode: 400, code: 'EMAIL_ID_REQUIRED' })
	}

	const email = await prisma.userEmail.findFirst({
		where: {
			id: emailId,
			userId: user.id,
		},
	})

	if (!email) {
		throw createApiError({ statusCode: 404, code: 'EMAIL_NOT_FOUND' })
	}

	if (email.kind === 'PRIMARY' || email.email === user.email) {
		throw createApiError({ statusCode: 400, code: 'PRIMARY_EMAIL_REQUIRED' })
	}

	await prisma.userEmail.delete({
		where: {
			id: email.id,
		},
	})

	await recordSecurityEvent({
		event,
		userId: user.id,
		type: 'SECONDARY_EMAIL_REMOVED',
		title: 'Secondary email removed',
		description: email.email,
		metadata: {
			emailId: email.id,
			email: email.email,
		},
	})

	return {
		ok: true,
	}
})
