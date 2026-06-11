import { prisma } from '../../../../../utils/db/prisma'
import { requireCurrentUser } from '../../../../../utils/auth/session'
import { createBadRequestError } from '../../../../../utils/errors'
import { consumeEmailVerificationCode } from '../../../../../utils/security/account-security'
import { recordSecurityEvent } from '../../../../../utils/security/security-events'

interface AddSecondaryEmailBody {
	email: string
	code: string
}

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const body = await readBody<AddSecondaryEmailBody>(event)

	if (!body.code) {
		throw createBadRequestError('EMAIL_VERIFICATION_CODE_REQUIRED')
	}

	const email = await consumeEmailVerificationCode(
		user.id,
		body.email,
		body.code,
		'ADD_SECONDARY_EMAIL',
	)
	const verifiedAt = new Date()

	await prisma.userEmail.upsert({
		where: {
			email,
		},
		create: {
			userId: user.id,
			email,
			kind: 'SECONDARY',
			verifiedAt,
		},
		update: {
			userId: user.id,
			kind: 'SECONDARY',
			verifiedAt,
		},
	})

	await recordSecurityEvent({
		event,
		userId: user.id,
		type: 'SECONDARY_EMAIL_ADDED',
		title: '副邮箱已绑定',
		description: email,
		metadata: {
			email,
		},
	})

	return {
		ok: true,
	}
})
