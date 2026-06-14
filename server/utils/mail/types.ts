import type { UserProfileLanguage } from '~/generated/prisma/client'

export type MailLocale = 'zh-CN' | 'zh-TW' | 'en-US' | 'ja-JP'

export interface MailTemplateRenderResult {
	subject: string
	preheader?: string
	html: string
	text: string
}

export interface VerificationMailInput {
	displayName: string
	code: string
	operation: string
	ipAddress: string | null
	ipLocation?: string | null
	locale: UserProfileLanguage
}

export interface SendMailMessage {
	to: string
	subject: string
	html: string
	text: string
}

const SUPPORTED_MAIL_LOCALES = ['zh-CN', 'zh-TW', 'en-US', 'ja-JP'] as const

export const DEFAULT_MAIL_LOCALE: MailLocale = 'zh-CN'

export const resolveMailLocale = (
	locale: string | null | undefined,
): MailLocale => {
	if (!locale) {
		return DEFAULT_MAIL_LOCALE
	}

	const normalized = locale.trim()
	const exactLocale = SUPPORTED_MAIL_LOCALES.find((item) => item === normalized)

	if (exactLocale) {
		return exactLocale
	}

	const lowerLocale = normalized.toLowerCase()

	if (lowerLocale === 'zh' || lowerLocale === 'zh-cn' || lowerLocale === 'cn') {
		return 'zh-CN'
	}

	if (
		lowerLocale === 'zh-tw' ||
		lowerLocale === 'zh-hk' ||
		lowerLocale === 'tw'
	) {
		return 'zh-TW'
	}

	if (lowerLocale === 'en' || lowerLocale === 'en-us') {
		return 'en-US'
	}

	if (lowerLocale === 'ja' || lowerLocale === 'ja-jp' || lowerLocale === 'jp') {
		return 'ja-JP'
	}

	return DEFAULT_MAIL_LOCALE
}
