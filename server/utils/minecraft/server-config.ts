import type {
	MinecraftServer,
	MinecraftServerBlueMapConfig,
	MinecraftServerPeriod,
	PortalBridgeConfig,
} from '~/generated/prisma/client'

export const toBlueMapDimensions = (value: unknown): string[] => {
	if (!Array.isArray(value)) return []

	const dimensions = new Map<string, string>()
	for (const item of value) {
		const legacyDimension =
			item && typeof item === 'object'
				? (item as Record<string, unknown>).dimension
				: null
		const dimension =
			typeof item === 'string'
				? item.trim()
				: typeof legacyDimension === 'string'
					? legacyDimension.trim()
					: ''
		if (dimension) dimensions.set(dimension.toLowerCase(), dimension)
	}

	return [...dimensions.values()]
}

export const resolveBlueMapDimensionAssetsUrl = (
	assetsBaseUrl: string,
	dimension: string,
): string =>
	`${assetsBaseUrl.replace(/\/+$/, '')}/${dimension.replace(/^\/+/, '')}`

interface ServerWithConfigs extends MinecraftServer {
	portalBridge: PortalBridgeConfig | null
	blueMapConfig: MinecraftServerBlueMapConfig | null
	periods: MinecraftServerPeriod[]
}

type LauncherServerDirectoryItem = Pick<
	MinecraftServer,
	| 'id'
	| 'serverId'
	| 'code'
	| 'shortCode'
	| 'nameZhCn'
	| 'nameZhTw'
	| 'nameEnUs'
	| 'nameJaJp'
	| 'status'
	| 'isDefault'
	| 'sortOrder'
>

export const toPublicLauncherServerDirectoryItem = (
	server: LauncherServerDirectoryItem,
) => ({
	id: server.id,
	serverId: server.serverId,
	code: server.code,
	shortCode: server.shortCode,
	nameZhCn: server.nameZhCn,
	nameZhTw: server.nameZhTw,
	nameEnUs: server.nameEnUs,
	nameJaJp: server.nameJaJp,
	enabled: true,
	status: server.status,
	isDefault: server.isDefault,
	sortOrder: server.sortOrder,
})

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
	status: server.status,
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
	blueMapConfig: server.blueMapConfig
		? (() => {
				const dimensions = toBlueMapDimensions(server.blueMapConfig.dimensions)
				return {
					id: server.blueMapConfig.id,
					assetsBaseUrl: server.blueMapConfig.assetsBaseUrl,
					defaultAssetsBaseUrl: resolveBlueMapDimensionAssetsUrl(
						server.blueMapConfig.assetsBaseUrl,
						dimensions[0] ?? '',
					),
					dimensions,
					createdAt: server.blueMapConfig.createdAt.toISOString(),
					updatedAt: server.blueMapConfig.updatedAt.toISOString(),
				}
			})()
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
