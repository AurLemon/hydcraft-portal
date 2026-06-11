import { prisma } from '../../../../../utils/db/prisma'
import { requireCurrentUser } from '../../../../../utils/auth/session'
import { createBadRequestError } from '../../../../../utils/errors'
import { consumeEmailVerificationCode } from '../../../../../utils/security/account-security'
import { recordSecurityEvent } from '../../../../../utils/security/security-events'

interface ChangePrimaryEmailBody {
	email: string
	code: string
}

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const body = await readBody<ChangePrimaryEmailBody>(event)

	if (!body.code) {
		throw createBadRequestError('EMAIL_VERIFICATION_CODE_REQUIRED')
	}

	const email = await consumeEmailVerificationCode(
		user.id,
		body.email,
		body.code,
		'CHANGE_PRIMARY_EMAIL',
	)
	const verifiedAt = new Date()

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
				userId: user.id,
				kind: 'PRIMARY',
				verifiedAt,
			},
		})
		await tx.user.update({
			where: {
				id: user.id,
			},
			data: {
				email,
				emailVerifiedAt: verifiedAt,
			},
		})
	})

	await recordSecurityEvent({
		event,
		userId: user.id,
		type: 'PRIMARY_EMAIL_CHANGED',
		title: '主邮箱已换绑',
		description: email,
		metadata: {
			email,
		},
	})

	return {
		ok: true,
	}
})
