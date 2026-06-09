import type {
	MinecraftAccountStatus,
	TimezoneMode,
	UserProfileLanguage,
} from '~/generated/prisma/client'

export interface UserProfileBadgeSummary {
	id: string
	badgeId: string | null
	key: string | null
	label: string
	color: string | null
	sortOrder: number
}

export interface UserVerifiedSummary {
	enabled: boolean
	textZhCn: string | null
	textZhTw: string | null
	textEnUs: string | null
	textJaJp: string | null
}

export interface UserProfileSocialSummary {
	h2wikiPageName: string | null
	githubUsername: string | null
	websiteUrl: string | null
	bilibiliUrl: string | null
	publicEmail: string | null
}

export interface UserProfilePreferencesSummary {
	language: UserProfileLanguage
	timezoneMode: TimezoneMode
	timezone: string | null
}

export interface UserProfilePrivacySummary {
	publicProfile: boolean
	showHydrolineId: boolean
	showJoinedAt: boolean
	showLocation: boolean
	showCountryOrRegion: boolean
	showBirthday: boolean
	showBadges: boolean
	showBio: boolean
	showMinecraftProfileLink: boolean
	showSocialLinks: boolean
	showActivityStatus: boolean
	searchableInUserDirectory: boolean
	allowMinecraftProfileDiscovery: boolean
}

export interface MinecraftProfileSummary {
	minecraftName: string
	javaUuid: string | null
	bedrockXuid: string | null
	skinPreviewUrl: string | null
	currentServer: string | null
	onlineStatus: 'ONLINE' | 'OFFLINE' | 'RECENTLY_ACTIVE'
	lastActiveAt: Date | null
	minecraftRoles: string[]
	profileUrl: string
	status: MinecraftAccountStatus
}

export interface EditableUserProfile {
	id: string
	hydrolineId: string
	username: string
	usernameChangedAt: Date | null
	canChangeUsernameAt: Date | null
	usernameChangeCooldownDays: number
	displayName: string | null
	avatarUrl: string | null
	coverUrl: string | null
	avatarAttachmentId: string | null
	coverAttachmentId: string | null
	joinedAt: Date
	badges: UserProfileBadgeSummary[]
	roleBadge: UserProfileBadgeSummary | null
	verified: UserVerifiedSummary
	bio: string | null
	location: string | null
	countryOrRegion: string | null
	birthday: Date | null
	preferences: UserProfilePreferencesSummary
	social: UserProfileSocialSummary
	privacy: UserProfilePrivacySummary
	minecraftSummary: MinecraftProfileSummary | null
}

export interface PublicUserProfile {
	hydrolineId?: string
	username: string
	displayName: string | null
	avatarUrl: string | null
	coverUrl: string | null
	joinedAt?: Date
	badges?: UserProfileBadgeSummary[]
	roleBadge?: UserProfileBadgeSummary | null
	verified?: UserVerifiedSummary
	bio?: string | null
	location?: string | null
	countryOrRegion?: string | null
	birthday?: Date | null
	social?: UserProfileSocialSummary
	activityStatus?: {
		onlineStatus: MinecraftProfileSummary['onlineStatus']
		lastActiveAt: Date | null
	}
	minecraftSummary?: MinecraftProfileSummary | null
	isOwner: boolean
}
