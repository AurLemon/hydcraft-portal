import { requireCurrentUser } from '../../../../utils/auth/session'
import { createBadRequestError } from '../../../../utils/errors'
import { validateCapToken } from '../../../../utils/security/cap'
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

	await validateCapToken({
		token: body.captchaToken,
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
