import { requireCurrentUser } from '../../../../utils/auth/session'
import { createBadRequestError } from '../../../../utils/errors'
import { validateTurnstileToken } from '../../../../utils/security/turnstile'
import { TURNSTILE_ACTIONS } from '~/utils/security/turnstile-actions'
import { issuePasswordResetVerificationCode } from '../../../../utils/security/password-reset'

interface PasswordResetRequestBody {
	captchaToken?: string
}

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const body = await readBody<PasswordResetRequestBody>(event)

	if (!user.email) {
		throw createBadRequestError('EMAIL_REQUIRED')
	}

	await validateTurnstileToken({
		event,
		token: body.captchaToken,
		action: TURNSTILE_ACTIONS.ACCOUNT_PASSWORD_RESET,
	})

	return await issuePasswordResetVerificationCode({
		event,
		user: {
			id: user.id,
			handle: user.handle,
			username: user.username,
			displayName: user.displayName,
			email: user.email,
			status: user.status,
			preferences: user.preferences ?? null,
		},
		email: user.email,
	})
})
