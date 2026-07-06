import { prisma } from '../../utils/db/prisma'
import { hashPassword } from '../../utils/auth/password'
import { createUserShell } from '../../utils/auth/registration-completion'
import { issueAuthCookies, toUserSummary } from '../../utils/auth/session'
import { consumeAuthEmailCode } from '../../utils/auth/email-code'
import {
	assertEmail,
	assertHandle,
	assertPassword,
} from '../../utils/auth/validation'
import { ensureUserProfileDefaults } from '../../utils/profile/defaults'
import { normalizeUsername } from '../../utils/profile/validation'
import { recordSecurityEvent } from '../../utils/security/security-events'
import { createApiError } from '../../utils/errors'
import { emitEvent } from '../../utils/events/event-bus'

interface RegisterBody {
	handle: string
	password: string
	email: string
	code: string
}

export default defineEventHandler(async (event) => {
	const body = await readBody<RegisterBody>(event)
	const rawHandle = body.handle ?? ''
	const handle = assertHandle(rawHandle)
	const username = normalizeUsername(rawHandle) ?? handle
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
	const passwordHash = await hashPassword(password)

	const user = await prisma.$transaction(async (tx) =>
		createUserShell(tx, {
			handle,
			username,
			email: verifiedEmail,
			displayName: username,
			credential: {
				passwordHash,
			},
		}),
	)
	await ensureUserProfileDefaults(user.id)
	await emitEvent('user.registered', {
		userId: user.id,
		occurredAt: user.createdAt,
	})
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
