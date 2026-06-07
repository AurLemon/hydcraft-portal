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
