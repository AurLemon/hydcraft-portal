import { normalizeMailLocale } from '../../../utils/auth/locale'
import { assertEmail } from '../../../utils/auth/validation'
import { prisma } from '../../../utils/db/prisma'
import { createApiError } from '../../../utils/errors'
import { sendAuthEmailCode } from '../../../utils/auth/email-code'

interface RequestEmailCodeLoginBody {
	email: string
	intent: 'LOGIN' | 'REGISTER'
	locale?: string
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
	const body = await readBody<RequestEmailCodeLoginBody>(event)
	const email = assertEmail(body.email)
	const locale = normalizeMailLocale(body.locale)

	if (body.intent !== 'LOGIN' && body.intent !== 'REGISTER') {
		throw createApiError({
			statusCode: 400,
			code: 'EMAIL_CODE_INTENT_INVALID',
		})
	}

	if (body.intent === 'REGISTER') {
		const existingUser = await prisma.user.findFirst({
			where: {
				OR: [
					{
						email,
					},
					{
						emails: {
							some: {
								email,
							},
						},
					},
				],
			},
			select: {
				id: true,
			},
		})

		if (existingUser) {
			throw createApiError({
				statusCode: 409,
				code: 'EMAIL_ALREADY_IN_USE',
			})
		}

		await sendAuthEmailCode(event, email, 'EMAIL_REGISTER', locale, email)

		return {
			ok: true,
		}
	}

	const user = await findActiveUserByEmail(email)

	if (!user) {
		throw createApiError({
			statusCode: 404,
			code: 'EMAIL_NOT_FOUND',
		})
	}

	await sendAuthEmailCode(
		event,
		email,
		'EMAIL_LOGIN',
		normalizeMailLocale(body.locale, user.preferences?.language ?? 'ZH_CN'),
		user.displayName || user.username,
	)

	return {
		ok: true,
	}
})
