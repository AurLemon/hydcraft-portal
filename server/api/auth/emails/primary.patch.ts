import { requireCurrentUser } from '../../../utils/auth/session'
import { prisma } from '../../../utils/db/prisma'
import { createApiError } from '../../../utils/errors'
import { recordSecurityEvent } from '../../../utils/security/security-events'

interface ChangePrimaryEmailBody {
	emailId: string
}

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const body = await readBody<ChangePrimaryEmailBody>(event)

	if (!body.emailId) {
		throw createApiError({ statusCode: 400, code: 'EMAIL_ID_REQUIRED' })
	}

	const email = await prisma.userEmail.findFirst({
		where: {
			id: body.emailId,
			userId: user.id,
		},
	})

	if (!email) {
		throw createApiError({ statusCode: 404, code: 'EMAIL_NOT_FOUND' })
	}

	if (!email.verifiedAt) {
		throw createApiError({ statusCode: 400, code: 'EMAIL_NOT_VERIFIED' })
	}

	await prisma.$transaction(async (tx) => {
		await tx.userEmail.updateMany({
			where: {
				userId: user.id,
				kind: 'PRIMARY',
			},
			data: {
				kind: 'SECONDARY',
			},
		})
		await tx.userEmail.update({
			where: {
				id: email.id,
			},
			data: {
				kind: 'PRIMARY',
			},
		})
		await tx.user.update({
			where: {
				id: user.id,
			},
			data: {
				email: email.email,
				emailVerifiedAt: email.verifiedAt,
			},
		})
	})

	await recordSecurityEvent({
		event,
		userId: user.id,
		type: 'PRIMARY_EMAIL_CHANGED',
		title: 'Primary email changed',
		description: email.email,
		metadata: {
			emailId: email.id,
			email: email.email,
		},
	})

	return {
		ok: true,
		primaryEmail: email.email,
	}
})
