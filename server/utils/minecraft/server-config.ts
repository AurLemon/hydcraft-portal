import type {
	MinecraftServer,
	PortalBridgeConfig,
} from '~/generated/prisma/client'

interface ServerWithConfigs extends MinecraftServer {
	portalBridge: PortalBridgeConfig | null
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
				coreSyncIntervalMinutes: server.portalBridge.coreSyncIntervalMinutes,
				resumeFromSeq: server.portalBridge.resumeFromSeq.toString(),
				lastConnectionState: server.portalBridge.lastConnectionState,
				lastConnectedAt: server.portalBridge.lastConnectedAt,
				lastDisconnectedAt: server.portalBridge.lastDisconnectedAt,
				lastError: server.portalBridge.lastError,
				hasSecret: Boolean(server.portalBridge.encryptedSecret),
			}
		: null,
	authMe: null,
	luckPerms: null,
})
