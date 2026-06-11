import type { EmailVerificationPurpose } from '~/generated/prisma/client'
import { requireCurrentUser } from '../../../../utils/auth/session'
import { assertEmail } from '../../../../utils/auth/validation'
import { prisma } from '../../../../utils/db/prisma'
import { createApiError } from '../../../../utils/errors'
import { consumeEmailVerificationCode } from '../../../../utils/security/account-security'
import { recordSecurityEvent } from '../../../../utils/security/security-events'

interface ConfirmEmailVerificationBody {
	email: string
	code: string
	purpose?: EmailVerificationPurpose
}

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const body = await readBody<ConfirmEmailVerificationBody>(event)
	const email = assertEmail(body.email)
	const code = body.code?.trim()
	const purpose = body.purpose ?? 'ADD_SECONDARY_EMAIL'

	if (!code) {
		throw createApiError({
			statusCode: 400,
			code: 'EMAIL_VERIFICATION_CODE_REQUIRED',
		})
	}

	const verifiedEmail = await consumeEmailVerificationCode(
		user.id,
		email,
		code,
		purpose,
	)
	const now = new Date()
	const nextKind =
		purpose === 'CHANGE_PRIMARY_EMAIL' || purpose === 'VERIFY_EMAIL'
			? 'PRIMARY'
			: 'SECONDARY'

	const emailRecord = await prisma.$transaction(async (tx) => {
		const current = await tx.userEmail.upsert({
			where: {
				email: verifiedEmail,
			},
			create: {
				userId: user.id,
				email: verifiedEmail,
				kind: nextKind,
				verifiedAt: now,
			},
			update: {
				verifiedAt: now,
			},
		})

		if (nextKind === 'PRIMARY') {
			await tx.userEmail.updateMany({
				where: {
					userId: user.id,
					id: {
						not: current.id,
					},
					kind: 'PRIMARY',
				},
				data: {
					kind: 'SECONDARY',
				},
			})
			await tx.userEmail.update({
				where: {
					id: current.id,
				},
				data: {
					kind: 'PRIMARY',
					verifiedAt: now,
				},
			})
			await tx.user.update({
				where: {
					id: user.id,
				},
				data: {
					email: verifiedEmail,
					emailVerifiedAt: now,
				},
			})
		}

		return current
	})

	await recordSecurityEvent({
		event,
		userId: user.id,
		type: nextKind === 'PRIMARY' ? 'PRIMARY_EMAIL_CHANGED' : 'EMAIL_VERIFIED',
		title:
			nextKind === 'PRIMARY'
				? 'Primary email changed'
				: 'Email address verified',
		description: verifiedEmail,
		metadata: {
			email: verifiedEmail,
			emailId: emailRecord.id,
			purpose,
		},
	})

	return {
		ok: true,
		email: {
			id: emailRecord.id,
			email: verifiedEmail,
			kind: nextKind,
			verifiedAt: now,
		},
	}
})
