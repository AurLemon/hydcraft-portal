import type {
	AuthMeSourceConfig,
	LuckPermsSourceConfig,
	MinecraftServer,
	PortalBridgeConfig,
} from '~/generated/prisma/client'

interface ServerWithConfigs extends MinecraftServer {
	portalBridge: PortalBridgeConfig | null
	authMe: AuthMeSourceConfig | null
	luckPerms: LuckPermsSourceConfig | null
}

export const toMinecraftServerSummary = (server: ServerWithConfigs) => ({
	id: server.id,
	serverId: server.serverId,
	code: server.code,
	name: server.name,
	host: server.host,
	port: server.port,
	enabled: server.enabled,
	sortOrder: server.sortOrder,
	createdAt: server.createdAt,
	updatedAt: server.updatedAt,
	portalBridge: server.portalBridge
		? {
				id: server.portalBridge.id,
				bridgeId: server.portalBridge.bridgeId,
				module: server.portalBridge.module,
				wsUrl: server.portalBridge.wsUrl,
				enabled: server.portalBridge.enabled,
				requestedTopics: server.portalBridge.requestedTopics,
				allowedTopics: server.portalBridge.allowedTopics,
				resumeFromSeq: server.portalBridge.resumeFromSeq.toString(),
				lastConnectionState: server.portalBridge.lastConnectionState,
				lastConnectedAt: server.portalBridge.lastConnectedAt,
				lastDisconnectedAt: server.portalBridge.lastDisconnectedAt,
				lastError: server.portalBridge.lastError,
				hasSecret: Boolean(server.portalBridge.encryptedSecret),
			}
		: null,
	authMe: server.authMe
		? {
				id: server.authMe.id,
				host: server.authMe.host,
				port: server.authMe.port,
				database: server.authMe.database,
				username: server.authMe.username,
				enabled: server.authMe.enabled,
				lastSyncAt: server.authMe.lastSyncAt,
				lastError: server.authMe.lastError,
				hasPassword: Boolean(server.authMe.encryptedPassword),
			}
		: null,
	luckPerms: server.luckPerms
		? {
				id: server.luckPerms.id,
				host: server.luckPerms.host,
				port: server.luckPerms.port,
				database: server.luckPerms.database,
				username: server.luckPerms.username,
				enabled: server.luckPerms.enabled,
				lastSyncAt: server.luckPerms.lastSyncAt,
				lastError: server.luckPerms.lastError,
				hasPassword: Boolean(server.luckPerms.encryptedPassword),
			}
		: null,
})
