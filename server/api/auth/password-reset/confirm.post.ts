import { assertPassword } from '../../../utils/auth/validation'

interface PasswordResetConfirmBody {
	token: string
	password: string
}

export default defineEventHandler(async (event) => {
	const body = await readBody<PasswordResetConfirmBody>(event)
	const token = body.token?.trim() ?? ''
	assertPassword(body.password ?? '')

	if (!token) {
		throw createError({
			statusCode: 400,
			statusMessage: 'reset token is required',
		})
	}

	throw createError({
		statusCode: 501,
		statusMessage: 'password reset token confirmation is not configured',
	})
})
