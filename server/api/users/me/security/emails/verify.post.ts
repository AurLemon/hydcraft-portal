import { prisma } from '../../../../../utils/db/prisma'
import { requireCurrentUser } from '../../../../../utils/auth/session'
import { createBadRequestError } from '../../../../../utils/errors'
import { consumeEmailVerificationCode } from '../../../../../utils/security/account-security'
import { recordSecurityEvent } from '../../../../../utils/security/security-events'

interface VerifyEmailBody {
	email: string
	code: string
}

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const body = await readBody<VerifyEmailBody>(event)

	if (!body.code) {
		throw createBadRequestError('EMAIL_VERIFICATION_CODE_REQUIRED')
	}

	const email = await consumeEmailVerificationCode(
		user.id,
		body.email,
		body.code,
		'VERIFY_EMAIL',
	)
	const verifiedAt = new Date()

	await prisma.$transaction(async (tx) => {
		await tx.userEmail.upsert({
			where: {
				email,
			},
			create: {
				userId: user.id,
				email,
				kind: 'PRIMARY',
				verifiedAt,
			},
			update: {
				verifiedAt,
			},
		})

		if (user.email === email) {
			await tx.user.update({
				where: {
					id: user.id,
				},
				data: {
					emailVerifiedAt: verifiedAt,
				},
			})
		}
	})

	await recordSecurityEvent({
		event,
		userId: user.id,
		type: 'EMAIL_VERIFIED',
		title: '邮箱已验证',
		description: email,
		metadata: {
			email,
		},
	})

	return {
		ok: true,
	}
})
