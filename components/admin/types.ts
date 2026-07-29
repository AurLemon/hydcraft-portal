import type {
	PrivacyKey,
	ProfileLanguage,
	TimezoneMode,
} from '~/utils/profile/edit'
import type { MinecraftAccountSummary } from '~/utils/minecraft/accounts'

export interface PortalBridgeSummary {
	id: string
	bridgeId: string
	module: string
	wsUrl: string
	enabled: boolean
	requestedTopics: string[]
	allowedTopics: string[]
	coreSyncIntervalMinutes: number
	resumeFromSeq: string
	lastConnectionState: string
	lastConnectedAt: string | null
	lastDisconnectedAt: string | null
	lastError: string | null
	hasSecret: boolean
}

export interface MinecraftServerPeriodSummary {
	id: string
	kind: string
	startedAt: string
	endedAt: string | null
	note: string | null
	sortOrder: number
	createdAt: string
	updatedAt: string
}

export interface MinecraftServerMapConfigSummary {
	id: string
	enabled: boolean
	hasTiles: boolean
	tileBaseUrl: string | null
	worldName: string
	mapName: string
	tileExtension: string
	defaultCenterX: number
	defaultCenterZ: number
	defaultZoom: number
	createdAt: string
	updatedAt: string
}

export interface MysqlSourceSummary {
	id: string
	host: string
	port: number
	database: string
	username: string
	enabled: boolean
	syncIntervalSeconds: number
	lastSyncAt: string | null
	lastError: string | null
	hasPassword: boolean
}

export interface MinecraftServerSummary {
	id: string
	serverId: string
	code: string
	shortCode: string
	nameZhCn: string
	nameZhTw: string
	nameEnUs: string
	nameJaJp: string
	host: string
	port: number
	status: string
	isDefault: boolean
	sortOrder: number
	createdAt: string
	updatedAt: string
	portalBridge: PortalBridgeSummary | null
	mapConfig: MinecraftServerMapConfigSummary | null
	periods: MinecraftServerPeriodSummary[]
	authMe: MysqlSourceSummary | null
	luckPerms: MysqlSourceSummary | null
}

export interface MinecraftServersResponse {
	servers: MinecraftServerSummary[]
}

export interface AdminExternalSyncSourceStatus {
	source: 'AUTHME' | 'LUCKPERMS'
	configured: boolean
	enabled: boolean
	database: string | null
	intervalSeconds: number
	running: boolean
	lastStartedAt: string | null
	lastFinishedAt: string | null
	lastSuccessAt: string | null
	lastError: string | null
	rowsRead: number
	rowsMatched: number
	rowsChanged: number
	rowsSkipped: number
}

export interface AdminExternalSyncStatusResponse {
	sources: AdminExternalSyncSourceStatus[]
}

export type AdminExternalSyncSourceName = 'authme' | 'luckperms'

export interface AdminExternalSyncSourceDetailResponse {
	source: AdminExternalSyncSourceName
	config: {
		configured: boolean
		database: string | null
		enabled: boolean
		intervalSeconds: number
	}
	sync: {
		running: boolean
		lastStartedAt: string | null
		lastFinishedAt: string | null
		lastSuccessAt: string | null
		lastError: string | null
		rowsRead: number
		rowsMatched: number
		rowsChanged: number
		rowsSkipped: number
	}
	connection: {
		ok: boolean
		skipped: boolean
		latencyMs: number | null
		errorMessage: string | null
		checkedAt: string | null
	}
}

export interface MinecraftServerResponse {
	server: MinecraftServerSummary
}

export interface MinecraftServerPlayerHistoryPoint {
	observedAt: string
	onlinePlayers: number
	maxPlayers: number | null
}

export interface MinecraftServerPlayerIdentitySummary {
	uuid: string
	username: string
	normalizedUsername: string
	uuidSource: string | null
	lastSeenAt: string | null
}

export interface MinecraftServerPlayerSnapshotSummary {
	observedAt: string
	players: MinecraftServerPlayerIdentitySummary[]
}

export interface MinecraftServerSnapshotSummary {
	id: string
	kind: string
	observedAt: string
	createdAt: string
	payload: unknown
}

export interface PortalBridgeReceiptSummary {
	id?: string
	topic: string
	seq: string | null
	receivedAt: string
	ackedAt: string | null
	payload: unknown
}

export interface PortalBridgeCommandSummary {
	id: string
	commandId: string
	action: string
	status: string
	sentAt: string | null
	completedAt: string | null
	errorMessage: string | null
	payload: unknown
	createdAt: string
}

export interface ExternalSyncTaskStateSummary {
	taskKey: string
	source: string
	reason: string | null
	running: boolean
	intervalSeconds: number
	lastStartedAt: string | null
	lastFinishedAt: string | null
	lastSuccessAt: string | null
	lastError: string | null
	rowsRead: number
	rowsMatched: number
	rowsChanged: number
	rowsSkipped: number
}

export interface ArchiveImportRunSummary {
	id: string
	status: string
	artifactPath: string
	artifactHash: string | null
	artifactServerId: string | null
	artifactServerName: string | null
	artifactVersion: string | null
	scannedAt: string | null
	importedAt: string | null
	playersObserved: number
	playersUpdated: number
	accountsMatched: number
	historicalAccountsCreated: number
	errorMessage: string | null
	createdAt: string
	updatedAt: string
}

export interface MinecraftServerPlayerInfo {
	id: string
	serverId: string
	uuid: string | null
	username: string | null
	normalizedUsername: string | null
	uuidSource: string | null
	firstSeenAt: string | null
	lastSeenAt: string | null
	hasStats: boolean
	hasAdvancements: boolean
	evidenceCount: number
	conflictState: string
	authMe: {
		id: number | null
		username: string | null
		realname: string | null
		email: string | null
		registeredAt: string | null
		lastLoginAt: string | null
		registerIp: string | null
		registerIpLocation: IpLocationSummary | null
		lastIp: string | null
		lastIpLocation: IpLocationSummary | null
		hasTotp: boolean
		syncedAt: string | null
	}
	luckPerms: {
		username: string | null
		primaryGroup: string | null
		syncedAt: string | null
	}
	bridgeSyncedAt: string | null
	createdAt: string
	updatedAt: string
}

export interface MinecraftServerPlayersResponse {
	items: MinecraftServerPlayerInfo[]
	page: number
	pageSize: number
	total: number
	pageCount: number
}

export interface MinecraftServerPlayerSnapshotPlayerInfo {
	id: string
	serverId: string
	uuid: string
	username: string | null
	normalizedUsername: string | null
	uuidSource: string | null
	firstSeenAt: string | null
	lastSeenAt: string | null
	conflictState: string
}

export interface MinecraftServerPlayerSnapshotAuthMeInfo {
	id: number | null
	username: string | null
	realname: string | null
	email: string | null
	registeredAt: string | null
	lastLoginAt: string | null
	registerIp: string | null
	lastIp: string | null
	hasTotp: boolean
	syncedAt: string | null
}

export interface MinecraftServerPlayerSnapshotLuckPermsInfo {
	username: string | null
	primaryGroup: string | null
	syncedAt: string | null
}

export interface MinecraftServerPlayerStatsDetailInfo {
	id: string
	snapshotId: string
	category: string
	key: string
	value: unknown
	valueText: string
	observedAt: string
	lastScannedAt: string | null
	createdAt: string
	player: MinecraftServerPlayerSnapshotPlayerInfo
	authMe: MinecraftServerPlayerSnapshotAuthMeInfo
}

export interface MinecraftServerPlayerStatsSnapshotsResponse {
	items: MinecraftServerPlayerStatsDetailInfo[]
	page: number
	pageSize: number
	total: number
	pageCount: number
}

export interface MinecraftServerPlayerAdvancementDetailInfo {
	id: string
	snapshotId: string
	advancementKey: string
	done: boolean
	criteriaCount: number
	completedCriteriaCount: number
	completedCriteria: string[]
	observedAt: string
	lastScannedAt: string | null
	createdAt: string
	player: MinecraftServerPlayerSnapshotPlayerInfo
	authMe: MinecraftServerPlayerSnapshotAuthMeInfo
}

export interface MinecraftServerPlayerAdvancementsSnapshotsResponse {
	items: MinecraftServerPlayerAdvancementDetailInfo[]
	page: number
	pageSize: number
	total: number
	pageCount: number
}

export interface AdminMinecraftAccountInfo {
	id: string
	username: string
	normalizedUsername: string
	uuid: string | null
	authmeName: string | null
	authmeId: number | null
	authMe: {
		id: number
		username: string
		realname: string | null
		email: string | null
		registeredAt: string | null
		lastLoginAt: string | null
		registerIp: string | null
		registerIpLocation: IpLocationSummary | null
		lastIp: string | null
		lastIpLocation: IpLocationSummary | null
		hasTotp: boolean
		syncedAt: string
	} | null
	luckPerms: {
		uuid: string
		username: string | null
		primaryGroup: string | null
		syncedAt: string
	} | null
	worldJoin: {
		firstJoinedAt: string | null
		lastJoinedAt: string | null
	}
	isPrimary: boolean
	createdAt: string
	updatedAt: string
	user: {
		id: string
		username: string
		displayName: string | null
		email: string | null
		avatarUrl: string | null
	} | null
	serverLinks: AdminMinecraftAccountServerLink[]
}

export interface IpLocationSummary {
	raw: string | null
	country: string | null
	countryCode: string | null
	region: string | null
	province: string | null
	city: string | null
	district: string | null
	isp: string | null
	display: string | null
}

export interface AdminMinecraftAccountServerLink {
	serverId: string
	serverName: string | null
	uuid: string
	username: string | null
	hasStats: boolean
	hasAdvancements: boolean
}

export interface AdminMinecraftAccountSessionHistoryItem {
	serverId: string
	serverName: string | null
	openedAt: string
	closedAt: string | null
}

export interface AdminMinecraftAccountSessionHistoryResponse {
	account: {
		id: string
		username: string
		normalizedUsername: string
		uuid: string | null
	}
	sessions: AdminMinecraftAccountSessionHistoryItem[]
}

export interface AdminMinecraftAccountsResponse {
	items: AdminMinecraftAccountInfo[]
	page: number
	pageSize: number
	total: number
	pageCount: number
}

export interface MinecraftServerOverviewResponse {
	server: MinecraftServerSummary
	metrics: {
		identityCount: number
		serverPlayerCount: number
		openSessionCount: number
		totalSessionCount: number
		latestPlayerSnapshot: MinecraftServerPlayerSnapshotSummary | null
		latestStatus: MinecraftServerPlayerHistoryPoint | null
		playerHistory: MinecraftServerPlayerHistoryPoint[]
	}
	playerInfoPreview: MinecraftServerPlayerInfo[]
	snapshots: MinecraftServerSnapshotSummary[]
	bridge: {
		lastReceipt: PortalBridgeReceiptSummary | null
		recentReceipts: PortalBridgeReceiptSummary[]
		recentCommands: PortalBridgeCommandSummary[]
	}
	syncTaskStates: ExternalSyncTaskStateSummary[]
	archiveImport: {
		latestRun: ArchiveImportRunSummary | null
	}
}

export interface PortalBridgeInspectResponse {
	command: {
		action: string
		commandId: string
		sentAt: string
		timedOut: boolean
	}
	observed: MinecraftServerSnapshotSummary | PortalBridgeReceiptSummary | null
	overview: MinecraftServerOverviewResponse
}

export type AdminUserRole = 'USER' | 'MEMBER' | 'ADMIN' | 'OWNER'
export type AdminUserStatus = 'PENDING' | 'ACTIVE' | 'DISABLED' | 'BANNED'

export interface AdminUser {
	id: string
	username: string
	handle: string
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
	joinedAt: string
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
	minecraftAccounts: MinecraftAccountSummary[]
	historicalMinecraftAccounts: MinecraftAccountSummary[]
}

export interface AdminMinecraftAccountCandidate {
	id: string
	value: string
	label: string
	description: string
	username: string
	uuid: string | null
}

export interface AdminMinecraftAccountCandidatesResponse {
	items: AdminMinecraftAccountCandidate[]
}

export interface AdminUserSecurityOverview {
	status: AdminUserStatus
	role: AdminUserRole
	primaryEmail: string | null
	emailVerifiedAt: string | null
	hasPassword: boolean
	lastLoginAt: string | null
	activeSessionCount: number
	securityEventCount: number
}

export interface AdminUserOAuthConnection {
	id: string
	provider: string
	providerAccountId: string
	providerUsername: string | null
	providerEmail: string | null
	avatarAttachmentId: string | null
	avatarUrl: string | null
	scope: string | null
	connectedAt: string
	lastUsedAt: string | null
	disconnectedAt: string | null
	createdAt: string
	updatedAt: string
}

export interface AdminUserEmail {
	id: string
	email: string
	kind: 'PRIMARY' | 'SECONDARY'
	verifiedAt: string | null
	createdAt: string
	updatedAt: string
}

export interface AdminUserSession {
	id: string
	userAgent: string | null
	ipAddress: string | null
	ipLocation: IpLocationSummary | null
	expiresAt: string
	createdAt: string
	updatedAt: string
	current: boolean
}

export interface AdminUserSecurityEvent {
	id: string
	type: string
	title: string
	description: string | null
	ipAddress: string | null
	ipLocation: IpLocationSummary | null
	userAgent: string | null
	createdAt: string
}

export interface AdminUserSecurityResponse {
	security: {
		overview: AdminUserSecurityOverview
		oauthConnections: AdminUserOAuthConnection[]
		emails: AdminUserEmail[]
		sessions: AdminUserSession[]
		events: AdminUserSecurityEvent[]
	}
}

export interface AdminUserDeletePreviewResponse {
	user: {
		id: string
		username: string
		displayName: string | null
		email: string | null
		role: AdminUserRole
	}
	impact: {
		emails: number
		oauthConnections: number
		refreshTokens: number
		securityEvents: number
		minecraftAccounts: number
		attachments: number
	}
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
