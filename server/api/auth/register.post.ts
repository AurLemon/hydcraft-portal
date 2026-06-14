import { prisma } from '../../utils/db/prisma'
import { hashPassword } from '../../utils/auth/password'
import { issueAuthCookies, toUserSummary } from '../../utils/auth/session'
import { consumeAuthEmailCode } from '../../utils/auth/email-code'
import {
	assertEmail,
	assertHandle,
	assertPassword,
} from '../../utils/auth/validation'
import {
	createUniqueHydrolineId,
	ensureUserProfileDefaults,
} from '../../utils/profile/defaults'
import { recordSecurityEvent } from '../../utils/security/security-events'
import { createApiError } from '../../utils/errors'
import { validateCapToken } from '../../utils/security/cap'

interface RegisterBody {
	handle: string
	password: string
	email: string
	code: string
	captchaToken?: string
}

export default defineEventHandler(async (event) => {
	const body = await readBody<RegisterBody>(event)
	await validateCapToken({
		token: body.captchaToken,
	})
	const handle = assertHandle(body.handle ?? '')
	const password = assertPassword(body.password ?? '')
	const email = assertEmail(body.email)
	const code = body.code?.trim()

	if (!code) {
		throw createApiError({
			statusCode: 400,
			code: 'EMAIL_VERIFICATION_CODE_REQUIRED',
		})
	}

	const verifiedEmail = await consumeAuthEmailCode(
		email,
		code,
		'EMAIL_REGISTER',
	)
	const now = new Date()
	const passwordHash = await hashPassword(password)
	const hydrolineId = await createUniqueHydrolineId()

	const user = await prisma.user.create({
		data: {
			handle,
			username: handle,
			hydrolineId,
			displayName: handle,
			email: verifiedEmail,
			emailVerifiedAt: now,
			role: 'USER',
			status: 'ACTIVE',
			credential: {
				create: {
					passwordHash,
				},
			},
			emails: {
				create: {
					email: verifiedEmail,
					kind: 'PRIMARY',
					verifiedAt: now,
				},
			},
		},
	})
	await ensureUserProfileDefaults(user.id)
	const token = await issueAuthCookies(event, user)
	await recordSecurityEvent({
		event,
		userId: user.id,
		type: 'LOGIN_SUCCESS',
		title: '注册并登录成功',
	})
	const userWithPreferences = await prisma.user.findUniqueOrThrow({
		where: {
			id: user.id,
		},
		include: {
			preferences: {
				select: {
					language: true,
				},
			},
		},
	})

	return {
		token,
		user: toUserSummary(userWithPreferences),
	}
})
