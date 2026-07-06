import { createHash, randomInt } from 'node:crypto'
import type { H3Event } from 'h3'
import type { User, UserProfileLanguage } from '~/generated/prisma/client'
import { normalizeMailLocale } from '../auth/locale'
import { hashPassword } from '../auth/password'
import { assertEmail, assertPassword } from '../auth/validation'
import { prisma } from '../db/prisma'
import { emitEvent } from '../events/event-bus'
import { getClientIpAddress } from '../ip-location/ip-normalizer'
import { lookupIpLocation } from '../ip-location/ip-location'
import { recordSecurityEvent } from './security-events'
import { createApiError, createBadRequestError } from '../errors'
import { consumeEmailVerificationCode } from './account-security'

const PASSWORD_RESET_CODE_TTL_MS = 10 * 60 * 1000

const hashCode = (code: string): string =>
	createHash('sha256')
		.update(`${process.env.JWT_SECRET ?? 'dev'}:${code}`)
		.digest('hex')

const createPasswordResetCode = (): string =>
	String(randomInt(0, 1000000)).padStart(6, '0')

type PasswordResetUser = Pick<
	User,
	'id' | 'handle' | 'username' | 'displayName' | 'email' | 'status'
> & {
	preferences: {
		language: UserProfileLanguage
	} | null
}

const passwordResetUserSelect = {
	id: true,
	handle: true,
	username: true,
	displayName: true,
	email: true,
	status: true,
	preferences: {
		select: {
			language: true,
		},
	},
} as const

export const findPasswordResetUserByEmail = async (
	emailInput: string,
): Promise<PasswordResetUser | null> => {
	const email = assertEmail(emailInput)

	const emailRecord = await prisma.userEmail.findUnique({
		where: {
			email,
		},
		select: {
			user: {
				select: passwordResetUserSelect,
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
		select: passwordResetUserSelect,
	})
}

export const issuePasswordResetVerificationCode = async (input: {
	event: H3Event
	user: PasswordResetUser
	email: string
	locale?: string | null
}): Promise<{ accepted: true }> => {
	const email = assertEmail(input.email)
	const locale = normalizeMailLocale(
		input.locale,
		input.user.preferences?.language ?? 'ZH_CN',
	)
	const code = createPasswordResetCode()
	const now = new Date()
	const expiresAt = new Date(now.getTime() + PASSWORD_RESET_CODE_TTL_MS)

	await prisma.emailVerificationToken.updateMany({
		where: {
			userId: input.user.id,
			email,
			purpose: 'PASSWORD_RESET',
			consumedAt: null,
		},
		data: {
			consumedAt: now,
		},
	})

	await prisma.emailVerificationToken.create({
		data: {
			userId: input.user.id,
			email,
			purpose: 'PASSWORD_RESET',
			locale,
			codeHash: hashCode(code),
			expiresAt,
		},
	})

	const ipAddress = getClientIpAddress(input.event)
	const ipLocation = await lookupIpLocation(ipAddress)

	await recordSecurityEvent({
		event: input.event,
		userId: input.user.id,
		type: 'EMAIL_VERIFICATION_SENT',
		title: 'Password reset verification code sent',
		description: email,
		metadata: {
			email,
			purpose: 'PASSWORD_RESET',
		},
	})

	await emitEvent('auth.password-reset.code-requested', {
		userId: input.user.id,
		email,
		displayName: input.user.displayName,
		handle: input.user.handle,
		locale,
		code,
		expiresAt,
		requestedAt: now,
		ipAddress,
		ipLocation: ipLocation?.display ?? null,
	})

	return {
		accepted: true,
	}
}

export const confirmPasswordReset = async (input: {
	event: H3Event
	email: string
	code: string
	password: string
}): Promise<void> => {
	const email = assertEmail(input.email)
	const code = input.code?.trim() ?? ''
	const password = assertPassword(input.password ?? '')

	if (!code) {
		throw createBadRequestError('EMAIL_VERIFICATION_CODE_REQUIRED')
	}

	const user = await findPasswordResetUserByEmail(email)

	if (!user) {
		throw createApiError({
			statusCode: 400,
			code: 'EMAIL_VERIFICATION_CODE_INVALID',
		})
	}

	await consumeEmailVerificationCode(user.id, email, code, 'PASSWORD_RESET')

	const passwordHash = await hashPassword(password)
	const revokedAt = new Date()

	await prisma.userCredential.upsert({
		where: {
			userId: user.id,
		},
		create: {
			userId: user.id,
			passwordHash,
		},
		update: {
			passwordHash,
		},
	})

	await prisma.refreshToken.updateMany({
		where: {
			userId: user.id,
			revokedAt: null,
		},
		data: {
			revokedAt,
		},
	})

	await recordSecurityEvent({
		event: input.event,
		userId: user.id,
		type: 'PASSWORD_CHANGED',
		title: 'Password reset completed',
		description: email,
		metadata: {
			source: 'password-reset',
			email,
		},
	})
}
