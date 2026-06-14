import { createHash, randomInt } from 'node:crypto'
import type {
	AuthEmailCodePurpose,
	UserProfileLanguage,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { createApiError, createBadRequestError } from '../errors'
import { lookupIpLocation } from '../ip-location/ip-location'
import { getClientIpAddress } from '../ip-location/ip-normalizer'
import { sendMail } from '../mail/smtp'
import { renderVerificationMail } from '../mail/templates'
import { normalizeEmail } from './validation'
import type { H3Event } from 'h3'

const AUTH_EMAIL_CODE_TTL_MS = 10 * 60 * 1000

const hashCode = (code: string): string =>
	createHash('sha256')
		.update(`${process.env.JWT_SECRET ?? 'dev'}:auth-email:${code}`)
		.digest('hex')

const createEmailCode = (): string =>
	String(randomInt(0, 1000000)).padStart(6, '0')

const getOperationLabel = (
	purpose: AuthEmailCodePurpose,
	locale: UserProfileLanguage,
): string => {
	const operations: Record<
		UserProfileLanguage,
		Record<AuthEmailCodePurpose, string>
	> = {
		ZH_CN: {
			EMAIL_LOGIN: '邮箱验证码登录',
			EMAIL_REGISTER: '邮箱直接注册',
		},
		ZH_TW: {
			EMAIL_LOGIN: '信箱驗證碼登入',
			EMAIL_REGISTER: '信箱直接註冊',
		},
		EN_US: {
			EMAIL_LOGIN: 'sign in with an email code',
			EMAIL_REGISTER: 'register with an email code',
		},
		JA_JP: {
			EMAIL_LOGIN: 'メール認証コードでログイン',
			EMAIL_REGISTER: 'メール認証コードで登録',
		},
	}

	return operations[locale][purpose]
}

export const sendAuthEmailCode = async (
	event: H3Event,
	emailInput: string,
	purpose: AuthEmailCodePurpose,
	locale: UserProfileLanguage,
	displayName?: string | null,
): Promise<void> => {
	const email = normalizeEmail(emailInput)

	if (!email) {
		throw createBadRequestError('EMAIL_REQUIRED')
	}

	const code = createEmailCode()
	const now = new Date()

	await prisma.authEmailCode.updateMany({
		where: {
			email,
			purpose,
			consumedAt: null,
		},
		data: {
			consumedAt: now,
		},
	})
	await prisma.authEmailCode.create({
		data: {
			email,
			purpose,
			locale,
			codeHash: hashCode(code),
			expiresAt: new Date(now.getTime() + AUTH_EMAIL_CODE_TTL_MS),
		},
	})

	const ipAddress = getClientIpAddress(event)
	const ipLocation = await lookupIpLocation(ipAddress)
	const mail = renderVerificationMail({
		displayName: displayName || email,
		code,
		operation: getOperationLabel(purpose, locale),
		ipAddress,
		ipLocation: ipLocation?.display,
		locale,
	})

	await sendMail({
		to: email,
		...mail,
	})
}

export const consumeAuthEmailCode = async (
	emailInput: string,
	code: string,
	purpose: AuthEmailCodePurpose,
): Promise<string> => {
	const email = normalizeEmail(emailInput)

	if (!email) {
		throw createBadRequestError('EMAIL_REQUIRED')
	}

	const token = await prisma.authEmailCode.findFirst({
		where: {
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

	await prisma.authEmailCode.update({
		where: {
			id: token.id,
		},
		data: {
			consumedAt: new Date(),
		},
	})

	return email
}
