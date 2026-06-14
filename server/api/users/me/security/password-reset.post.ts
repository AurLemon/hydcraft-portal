import { requireCurrentUser } from '../../../../utils/auth/session'
import { emitEvent } from '../../../../utils/events/event-bus'
import { createBadRequestError } from '../../../../utils/errors'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)

	if (!user.email) {
		throw createBadRequestError('EMAIL_REQUIRED')
	}

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
