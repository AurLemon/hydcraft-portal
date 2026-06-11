import { requireCurrentUser } from '~/server/utils/auth/session'
import { prisma } from '~/server/utils/db/prisma'
import { createApiError, createBadRequestError } from '~/server/utils/errors'
import { recordSecurityEvent } from '~/server/utils/security/security-events'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const id = getRouterParam(event, 'id')

	if (!id) {
		throw createBadRequestError('EMAIL_ID_REQUIRED')
	}

	const email = await prisma.userEmail.findFirst({
		where: {
			id,
			userId: user.id,
		},
	})

	if (!email) {
		throw createApiError({
			statusCode: 404,
			code: 'EMAIL_NOT_FOUND',
		})
	}

	if (email.kind === 'PRIMARY') {
		throw createBadRequestError('PRIMARY_EMAIL_CANNOT_BE_REMOVED')
	}

	await prisma.userEmail.delete({
		where: {
			id,
		},
	})
	await recordSecurityEvent({
		event,
		userId: user.id,
		type: 'SECONDARY_EMAIL_REMOVED',
		title: '副邮箱已移除',
		description: email.email,
		metadata: {
			email: email.email,
		},
	})

	return {
		ok: true,
	}
})
