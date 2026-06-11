import dayjs from 'dayjs'

export type ProfileLanguage = 'ZH_CN' | 'ZH_TW' | 'EN_US' | 'JA_JP'
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
	joinedAt: string
	badges: ProfileBadge[]
	roleBadge: ProfileBadge | null
	verified: ProfileVerified
	bio: string | null
	location: string | null
	countryOrRegion: string | null
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
	countryOrRegion: string
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
		publicEmail: string
	}
	privacy: Record<PrivacyKey, boolean>
}

export interface ProfileResponse {
	profile: EditableProfile
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
export const timezoneItems = [
	{ label: 'Asia/Shanghai', value: 'Asia/Shanghai' },
	{ label: 'Asia/Singapore', value: 'Asia/Singapore' },
	{ label: 'Asia/Tokyo', value: 'Asia/Tokyo' },
	{ label: 'UTC', value: 'UTC' },
]
export const countryItems = [
	{ label: '中国内地', value: '中国内地' },
	{ label: '中国香港', value: '中国香港' },
	{ label: '中国台湾', value: '中国台湾' },
	{ label: '中国澳门', value: '中国澳门' },
	{ label: '海外地区', value: '海外地区' },
]
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
	countryOrRegion: '',
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
	form.countryOrRegion = countryItems.some(
		(item) => item.value === countryOrRegion,
	)
		? (countryOrRegion ?? '')
		: ''
	form.birthday = toDateInput(value.birthday)
	form.preferences.language = value.preferences.language
	form.preferences.timezoneMode = value.preferences.timezoneMode
	form.preferences.timezone = value.preferences.timezone ?? 'Asia/Shanghai'
	form.social.h2wikiPageName = value.social.h2wikiPageName ?? ''
	form.social.githubUsername = value.social.githubUsername ?? ''
	form.social.websiteUrl = value.social.websiteUrl ?? ''
	form.social.bilibiliUrl = value.social.bilibiliUrl ?? ''
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
		['countryOrRegion', form.countryOrRegion, original.countryOrRegion ?? ''],
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
	const socialEntries = [
		[
			'h2wikiPageName',
			form.social.h2wikiPageName,
			original.social.h2wikiPageName ?? '',
		],
		[
			'githubUsername',
			form.social.githubUsername,
			original.social.githubUsername ?? '',
		],
		['websiteUrl', form.social.websiteUrl, original.social.websiteUrl ?? ''],
		['bilibiliUrl', form.social.bilibiliUrl, original.social.bilibiliUrl ?? ''],
		['publicEmail', form.social.publicEmail, original.social.publicEmail ?? ''],
	] as const

	for (const [key, current, initial] of socialEntries) {
		if (current !== initial) {
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
