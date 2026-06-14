import { issueAuthCookies, toUserSummary } from '../../../utils/auth/session'
import { assertEmail } from '../../../utils/auth/validation'
import { prisma } from '../../../utils/db/prisma'
import { createApiError } from '../../../utils/errors'
import { consumeAuthEmailCode } from '../../../utils/auth/email-code'
import { recordSecurityEvent } from '../../../utils/security/security-events'

interface ConfirmEmailCodeLoginBody {
	email: string
	code: string
	intent: 'LOGIN' | 'REGISTER'
}

const findActiveUserByEmail = async (email: string) => {
	const emailRecord = await prisma.userEmail.findUnique({
		where: {
			email,
		},
		include: {
			user: {
				include: {
					preferences: {
						select: {
							language: true,
						},
					},
				},
			},
		},
	})

	if (emailRecord?.user.status === 'ACTIVE') {
		return emailRecord.user
	}

	return await prisma.user.findFirst({
		where: {
			email,
			status: 'ACTIVE',
		},
		include: {
			preferences: {
				select: {
					language: true,
				},
			},
		},
	})
}

export default defineEventHandler(async (event) => {
	const body = await readBody<ConfirmEmailCodeLoginBody>(event)
	const email = assertEmail(body.email)
	const code = body.code?.trim()

	if (!code) {
		throw createApiError({
			statusCode: 400,
			code: 'EMAIL_VERIFICATION_CODE_REQUIRED',
		})
	}

	if (body.intent !== 'LOGIN' && body.intent !== 'REGISTER') {
		throw createApiError({
			statusCode: 400,
			code: 'EMAIL_CODE_INTENT_INVALID',
		})
	}

	if (body.intent === 'REGISTER') {
		throw createApiError({
			statusCode: 400,
			code: 'EMAIL_CODE_INTENT_INVALID',
		})
	}

	const user = await findActiveUserByEmail(email)

	if (!user) {
		throw createApiError({
			statusCode: 400,
			code: 'EMAIL_VERIFICATION_CODE_INVALID',
		})
	}

	const verifiedEmail = await consumeAuthEmailCode(email, code, 'EMAIL_LOGIN')
	const now = new Date()
	const updatedUser = await prisma.$transaction(async (tx) => {
		await tx.userEmail.upsert({
			where: {
				email: verifiedEmail,
			},
			create: {
				userId: user.id,
				email: verifiedEmail,
				kind: user.email === verifiedEmail ? 'PRIMARY' : 'SECONDARY',
				verifiedAt: now,
			},
			update: {
				verifiedAt: now,
			},
		})

		return await tx.user.update({
			where: {
				id: user.id,
			},
			data: {
				emailVerifiedAt:
					user.email === verifiedEmail ? now : user.emailVerifiedAt,
				lastLoginAt: now,
			},
			include: {
				preferences: {
					select: {
						language: true,
					},
				},
			},
		})
	})
	const token = await issueAuthCookies(event, updatedUser)

	await recordSecurityEvent({
		event,
		userId: updatedUser.id,
		type: 'LOGIN_SUCCESS',
		title: '邮箱验证码登录成功',
		description: verifiedEmail,
	})

	return {
		token,
		user: toUserSummary(updatedUser),
	}
})
