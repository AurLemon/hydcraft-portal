import type { UserProfileLanguage } from '~/generated/prisma/client'

export const normalizeMailLocale = (
	locale: string | null | undefined,
	fallback: UserProfileLanguage = 'ZH_CN',
): UserProfileLanguage => {
	if (locale === 'zh-TW' || locale === 'ZH_TW') {
		return 'ZH_TW'
	}

	if (locale === 'en-US' || locale === 'EN_US') {
		return 'EN_US'
	}

	if (locale === 'ja-JP' || locale === 'JA_JP') {
		return 'JA_JP'
	}

	if (locale === 'zh-CN' || locale === 'ZH_CN') {
		return 'ZH_CN'
	}

	return fallback
}
