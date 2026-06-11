import { normalizeEmail } from '../../../utils/auth/validation'
import { prisma } from '../../../utils/db/prisma'
import { createBadRequestError } from '../../../utils/errors'

interface PasswordResetRequestBody {
	email: string
}

export default defineEventHandler(async (event) => {
	const body = await readBody<PasswordResetRequestBody>(event)
	const email = normalizeEmail(body.email)

	if (!email) {
		throw createBadRequestError('EMAIL_REQUIRED')
	}

	await prisma.user.findUnique({
		where: {
			email,
		},
		select: {
			id: true,
		},
	})

	return {
		accepted: true,
	}
})
