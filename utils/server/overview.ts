export interface ServerOverviewRgbColor {
	r: number
	g: number
	b: number
}

export const DEFAULT_SERVER_OVERVIEW_PLAYER_ACCENT: Readonly<ServerOverviewRgbColor> =
	{
		r: 124,
		g: 149,
		b: 173,
	}

export interface ServerOverviewObservedPlayer {
	uuid: string
	username: string | null
}

export interface ServerOverviewOnlineHistoryPoint {
	observedAt: string
	onlinePlayers: number
	maxPlayers: number | null
}

export interface ServerOverviewBridgeStatus {
	enabled: boolean
	connected: boolean
	running: boolean
	manualRequired: boolean
	lastHeartbeatAt: string | null
	lastConnectionState: string | null
	onlineCount: number
	maxPlayers: number | null
	observedPlayers: ServerOverviewObservedPlayer[]
	onlineHistory: ServerOverviewOnlineHistoryPoint[]
}

export interface ServerOverviewServerItem {
	serverId: string
	name: string
	bridgeStatus: ServerOverviewBridgeStatus
}

export interface ServerOverviewRecommendedUser {
	username: string
	displayName: string | null
	avatarUrl: string | null
	coverUrl: string | null
	bio: string | null
}

export interface ServerOverviewRecommendedPlayer {
	mcid: string
	username: string
	skinBodyUrl: string
	skinImageUrl: string
	playTimeTicks: number
	hasStats: boolean
	authMeLastLoginAt: string | null
	accentColor: ServerOverviewRgbColor
}

export interface ServerOverviewResponse {
	servers: ServerOverviewServerItem[]
	defaultServerId: string | null
	totalUsers: number
	totalPlayers: number
	recommendedUsers: ServerOverviewRecommendedUser[]
	recommendedPlayers: ServerOverviewRecommendedPlayer[]
}

export interface ServerOverviewLiveResponse {
	servers: ServerOverviewServerItem[]
	defaultServerId: string | null
	totalUsers: number
	totalPlayers: number
}
