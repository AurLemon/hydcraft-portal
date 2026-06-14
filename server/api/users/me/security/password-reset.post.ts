import { requireCurrentUser } from '../../../../utils/auth/session'
import { emitEvent } from '../../../../utils/events/event-bus'
import { createBadRequestError } from '../../../../utils/errors'
import { validateCapToken } from '../../../../utils/security/cap'

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

	await emitEvent('auth.password-reset.requested', {
		userId: user.id,
		email: user.email,
		displayName: user.displayName,
		handle: user.handle,
		locale: user.preferences?.language ?? null,
		requestedAt: new Date(),
	})

	return {
		accepted: true,
	}
})
