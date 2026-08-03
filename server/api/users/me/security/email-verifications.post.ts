import type { EmailVerificationPurpose } from '~/generated/prisma/client'
import { normalizeMailLocale } from '../../../../utils/auth/locale'
import { requireCurrentUser } from '../../../../utils/auth/session'
import { createBadRequestError } from '../../../../utils/errors'
import { sendEmailVerificationCode } from '../../../../utils/security/account-security'
import { validateTurnstileToken } from '../../../../utils/security/turnstile'
import { TURNSTILE_ACTIONS } from '~/utils/security/turnstile-actions'

interface SendEmailVerificationBody {
	email: string
	purpose: EmailVerificationPurpose
	locale?: string
	captchaToken?: string
}

const purposes: EmailVerificationPurpose[] = [
	'VERIFY_EMAIL',
	'CHANGE_PRIMARY_EMAIL',
	'ADD_SECONDARY_EMAIL',
]

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const body = await readBody<SendEmailVerificationBody>(event)

	if (!purposes.includes(body.purpose)) {
		throw createBadRequestError('EMAIL_VERIFICATION_PURPOSE_INVALID')
	}

	await validateTurnstileToken({
		event,
		token: body.captchaToken,
		action: TURNSTILE_ACTIONS.ACCOUNT_EMAIL_VERIFICATION,
	})

	await sendEmailVerificationCode(
		event,
		user,
		body.email,
		body.purpose,
		normalizeMailLocale(body.locale, user.preferences?.language ?? 'ZH_CN'),
	)

	return {
		ok: true,
	}
})
