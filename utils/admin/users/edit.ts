import dayjs from 'dayjs'
import type { AdminBuilderRank, AdminUser } from '~/components/admin/types'
import {
	countryItems,
	privacyItems,
	type PrivacyKey,
	type ProfileLanguage,
	type TimezoneMode,
} from '~/utils/profile/edit'

export interface AdminUserSelectItem {
	label: string
	value: string
}

export interface AdminUserForm {
	username: string
	hydrolineId: string
	displayName: string
	joinedAt: string
	bio: string
	location: string
	countryOrRegion: string
	birthday: string
	builderRank: AdminBuilderRank | null
	builderRankComments: {
		zhCn: string
		zhTw: string
		enUs: string
		jaJp: string
	}
	role: AdminUser['role']
	status: AdminUser['status']
	statusReason: string
	verified: boolean
	verifiedTextZhCn: string
	verifiedTextZhTw: string
	verifiedTextEnUs: string
	verifiedTextJaJp: string
	badgeIds: string[]
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

export type AdminUserSaveSection =
	| 'identity'
	| 'hydroline'
	| 'profile'
	| 'avatar'
	| 'cover'
	| 'minecraft-bind'
	| 'historical-minecraft-bind'
	| 'preferences'
	| 'social'
	| 'achievements'
	| 'builder-rank'
	| 'privacy'

/**
 * Section 字段纵向布局：标签在上、控件在下。
 * 与 /me/profile 的 ProfileField 横向布局不同——admin 字段多，纵向更紧凑。
 */
export const adminFieldClass =
	'grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 [&>span]:text-slate-500 dark:[&>span]:text-slate-400'

export const adminReadonlyFieldClass =
	'grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 [&>span]:text-slate-500 dark:[&>span]:text-slate-400 [&>strong]:break-all [&>strong]:text-xs [&>strong]:text-slate-950 dark:[&>strong]:text-slate-100'

export const adminMediaFrameClass =
	'relative flex h-36 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950'

export const adminMediaEmptyClass =
	'flex h-full w-full items-center justify-center gap-2 p-4 text-center text-sm text-slate-500 dark:text-slate-400'

export const adminToggleRowClass =
	'flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800'

export const createEmptyAdminUserForm = (): AdminUserForm => ({
	username: '',
	hydrolineId: '',
	displayName: '',
	joinedAt: '',
	bio: '',
	location: '',
	countryOrRegion: '',
	birthday: '',
	builderRank: null,
	builderRankComments: {
		zhCn: '',
		zhTw: '',
		enUs: '',
		jaJp: '',
	},
	role: 'USER',
	status: 'ACTIVE',
	statusReason: '',
	verified: false,
	verifiedTextZhCn: '',
	verifiedTextZhTw: '',
	verifiedTextEnUs: '',
	verifiedTextJaJp: '',
	badgeIds: [],
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
	privacy: Object.fromEntries(
		privacyItems.map((item) => [item.key, true]),
	) as Record<PrivacyKey, boolean>,
})

export const assignAdminUserForm = (
	form: AdminUserForm,
	user: AdminUser,
): void => {
	form.username = user.username
	form.hydrolineId = user.hydrolineId
	form.displayName = user.displayName ?? ''
	form.joinedAt = dayjs(user.joinedAt).format('YYYY-MM-DD')
	form.bio = user.bio ?? ''
	form.location = user.location ?? ''
	form.countryOrRegion = user.countryOrRegion ?? ''
	form.birthday = user.birthday ? dayjs(user.birthday).format('YYYY-MM-DD') : ''
	form.builderRank = user.builderRank.rank
	form.builderRankComments.zhCn = user.builderRank.comments.zhCn ?? ''
	form.builderRankComments.zhTw = user.builderRank.comments.zhTw ?? ''
	form.builderRankComments.enUs = user.builderRank.comments.enUs ?? ''
	form.builderRankComments.jaJp = user.builderRank.comments.jaJp ?? ''
	form.role = user.role
	form.status = user.status
	form.statusReason = user.statusReason ?? ''
	form.verified = user.verified
	form.verifiedTextZhCn = user.verifiedTextZhCn ?? ''
	form.verifiedTextZhTw = user.verifiedTextZhTw ?? ''
	form.verifiedTextEnUs = user.verifiedTextEnUs ?? ''
	form.verifiedTextJaJp = user.verifiedTextJaJp ?? ''
	form.badgeIds = user.badges
		.map((badge) => badge.badgeId)
		.filter((badgeId): badgeId is string => Boolean(badgeId))
	form.preferences.language = user.preferences?.language ?? 'ZH_CN'
	form.preferences.timezoneMode = user.preferences?.timezoneMode ?? 'AUTO'
	form.preferences.timezone = user.preferences?.timezone ?? 'Asia/Shanghai'
	form.social.h2wikiPageName = user.profile?.h2wikiPageName ?? ''
	form.social.githubUsername = user.profile?.githubUsername ?? ''
	form.social.websiteUrl = user.profile?.websiteUrl ?? ''
	form.social.bilibiliUrl = user.profile?.bilibiliUrl ?? ''
	form.social.qqNumber = user.profile?.qqNumber ?? ''
	form.social.wechatId = user.profile?.wechatId ?? ''
	form.social.publicEmail = user.profile?.publicEmail ?? ''

	for (const item of privacyItems) {
		form.privacy[item.key] = user.privacy?.[item.key] ?? true
	}
}

export const buildLocalizedCountryItems = (
	t: (key: string) => string,
): AdminUserSelectItem[] =>
	countryItems.map((item) => ({
		value: item.value,
		label: t(`profile.options.country.${item.key}`),
	}))
