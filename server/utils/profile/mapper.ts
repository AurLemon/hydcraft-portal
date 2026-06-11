import type {
	EditableUserProfile,
	MinecraftProfileSummary,
	PublicUserProfile,
	UserProfileBadgeSummary,
	UserProfilePrivacySummary,
	UserProfileSocialSummary,
} from './types'
import { defaultProfilePrivacy } from './defaults'
import type { ProfileUser } from './repository'

export const USERNAME_CHANGE_COOLDOWN_DAYS = 30

const ROLE_BADGE_VISIBLE_ROLES = new Set(['MEMBER', 'ADMIN', 'OWNER'])

const getCanChangeUsernameAt = (
	usernameChangedAt: Date | null,
): Date | null => {
	if (!usernameChangedAt) {
		return null
	}

	const date = new Date(usernameChangedAt)
	date.setUTCDate(date.getUTCDate() + USERNAME_CHANGE_COOLDOWN_DAYS)

	return date
}

export const toBadgeSummary = (
	badge: ProfileUser['badges'][number],
): UserProfileBadgeSummary => {
	const fallbackLabel = badge.label ?? badge.badge?.labelZhCn ?? ''

	return {
		id: badge.id,
		badgeId: badge.badgeId,
		key: badge.badge?.key ?? null,
		label: fallbackLabel,
		labelZhCn: badge.label ?? badge.badge?.labelZhCn ?? fallbackLabel,
		labelZhTw: badge.label ?? badge.badge?.labelZhTw ?? fallbackLabel,
		labelEnUs: badge.label ?? badge.badge?.labelEnUs ?? fallbackLabel,
		labelJaJp: badge.label ?? badge.badge?.labelJaJp ?? fallbackLabel,
		color: badge.color ?? badge.badge?.color ?? null,
		sortOrder: badge.sortOrder,
	}
}

const toRoleBadgeSummary = (
	user: ProfileUser,
): UserProfileBadgeSummary | null =>
	ROLE_BADGE_VISIBLE_ROLES.has(user.role)
		? {
				id: `role-${user.role.toLowerCase()}`,
				badgeId: null,
				key: 'server-member',
				label: '服务器成员',
				labelZhCn: '服务器成员',
				labelZhTw: '伺服器成員',
				labelEnUs: 'Server Member',
				labelJaJp: 'サーバーメンバー',
				color: 'sky',
				sortOrder: -100,
			}
		: null

const toVerifiedSummary = (user: ProfileUser) => ({
	enabled: user.verified,
	textZhCn: user.verifiedTextZhCn,
	textZhTw: user.verifiedTextZhTw,
	textEnUs: user.verifiedTextEnUs,
	textJaJp: user.verifiedTextJaJp,
})

export const toSocialSummary = (
	user: ProfileUser,
): UserProfileSocialSummary => ({
	h2wikiPageName: user.profile?.h2wikiPageName ?? null,
	githubUsername: user.profile?.githubUsername ?? null,
	websiteUrl: user.profile?.websiteUrl ?? null,
	bilibiliUrl: user.profile?.bilibiliUrl ?? null,
	publicEmail: user.profile?.publicEmail ?? null,
})

export const toPrivacySummary = (
	user: ProfileUser,
): UserProfilePrivacySummary => ({
	...defaultProfilePrivacy,
	...(user.privacy ?? {}),
})

export const toMinecraftSummary = (
	user: ProfileUser,
): MinecraftProfileSummary | null => {
	const account = user.minecraftAccounts[0]

	if (!account) {
		return null
	}

	const lastActiveAt = account.lastSeenAt ?? account.verifiedAt ?? null
	const isOnline =
		lastActiveAt !== null &&
		Date.now() - lastActiveAt.getTime() < 15 * 60 * 1000
	const isRecentlyActive =
		lastActiveAt !== null &&
		Date.now() - lastActiveAt.getTime() < 72 * 60 * 60 * 1000

	return {
		minecraftName: account.username,
		javaUuid: account.uuid,
		bedrockXuid: null,
		skinPreviewUrl: null,
		currentServer: account.isPrimary ? 'HydCraft 主服' : null,
		onlineStatus: isOnline
			? 'ONLINE'
			: isRecentlyActive
				? 'RECENTLY_ACTIVE'
				: 'OFFLINE',
		lastActiveAt,
		minecraftRoles: [],
		profileUrl: '/me/minecraft',
		status: account.status,
	}
}

export const toEditableProfile = (user: ProfileUser): EditableUserProfile => ({
	id: user.id,
	hydrolineId: user.hydrolineId,
	username: user.username,
	usernameChangedAt: user.usernameChangedAt,
	canChangeUsernameAt: getCanChangeUsernameAt(user.usernameChangedAt),
	usernameChangeCooldownDays: USERNAME_CHANGE_COOLDOWN_DAYS,
	displayName: user.displayName,
	avatarUrl: user.avatarUrl,
	coverUrl: user.coverUrl,
	avatarAttachmentId: user.avatarAttachmentId,
	coverAttachmentId: user.coverAttachmentId,
	createdAt: user.createdAt,
	joinedAt: user.joinedAt,
	badges: user.badges.map(toBadgeSummary),
	roleBadge: toRoleBadgeSummary(user),
	verified: toVerifiedSummary(user),
	bio: user.bio,
	location: user.location,
	countryOrRegion: user.countryOrRegion,
	birthday: user.birthday,
	preferences: {
		language: user.preferences?.language ?? 'ZH_CN',
		timezoneMode: user.preferences?.timezoneMode ?? 'AUTO',
		timezone: user.preferences?.timezone ?? 'Asia/Shanghai',
	},
	social: toSocialSummary(user),
	privacy: toPrivacySummary(user),
	minecraftSummary: toMinecraftSummary(user),
})

export const toPublicProfile = (
	user: ProfileUser,
	currentUserId?: string | null,
): PublicUserProfile => {
	const privacy = toPrivacySummary(user)
	const minecraftSummary = toMinecraftSummary(user)
	const profile: PublicUserProfile = {
		username: user.username,
		displayName: user.displayName,
		avatarUrl: user.avatarUrl,
		coverUrl: user.coverUrl,
		isOwner: currentUserId === user.id,
	}

	if (privacy.showHydrolineId) {
		profile.hydrolineId = user.hydrolineId
	}
	if (privacy.showJoinedAt) {
		profile.joinedAt = user.joinedAt
	}
	if (privacy.showBadges) {
		profile.badges = user.badges.map(toBadgeSummary)
		profile.roleBadge = toRoleBadgeSummary(user)
	}
	profile.verified = toVerifiedSummary(user)
	if (privacy.showBio) {
		profile.bio = user.bio
	}
	if (privacy.showLocation) {
		profile.location = user.location
	}
	if (privacy.showCountryOrRegion) {
		profile.countryOrRegion = user.countryOrRegion
	}
	if (privacy.showBirthday) {
		profile.birthday = user.birthday
	}
	if (privacy.showSocialLinks) {
		profile.social = toSocialSummary(user)
	}
	if (privacy.showActivityStatus && minecraftSummary) {
		profile.activityStatus = {
			onlineStatus: minecraftSummary.onlineStatus,
			lastActiveAt: minecraftSummary.lastActiveAt,
		}
	}
	if (privacy.showMinecraftProfileLink) {
		profile.minecraftSummary = minecraftSummary
	}

	return profile
}
