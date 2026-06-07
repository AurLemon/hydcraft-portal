import { normalizeEmail } from '../../../utils/auth/validation'
import { prisma } from '../../../utils/db/prisma'

interface PasswordResetRequestBody {
	email: string
}

export default defineEventHandler(async (event) => {
	const body = await readBody<PasswordResetRequestBody>(event)
	const email = normalizeEmail(body.email)

	if (!email) {
		throw createError({
			statusCode: 400,
			statusMessage: 'email is required',
		})
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
