import type {
	PrivacyKey,
	ProfileLanguage,
	TimezoneMode,
} from '~/utils/profile-edit'

export interface PortalBridgeSummary {
	id: string
	bridgeId: string
	module: string
	wsUrl: string
	enabled: boolean
	requestedTopics: string[]
	allowedTopics: string[]
	resumeFromSeq: string
	lastConnectionState: string
	lastConnectedAt: string | null
	lastDisconnectedAt: string | null
	lastError: string | null
	hasSecret: boolean
}

export interface MysqlSourceSummary {
	id: string
	host: string
	port: number
	database: string
	username: string
	enabled: boolean
	lastSyncAt: string | null
	lastError: string | null
	hasPassword: boolean
}

export interface MinecraftServerSummary {
	id: string
	serverId: string
	code: string
	name: string
	description: string | null
	host: string
	port: number
	enabled: boolean
	sortOrder: number
	createdAt: string
	updatedAt: string
	portalBridge: PortalBridgeSummary | null
	authMe: MysqlSourceSummary | null
	luckPerms: MysqlSourceSummary | null
}

export interface MinecraftServersResponse {
	servers: MinecraftServerSummary[]
}

export interface MinecraftServerResponse {
	server: MinecraftServerSummary
}

export type AdminUserRole = 'USER' | 'MEMBER' | 'ADMIN' | 'OWNER'
export type AdminUserStatus = 'PENDING' | 'ACTIVE' | 'DISABLED' | 'BANNED'

export interface AdminUser {
	id: string
	username: string
	hydrolineId: string
	displayName: string | null
	email: string | null
	avatarUrl: string | null
	coverUrl: string | null
	avatarAttachmentId: string | null
	coverAttachmentId: string | null
	bio: string | null
	location: string | null
	countryOrRegion: string | null
	birthday: string | null
	role: AdminUserRole
	status: AdminUserStatus
	statusReason: string | null
	verified: boolean
	verifiedTextZhCn: string | null
	verifiedTextZhTw: string | null
	verifiedTextEnUs: string | null
	verifiedTextJaJp: string | null
	createdAt: string
	updatedAt: string
	profile: {
		h2wikiPageName: string | null
		githubUsername: string | null
		websiteUrl: string | null
		bilibiliUrl: string | null
		qqNumber: string | null
		wechatId: string | null
		publicEmail: string | null
	} | null
	preferences: {
		language: ProfileLanguage
		timezoneMode: TimezoneMode
		timezone: string | null
	} | null
	privacy: Record<PrivacyKey, boolean> | null
	badges: Array<{
		id: string
		badgeId: string | null
		label: string | null
		color: string | null
		sortOrder: number
	}>
}

export interface AdminUsersResponse {
	items: AdminUser[]
	page: number
	pageSize: number
	total: number
	pageCount: number
}

export interface AdminBadge {
	id: string
	labelZhCn: string
	color: string
	enabled: boolean
}

export interface AdminAchievementsResponse {
	badges: AdminBadge[]
}
