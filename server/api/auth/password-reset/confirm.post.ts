import { assertPassword } from '../../../utils/auth/validation'
import { createApiError, createBadRequestError } from '../../../utils/errors'

interface PasswordResetConfirmBody {
	token: string
	password: string
}

export default defineEventHandler(async (event) => {
	const body = await readBody<PasswordResetConfirmBody>(event)
	const token = body.token?.trim() ?? ''
	assertPassword(body.password ?? '')

	if (!token) {
		throw createBadRequestError('RESET_TOKEN_REQUIRED')
	}

	throw createApiError({
		statusCode: 501,
		code: 'PASSWORD_RESET_CONFIRM_NOT_CONFIGURED',
	})
})
