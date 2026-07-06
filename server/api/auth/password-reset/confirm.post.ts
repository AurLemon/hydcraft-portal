import { confirmPasswordReset } from '../../../utils/security/password-reset'

interface PasswordResetConfirmBody {
	email: string
	code: string
	password: string
}

export default defineEventHandler(async (event) => {
	const body = await readBody<PasswordResetConfirmBody>(event)
	await confirmPasswordReset({
		event,
		email: body.email,
		code: body.code,
		password: body.password,
	})
})
