import type { EmailVerificationPurpose } from '~/generated/prisma/client'
import { requireCurrentUser } from '../../../../utils/auth/session'
import { assertEmail } from '../../../../utils/auth/validation'
import { prisma } from '../../../../utils/db/prisma'
import { createApiError } from '../../../../utils/errors'
import { sendEmailVerificationCode } from '../../../../utils/security/account-security'

interface RequestEmailVerificationBody {
	email: string
	purpose?: EmailVerificationPurpose
}

const resolvePurpose = (
	input: EmailVerificationPurpose | undefined,
): EmailVerificationPurpose => input ?? 'ADD_SECONDARY_EMAIL'

const EMAIL_PURPOSES: EmailVerificationPurpose[] = [
	'VERIFY_EMAIL',
	'CHANGE_PRIMARY_EMAIL',
	'ADD_SECONDARY_EMAIL',
]

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const body = await readBody<RequestEmailVerificationBody>(event)
	const email = assertEmail(body.email)
	const purpose = resolvePurpose(body.purpose)

	if (!EMAIL_PURPOSES.includes(purpose)) {
		throw createApiError({
			statusCode: 400,
			code: 'EMAIL_VERIFICATION_PURPOSE_INVALID',
		})
	}
	const existing = await prisma.userEmail.findUnique({
		where: {
			email,
		},
	})

	if (existing && existing.userId !== user.id) {
		throw createApiError({
			statusCode: 409,
			code: 'EMAIL_ALREADY_IN_USE',
		})
	}

	await prisma.userEmail.upsert({
		where: {
			email,
		},
		create: {
			userId: user.id,
			email,
			kind:
				purpose === 'CHANGE_PRIMARY_EMAIL' || purpose === 'VERIFY_EMAIL'
					? 'PRIMARY'
					: 'SECONDARY',
			verifiedAt: null,
		},
		update: {},
	})

	await sendEmailVerificationCode(
		event,
		user,
		email,
		purpose,
		user.preferences?.language ?? 'ZH_CN',
	)

	return {
		ok: true,
	}
})
