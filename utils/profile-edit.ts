import dayjs from 'dayjs'

export type ProfileLanguage = 'ZH_CN' | 'ZH_TW' | 'EN_US' | 'JA_JP'
export type ProfileGender = 'UNSPECIFIED' | 'MALE' | 'FEMALE'
export type ProfileCountryOrRegionKey =
	| 'MAINLAND_CHINA'
	| 'HONG_KONG_CHINA'
	| 'TAIWAN_CHINA'
	| 'MACAU_CHINA'
	| 'OVERSEAS_REGION'
export type ProfileCountryOrRegion =
	| '中国内地'
	| '中国香港'
	| '中国台湾'
	| '中国澳门'
	| '海外地区'
export type LocaleCode = 'zh-CN' | 'zh-TW' | 'ja-JP' | 'en-US'
export type TimezoneMode = 'AUTO' | 'MANUAL'
export type PrivacyKey =
	| 'publicProfile'
	| 'showHydrolineId'
	| 'showJoinedAt'
	| 'showLocation'
	| 'showCountryOrRegion'
	| 'showBirthday'
	| 'showBadges'
	| 'showBio'
	| 'showMinecraftProfileLink'
	| 'showSocialLinks'
	| 'showActivityStatus'
	| 'searchableInUserDirectory'
	| 'allowMinecraftProfileDiscovery'

export interface ProfileBadge {
	id: string
	badgeId: string | null
	key: string | null
	label: string
	labelZhCn: string
	labelZhTw: string
	labelEnUs: string
	labelJaJp: string
	color: string | null
	sortOrder: number
}

export interface ProfileVerified {
	enabled: boolean
	textZhCn: string | null
	textZhTw: string | null
	textEnUs: string | null
	textJaJp: string | null
}

export interface EditableProfile {
	id: string
	hydrolineId: string
	username: string
	usernameChangedAt: string | null
	canChangeUsernameAt: string | null
	usernameChangeCooldownDays: number
	displayName: string | null
	avatarUrl: string | null
	coverUrl: string | null
	avatarAttachmentId: string | null
	coverAttachmentId: string | null
	createdAt: string
	joinedAt: string
	badges: ProfileBadge[]
	roleBadge: ProfileBadge | null
	verified: ProfileVerified
	bio: string | null
	location: string | null
	countryOrRegion: string | null
	gender: ProfileGender
	birthday: string | null
	preferences: {
		language: ProfileLanguage
		timezoneMode: TimezoneMode
		timezone: string | null
	}
	social: {
		h2wikiPageName: string | null
		githubUsername: string | null
		websiteUrl: string | null
		bilibiliUrl: string | null
		qqNumber: string | null
		wechatId: string | null
		publicEmail: string | null
	}
	privacy: Record<PrivacyKey, boolean>
}

export interface ProfileForm {
	username: string
	displayName: string
	avatarUrl: string
	bio: string
	location: string
	countryOrRegion: ProfileCountryOrRegion | undefined
	gender: ProfileGender
	birthday: string
	preferences: {
		language: ProfileLanguage
		timezoneMode: TimezoneMode
		timezone: string
	}
	social: {
		h2wikiPageName: string
		githubUsername: string
		websiteUrl: string
		bilibiliUrl: string
		qqNumber: string
		wechatId: string
		publicEmail: string
	}
	privacy: Record<PrivacyKey, boolean>
}

export interface ProfileResponse {
	profile: EditableProfile
}

export interface SocialPreviewLink {
	text: string
	href: string
}

export const profileCardClass =
	'rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950'
export const profileSectionTitleClass =
	'mx-1 text-2xl text-slate-950 dark:text-white'

export const languageItems = [
	{ label: '简体中文', value: 'ZH_CN' },
	{ label: '繁體中文', value: 'ZH_TW' },
	{ label: 'English', value: 'EN_US' },
	{ label: '日本語', value: 'JA_JP' },
]
export const genderItems = [
	{ value: 'UNSPECIFIED', label: '未指定' },
	{ value: 'MALE', label: '男' },
	{ value: 'FEMALE', label: '女' },
] as const
export const timezoneItems = [
	{ label: 'Asia/Shanghai', value: 'Asia/Shanghai' },
	{ label: 'Asia/Singapore', value: 'Asia/Singapore' },
	{ label: 'Asia/Tokyo', value: 'Asia/Tokyo' },
	{ label: 'UTC', value: 'UTC' },
]
export const countryItems = [
	{ key: 'MAINLAND_CHINA', value: '中国内地' },
	{ key: 'HONG_KONG_CHINA', value: '中国香港' },
	{ key: 'TAIWAN_CHINA', value: '中国台湾' },
	{ key: 'MACAU_CHINA', value: '中国澳门' },
	{ key: 'OVERSEAS_REGION', value: '海外地区' },
] as const satisfies ReadonlyArray<{
	key: ProfileCountryOrRegionKey
	value: ProfileCountryOrRegion
}>
export const privacyItems: Array<{ key: PrivacyKey; label: string }> = [
	{ key: 'publicProfile', label: '公开个人主页' },
	{ key: 'showHydrolineId', label: '展示 Hydroline ID' },
	{ key: 'showLocation', label: '展示现居地' },
	{ key: 'showCountryOrRegion', label: '展示国家 / 地区' },
	{ key: 'showBirthday', label: '展示生日' },
	{ key: 'showMinecraftProfileLink', label: '展示 Minecraft 档案入口' },
	{ key: 'showSocialLinks', label: '展示社交链接' },
	{ key: 'showActivityStatus', label: '展示最近活跃状态' },
	{ key: 'searchableInUserDirectory', label: '允许在用户目录中搜索到' },
	{
		key: 'allowMinecraftProfileDiscovery',
		label: '允许从 Minecraft 档案查询用户主页',
	},
]

export const createEmptyProfileForm = (): ProfileForm => ({
	username: '',
	displayName: '',
	avatarUrl: '',
	bio: '',
	location: '',
	countryOrRegion: undefined,
	gender: 'UNSPECIFIED',
	birthday: '',
	preferences: {
		language: 'ZH_CN',
		timezoneMode: 'AUTO',
		timezone: 'Asia/Shanghai',
	},
	social: {
		h2wikiPageName: '',
		githubUsername: '',
		websiteUrl: '',
		bilibiliUrl: '',
		qqNumber: '',
		wechatId: '',
		publicEmail: '',
	},
	privacy: {
		publicProfile: true,
		showHydrolineId: true,
		showJoinedAt: true,
		showLocation: true,
		showCountryOrRegion: true,
		showBirthday: false,
		showBadges: true,
		showBio: true,
		showMinecraftProfileLink: true,
		showSocialLinks: true,
		showActivityStatus: true,
		searchableInUserDirectory: true,
		allowMinecraftProfileDiscovery: true,
	},
})

export const profileLanguageToLocaleCode: Record<ProfileLanguage, LocaleCode> =
	{
		ZH_CN: 'zh-CN',
		ZH_TW: 'zh-TW',
		EN_US: 'en-US',
		JA_JP: 'ja-JP',
	}

const normalizeCountryOrRegionOption = (
	value: string | null,
): string | null => {
	if (value === '中国大陆') {
		return '中国内地'
	}

	if (value === '海外') {
		return '海外地区'
	}

	return value
}

export const formatProfileDate = (value: string): string =>
	dayjs(value).format('YYYY-M-D')

export const toDateInput = (value: string | null): string =>
	value ? dayjs(value).format('YYYY-MM-DD') : ''

const SOCIAL_PREVIEW_BASE = {
	h2wiki: 'https://wiki.hydcraft.cn/',
	github: 'https://github.com/',
	bilibili: 'https://space.bilibili.com/',
} as const

const normalizeSocialSegment = (value: string | null | undefined): string => {
	const normalized = value?.trim() ?? ''

	if (!normalized || /^https?:\/\//i.test(normalized)) {
		return ''
	}

	return normalized.replace(/^\/+|\/+$/g, '')
}

export const extractPathSegment = (
	value: string | null | undefined,
	prefix: string,
): string => {
	const normalized = value?.trim() ?? ''

	if (!normalized) {
		return ''
	}

	if (!/^https?:\/\//i.test(normalized)) {
		return normalized.replace(/^\/+|\/+$/g, '')
	}

	try {
		const url = new URL(normalized)
		const target = new URL(prefix)

		if (url.origin !== target.origin) {
			return ''
		}

		return url.pathname.replace(/^\/+|\/+$/g, '')
	} catch {
		return ''
	}
}

export const extractBilibiliId = (value: string | null | undefined): string => {
	const normalized = value?.trim() ?? ''

	if (!normalized) {
		return ''
	}

	if (!/^https?:\/\//i.test(normalized)) {
		return normalized.replace(/^\/+|\/+$/g, '')
	}

	try {
		const url = new URL(normalized)

		if (
			url.hostname !== 'space.bilibili.com' &&
			url.hostname !== 'www.bilibili.com'
		) {
			return ''
		}

		const match = url.pathname.match(/(\d+)/)

		if (match?.[1]) {
			return match[1]
		}

		return url.pathname.replace(/^\/+|\/+$/g, '')
	} catch {
		return ''
	}
}

export const createSocialPreviewLink = (
	baseUrl: string,
	value: string,
): SocialPreviewLink | null => {
	const segment = normalizeSocialSegment(value)

	if (!segment) {
		return null
	}

	return {
		text: `${baseUrl.replace(/^https?:\/\//, '')}${segment}`,
		href: `${baseUrl}${segment}`,
	}
}

export const toBilibiliUrl = (value: string): string | null => {
	const segment = normalizeSocialSegment(value)
	return segment ? `${SOCIAL_PREVIEW_BASE.bilibili}${segment}` : null
}

export const assignProfileForm = (
	form: ProfileForm,
	value: EditableProfile,
): void => {
	form.username = value.username
	form.displayName = value.displayName ?? ''
	form.avatarUrl = value.avatarUrl ?? ''
	form.bio = value.bio ?? ''
	form.location = value.location ?? ''
	const countryOrRegion = normalizeCountryOrRegionOption(value.countryOrRegion)
	form.countryOrRegion = countryItems.find(
		(item) => item.value === countryOrRegion,
	)?.value
	form.gender = value.gender
	form.birthday = toDateInput(value.birthday)
	form.preferences.language = value.preferences.language
	form.preferences.timezoneMode = value.preferences.timezoneMode
	form.preferences.timezone = value.preferences.timezone ?? 'Asia/Shanghai'
	form.social.h2wikiPageName = extractPathSegment(
		value.social.h2wikiPageName,
		SOCIAL_PREVIEW_BASE.h2wiki,
	)
	form.social.githubUsername = extractPathSegment(
		value.social.githubUsername,
		SOCIAL_PREVIEW_BASE.github,
	)
	form.social.websiteUrl = value.social.websiteUrl ?? ''
	form.social.bilibiliUrl = extractBilibiliId(value.social.bilibiliUrl)
	form.social.qqNumber = value.social.qqNumber ?? ''
	form.social.wechatId = value.social.wechatId ?? ''
	form.social.publicEmail = value.social.publicEmail ?? ''

	for (const item of privacyItems) {
		form.privacy[item.key] = value.privacy[item.key]
	}
}

const normalizeNullable = (value: string): string | null => {
	const normalized = value.trim()
	return normalized || null
}

export const buildProfilePatchPayload = (
	form: ProfileForm,
	original: EditableProfile | null,
): Record<string, unknown> => {
	const payload: Record<string, unknown> = {}

	if (!original) {
		return payload
	}

	const scalarEntries = [
		['username', form.username, original.username],
		['displayName', form.displayName, original.displayName ?? ''],
		['bio', form.bio, original.bio ?? ''],
		['location', form.location, original.location ?? ''],
		[
			'countryOrRegion',
			form.countryOrRegion ?? '',
			original.countryOrRegion ?? '',
		],
		['gender', form.gender, original.gender],
		['birthday', form.birthday, toDateInput(original.birthday)],
	] as const

	for (const [key, current, initial] of scalarEntries) {
		if (current !== initial) {
			payload[key] =
				key === 'birthday' ? current || null : normalizeNullable(current)
		}
	}

	const preferences: Record<string, unknown> = {}
	if (form.preferences.language !== original.preferences.language) {
		preferences.language = form.preferences.language
	}
	if (form.preferences.timezoneMode !== original.preferences.timezoneMode) {
		preferences.timezoneMode = form.preferences.timezoneMode
	}
	if (form.preferences.timezone !== (original.preferences.timezone ?? '')) {
		preferences.timezone = form.preferences.timezone
	}
	if (Object.keys(preferences).length) {
		payload.preferences = preferences
	}

	const social: Record<string, unknown> = {}
	const normalizedOriginalWiki = extractPathSegment(
		original.social.h2wikiPageName,
		SOCIAL_PREVIEW_BASE.h2wiki,
	)
	const normalizedOriginalGithub = extractPathSegment(
		original.social.githubUsername,
		SOCIAL_PREVIEW_BASE.github,
	)
	const normalizedOriginalBilibili = extractBilibiliId(
		original.social.bilibiliUrl,
	)
	const socialEntries = [
		['h2wikiPageName', form.social.h2wikiPageName, normalizedOriginalWiki],
		['githubUsername', form.social.githubUsername, normalizedOriginalGithub],
		['websiteUrl', form.social.websiteUrl, original.social.websiteUrl ?? ''],
		['bilibiliUrl', form.social.bilibiliUrl, normalizedOriginalBilibili],
		['qqNumber', form.social.qqNumber, original.social.qqNumber ?? ''],
		['wechatId', form.social.wechatId, original.social.wechatId ?? ''],
		['publicEmail', form.social.publicEmail, original.social.publicEmail ?? ''],
	] as const

	for (const [key, current, initial] of socialEntries) {
		if (current !== initial) {
			if (key === 'h2wikiPageName') {
				social[key] = normalizeNullable(
					extractPathSegment(current, SOCIAL_PREVIEW_BASE.h2wiki),
				)
				continue
			}

			if (key === 'githubUsername') {
				social[key] = normalizeNullable(
					extractPathSegment(current, SOCIAL_PREVIEW_BASE.github),
				)
				continue
			}

			if (key === 'bilibiliUrl') {
				social[key] = toBilibiliUrl(current)
				continue
			}

			social[key] = normalizeNullable(current)
		}
	}

	if (Object.keys(social).length) {
		payload.social = social
	}

	const privacy: Record<string, boolean> = {}
	for (const item of privacyItems) {
		if (form.privacy[item.key] !== original.privacy[item.key]) {
			privacy[item.key] = form.privacy[item.key]
		}
	}
	if (Object.keys(privacy).length) {
		payload.privacy = privacy
	}

	return payload
}
