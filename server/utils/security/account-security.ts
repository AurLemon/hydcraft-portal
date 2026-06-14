import { createHash, randomInt } from 'node:crypto'
import type { H3Event } from 'h3'
import type {
	EmailVerificationPurpose,
	User,
	UserProfileLanguage,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { createApiError, createBadRequestError } from '../errors'
import { emitEvent } from '../events/event-bus'
import { sendMail } from '../mail/smtp'
import { renderVerificationMail } from '../mail/templates'
import { normalizeEmail } from '../auth/validation'
import { lookupIpLocation } from '../ip-location/ip-location'
import { getClientIpAddress } from '../ip-location/ip-normalizer'
import { recordSecurityEvent } from './security-events'

const EMAIL_CODE_TTL_MS = 10 * 60 * 1000

const hashCode = (code: string): string =>
	createHash('sha256')
		.update(`${process.env.JWT_SECRET ?? 'dev'}:${code}`)
		.digest('hex')

const createEmailCode = (): string =>
	String(randomInt(0, 1000000)).padStart(6, '0')

export const getVerificationOperation = (
	purpose: EmailVerificationPurpose,
	locale: UserProfileLanguage,
): string => {
	const operations: Record<
		UserProfileLanguage,
		Record<EmailVerificationPurpose, string>
	> = {
		ZH_CN: {
			VERIFY_EMAIL: '验证邮箱',
			CHANGE_PRIMARY_EMAIL: '换绑主邮箱',
			ADD_SECONDARY_EMAIL: '绑定副邮箱',
			PASSWORD_RESET: '重置密码',
		},
		ZH_TW: {
			VERIFY_EMAIL: '驗證信箱',
			CHANGE_PRIMARY_EMAIL: '換綁主信箱',
			ADD_SECONDARY_EMAIL: '綁定副信箱',
			PASSWORD_RESET: '重設密碼',
		},
		EN_US: {
			VERIFY_EMAIL: 'verify your email address',
			CHANGE_PRIMARY_EMAIL: 'change your primary email address',
			ADD_SECONDARY_EMAIL: 'add a secondary email address',
			PASSWORD_RESET: 'reset your password',
		},
		JA_JP: {
			VERIFY_EMAIL: 'メールアドレスの確認',
			CHANGE_PRIMARY_EMAIL: 'メインメールアドレスの変更',
			ADD_SECONDARY_EMAIL: '予備メールアドレスの追加',
			PASSWORD_RESET: 'パスワードのリセット',
		},
	}

	return operations[locale][purpose]
}

export const sendEmailVerificationCode = async (
	event: H3Event,
	user: User,
	emailInput: string,
	purpose: EmailVerificationPurpose,
	locale: UserProfileLanguage,
): Promise<void> => {
	const email = normalizeEmail(emailInput)

	if (!email) {
		throw createBadRequestError('EMAIL_REQUIRED')
	}

	const existing = await prisma.userEmail.findUnique({
		where: {
			email,
		},
	})

	if (
		existing &&
		(existing.userId !== user.id ||
			(purpose === 'ADD_SECONDARY_EMAIL' && existing.kind === 'PRIMARY'))
	) {
		throw createApiError({
			statusCode: 409,
			code: 'EMAIL_ALREADY_IN_USE',
		})
	}

	const code = createEmailCode()
	const now = new Date()

	await prisma.emailVerificationToken.updateMany({
		where: {
			userId: user.id,
			email,
			purpose,
			consumedAt: null,
		},
		data: {
			consumedAt: now,
		},
	})

	await prisma.emailVerificationToken.create({
		data: {
			userId: user.id,
			email,
			purpose,
			locale,
			codeHash: hashCode(code),
			expiresAt: new Date(now.getTime() + EMAIL_CODE_TTL_MS),
		},
	})
	const expiresAt = new Date(now.getTime() + EMAIL_CODE_TTL_MS)
	const ipAddress = getClientIpAddress(event)
	const ipLocation = await lookupIpLocation(ipAddress)

	const mail = renderVerificationMail({
		displayName: user.displayName || user.username,
		code,
		operation: getVerificationOperation(purpose, locale),
		ipAddress,
		ipLocation: ipLocation?.display,
		locale,
	})

	await sendMail({
		to: email,
		...mail,
	})

	await recordSecurityEvent({
		event,
		userId: user.id,
		type: 'EMAIL_VERIFICATION_SENT',
		title: '邮箱验证码已发送',
		description: email,
		metadata: {
			email,
			purpose,
		},
	})

	await emitEvent('user.email.verification-requested', {
		userId: user.id,
		email,
		purpose,
		code,
		locale,
		expiresAt,
		createdAt: now,
	})
}

export const consumeEmailVerificationCode = async (
	userId: string,
	emailInput: string,
	code: string,
	purpose: EmailVerificationPurpose,
): Promise<string> => {
	const email = normalizeEmail(emailInput)

	if (!email) {
		throw createBadRequestError('EMAIL_REQUIRED')
	}

	const token = await prisma.emailVerificationToken.findFirst({
		where: {
			userId,
			email,
			purpose,
			codeHash: hashCode(code.trim()),
			consumedAt: null,
			expiresAt: {
				gt: new Date(),
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
	})

	if (!token) {
		throw createApiError({
			statusCode: 400,
			code: 'EMAIL_VERIFICATION_CODE_INVALID',
		})
	}

	await prisma.emailVerificationToken.update({
		where: {
			id: token.id,
		},
		data: {
			consumedAt: new Date(),
		},
	})

	return email
}
