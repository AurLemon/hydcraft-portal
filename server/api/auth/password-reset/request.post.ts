import { normalizeMailLocale } from '../../../utils/auth/locale'
import { normalizeEmail } from '../../../utils/auth/validation'
import { createBadRequestError } from '../../../utils/errors'
import { validateTurnstileToken } from '../../../utils/security/turnstile'
import { TURNSTILE_ACTIONS } from '~/utils/security/turnstile-actions'
import {
	findPasswordResetUserByEmail,
	issuePasswordResetVerificationCode,
} from '../../../utils/security/password-reset'

interface PasswordResetRequestBody {
	email: string
	locale?: string
	captchaToken?: string
}

export default defineEventHandler(async (event) => {
	const body = await readBody<PasswordResetRequestBody>(event)
	const email = normalizeEmail(body.email)

	if (!email) {
		throw createBadRequestError('EMAIL_REQUIRED')
	}

	await validateTurnstileToken({
		event,
		token: body.captchaToken,
		action: TURNSTILE_ACTIONS.PASSWORD_RESET,
	})

	const user = await findPasswordResetUserByEmail(email)

	if (user) {
		await issuePasswordResetVerificationCode({
			event,
			user,
			email,
			locale: normalizeMailLocale(
				body.locale,
				user.preferences?.language ?? 'ZH_CN',
			),
		})
	}

	return {
		accepted: true,
	}
})
