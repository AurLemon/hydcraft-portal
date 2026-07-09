import type {
	MinecraftServer,
	MinecraftServerMapConfig,
	MinecraftServerPeriod,
	PortalBridgeConfig,
} from '~/generated/prisma/client'

interface ServerWithConfigs extends MinecraftServer {
	portalBridge: PortalBridgeConfig | null
	mapConfig: MinecraftServerMapConfig | null
	periods: MinecraftServerPeriod[]
}

export const toMinecraftServerSummary = (server: ServerWithConfigs) => ({
	id: server.id,
	serverId: server.serverId,
	code: server.code,
	shortCode: server.shortCode,
	nameZhCn: server.nameZhCn,
	nameZhTw: server.nameZhTw,
	nameEnUs: server.nameEnUs,
	nameJaJp: server.nameJaJp,
	host: server.host,
	port: server.port,
	enabled: server.enabled,
	kind: server.kind,
	status: server.status,
	dataSourceMode: server.dataSourceMode,
	isDefault: server.isDefault,
	sortOrder: server.sortOrder,
	createdAt: server.createdAt.toISOString(),
	updatedAt: server.updatedAt.toISOString(),
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
				streamEpoch: server.portalBridge.streamEpoch,
				resumeFromSeq: server.portalBridge.resumeFromSeq.toString(),
				lastConnectionState: server.portalBridge.lastConnectionState,
				lastConnectedAt: server.portalBridge.lastConnectedAt,
				lastDisconnectedAt: server.portalBridge.lastDisconnectedAt,
				lastError: server.portalBridge.lastError,
				hasSecret: Boolean(server.portalBridge.encryptedSecret),
			}
		: null,
	mapConfig: server.mapConfig
		? {
				id: server.mapConfig.id,
				enabled: server.mapConfig.enabled,
				hasTiles: server.mapConfig.hasTiles,
				tileBaseUrl: server.mapConfig.tileBaseUrl,
				worldName: server.mapConfig.worldName,
				mapName: server.mapConfig.mapName,
				tileExtension: server.mapConfig.tileExtension,
				defaultCenterX: server.mapConfig.defaultCenterX,
				defaultCenterZ: server.mapConfig.defaultCenterZ,
				defaultZoom: server.mapConfig.defaultZoom,
				createdAt: server.mapConfig.createdAt.toISOString(),
				updatedAt: server.mapConfig.updatedAt.toISOString(),
			}
		: null,
	periods: server.periods.map((period) => ({
		id: period.id,
		kind: period.kind,
		startedAt: period.startedAt.toISOString(),
		endedAt: period.endedAt?.toISOString() ?? null,
		note: period.note,
		sortOrder: period.sortOrder,
		createdAt: period.createdAt.toISOString(),
		updatedAt: period.updatedAt.toISOString(),
	})),
	authMe: null,
	luckPerms: null,
})
