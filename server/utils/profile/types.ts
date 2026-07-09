import type {
	MinecraftAccountStatus,
	TimezoneMode,
	UserGender,
	UserAuthActivitySource,
	UserProfileLanguage,
} from '~/generated/prisma/client'
import type { MinecraftServerLocalizedName } from '~/utils/minecraft/server-name'

export type ProfileActivityOnlineStatus =
	| 'ONLINE'
	| 'OFFLINE'
	| 'RECENTLY_ACTIVE'

export interface UserProfileBadgeSummary {
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
	qqNumber: string | null
	wechatId: string | null
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
	lastSavedLocation: MinecraftPlayerLocationSummary | null
	onlineLocation: MinecraftPlayerLocationSummary | null
	minecraftName: string
	javaUuid: string | null
	bedrockXuid: string | null
	skinPreviewUrl: string | null
	currentServer: string | null
	onlineStatus: ProfileActivityOnlineStatus
	lastActiveAt: Date | null
	minecraftRoles: string[]
	profileUrl: string
	status: MinecraftAccountStatus
}

export interface ServerLocalizedNameSummary extends MinecraftServerLocalizedName {}

export interface MinecraftPlayerLocationSummary {
	worldName: string | null
	dimension: string | null
	x: number | null
	y: number | null
	z: number | null
	yaw?: number | null
	pitch?: number | null
	observedAt: Date | null
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
	createdAt: Date
	joinedAt: Date
	badges: UserProfileBadgeSummary[]
	roleBadge: UserProfileBadgeSummary | null
	verified: UserVerifiedSummary
	bio: string | null
	schoolOrCompany: string | null
	occupationOrMajor: string | null
	location: string | null
	countryOrRegion: string | null
	gender: UserGender
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
	createdAt?: Date
	badges?: UserProfileBadgeSummary[]
	roleBadge?: UserProfileBadgeSummary | null
	verified?: UserVerifiedSummary
	bio?: string | null
	schoolOrCompany?: string | null
	occupationOrMajor?: string | null
	location?: string | null
	countryOrRegion?: string | null
	gender?: UserGender
	birthday?: Date | null
	timezone?: string | null
	social?: UserProfileSocialSummary
	activityStatus?: {
		onlineStatus: ProfileActivityOnlineStatus
		lastActiveAt: Date | null
		source: UserAuthActivitySource | 'LEGACY_LOGIN' | null
	}
	minecraftSummary?: MinecraftProfileSummary | null
	minecraftArchiveSummary?: {
		totalAccounts: number
		totalPlayTimeTicks: number
		totalDeaths: number
		totalLeaveCount: number
		totalDistanceTraveledCm: number
		detailedDuration: {
			years: number
			months: number
			days: number
			hours: number
			minutes: number
			seconds: number
		}
	} | null
	minecraftServerTimeline?: Array<{
		serverId: string
		serverNames: ServerLocalizedNameSummary
		serverShortCode: string
		highlighted: boolean
		playerId: string | null
		earliestFirstJoinedAt: Date | null
	}>
	isOwner: boolean
}
