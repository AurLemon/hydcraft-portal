export interface ServerDirectoryLinkedUserSummary {
	username: string
	displayName: string | null
	avatarUrl: string | null
}

export interface ServerDirectoryUserMinecraftSummary {
	mcid: string
	username: string
}

export interface ServerDirectoryUserItem {
	username: string
	displayName: string | null
	avatarUrl: string | null
	bio: string | null
	joinedAt: string | null
	minecraft: ServerDirectoryUserMinecraftSummary | null
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
	luckPermsPrimaryGroup: string | null
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
}
