export interface ServerDirectoryLinkedUserSummary {
	username: string
	displayName: string | null
	avatarUrl: string | null
}

export interface ServerDirectoryUserMinecraftSummary {
	mcid: string
	username: string
}

export interface ServerDirectoryUserBadgeSummary {
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

export interface ServerDirectoryUserVerifiedSummary {
	enabled: boolean
	textZhCn: string | null
	textZhTw: string | null
	textEnUs: string | null
	textJaJp: string | null
}

export interface ServerDirectoryUserItem {
	hydrolineId: string | null
	username: string
	displayName: string | null
	avatarUrl: string | null
	bio: string | null
	registeredAt: string | null
	joinedAt: string | null
	playTimeTicks: number
	hasPlayTime: boolean
	minecraftAccounts: ServerDirectoryUserMinecraftSummary[]
	badges: ServerDirectoryUserBadgeSummary[]
	roleBadge: ServerDirectoryUserBadgeSummary | null
	verified: ServerDirectoryUserVerifiedSummary
}

export interface ServerDirectoryUsersResponse {
	items: ServerDirectoryUserItem[]
	page: number
	pageSize: number
	total: number
	pageCount: number
}

export interface ServerDirectoryPlayerItem {
	id: string
	mcid: string
	username: string
	uuid: string | null
	isPrimary: boolean
	identityKind: 'AUTHENTICATED' | 'HISTORICAL'
	luckPermsPrimaryGroup: string | null
	authMeRegisteredAt: string | null
	authMeLastLoginAt: string | null
	playTimeTicks: number
	hasStats: boolean
	linkedUser: ServerDirectoryLinkedUserSummary | null
}

export interface ServerDirectoryPlayersResponse {
	items: ServerDirectoryPlayerItem[]
	page: number
	pageSize: number
	total: number
	pageCount: number
	formalCount: number
	historicalCount: number
}
