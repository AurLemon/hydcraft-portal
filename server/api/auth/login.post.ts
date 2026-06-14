import { prisma } from '../../utils/db/prisma'
import { verifyPassword } from '../../utils/auth/password'
import { issueAuthCookies, toUserSummary } from '../../utils/auth/session'
import { normalizeEmail, normalizeHandle } from '../../utils/auth/validation'
import { createApiError } from '../../utils/errors'
import { recordSecurityEvent } from '../../utils/security/security-events'
import { validateCapToken } from '../../utils/security/cap'
import {
	recordLoginFailure,
	shouldRequireLoginCaptcha,
} from '../../utils/security/login-captcha'

interface LoginBody {
	handleOrEmail: string
	password: string
	captchaToken?: string
}

export default defineEventHandler(async (event) => {
	const body = await readBody<LoginBody>(event)
	const login = body.handleOrEmail?.trim() ?? ''
	const normalizedLogin = login.includes('@')
		? normalizeEmail(login)
		: normalizeHandle(login)
	const user = await prisma.user.findFirst({
		where: {
			OR: [
				{
					handle: normalizedLogin ?? '',
				},
				{
					email: normalizedLogin,
				},
			],
		},
		include: {
			credential: true,
		},
	})

	if (user && (await shouldRequireLoginCaptcha(event, user.id))) {
		await validateCapToken({
			token: body.captchaToken,
		})
	}

	if (
		!user ||
		!user.credential ||
		user.status !== 'ACTIVE' ||
		!(await verifyPassword(body.password ?? '', user.credential.passwordHash))
	) {
		if (user) {
			await recordLoginFailure(event, user.id, login)
		}

		throw createApiError({ statusCode: 401, code: 'INVALID_CREDENTIALS' })
	}

	const updatedUser = await prisma.user.update({
		where: {
			id: user.id,
		},
		data: {
			lastLoginAt: new Date(),
		},
		include: {
			preferences: {
				select: {
					language: true,
				},
			},
		},
	})
	const token = await issueAuthCookies(event, updatedUser)
	await recordSecurityEvent({
		event,
		userId: updatedUser.id,
		type: 'LOGIN_SUCCESS',
		title: '登录成功',
	})

	return {
		token,
		user: toUserSummary(updatedUser),
	}
})
