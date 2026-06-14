import { normalizeEmail } from '../../../utils/auth/validation'
import { prisma } from '../../../utils/db/prisma'
import { emitEvent } from '../../../utils/events/event-bus'
import { createBadRequestError } from '../../../utils/errors'
import { validateCapToken } from '../../../utils/security/cap'

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

	await validateCapToken({
		token: body.captchaToken,
	})

	const user = await prisma.user.findUnique({
		where: {
			email,
		},
		select: {
			id: true,
			handle: true,
			displayName: true,
			email: true,
		},
	})

	if (user?.email) {
		await emitEvent('auth.password-reset.requested', {
			userId: user.id,
			email: user.email,
			displayName: user.displayName,
			handle: user.handle,
			locale: body.locale ?? null,
			requestedAt: new Date(),
		})
	}

	return {
		accepted: true,
	}
})
