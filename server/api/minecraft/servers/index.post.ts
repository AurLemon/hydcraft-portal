import { prisma } from '../../../utils/db/prisma'
import { requireAdminUser } from '../../../utils/auth/session'
import { encryptConfigValue } from '../../../utils/security/encryption'
import { assertMinecraftServerId } from '../../../utils/minecraft/normalize'
import { toMinecraftServerSummary } from '../../../utils/minecraft/server-config'
import { emitEvent } from '../../../utils/events/event-bus'

interface SourceConfigBody {
	host: string
	port?: number
	database: string
	username: string
	password?: string | null
	enabled?: boolean
	syncIntervalSeconds?: number
}

interface PortalBridgeConfigBody {
	bridgeId: string
	module?: string
	wsUrl: string
	secret?: string | null
	enabled?: boolean
	requestedTopics?: string[]
	allowedTopics?: string[]
	coreSyncIntervalMinutes?: number
}

interface CreateMinecraftServerBody {
	serverId: string
	code?: string
	name: string
	host: string
	port?: number
	enabled?: boolean
	sortOrder?: number
	portalBridge?: PortalBridgeConfigBody | null
	authMe?: SourceConfigBody | null
	luckPerms?: SourceConfigBody | null
}

const normalizeStringList = (value: string[] | undefined): string[] =>
	value?.map((item) => item.trim()).filter(Boolean) ?? []

const normalizePortalBridgeSyncIntervalMinutes = (
	value: number | undefined,
): number => Math.max(1, Math.floor(value || 30))

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const body = await readBody<CreateMinecraftServerBody>(event)
	const serverId = assertMinecraftServerId(body.serverId ?? '')

	const server = await prisma.minecraftServer.create({
		data: {
			serverId,
			code: body.code?.trim() || serverId,
			name: body.name?.trim() || serverId,
			host: body.host?.trim() || '127.0.0.1',
			port: body.port ?? 25565,
			enabled: body.enabled ?? true,
			sortOrder: body.sortOrder ?? 0,
			portalBridge: body.portalBridge
				? {
						create: {
							bridgeId: body.portalBridge.bridgeId.trim(),
							module: body.portalBridge.module?.trim() || 'portalbridge-core',
							wsUrl: body.portalBridge.wsUrl.trim(),
							encryptedSecret: encryptConfigValue(body.portalBridge.secret),
							enabled: body.portalBridge.enabled ?? false,
							requestedTopics: normalizeStringList(
								body.portalBridge.requestedTopics,
							),
							allowedTopics: normalizeStringList(
								body.portalBridge.allowedTopics,
							),
							coreSyncIntervalMinutes: normalizePortalBridgeSyncIntervalMinutes(
								body.portalBridge.coreSyncIntervalMinutes,
							),
						},
					}
				: undefined,
		},
		include: {
			portalBridge: true,
		},
	})

	if (server.portalBridge) {
		await emitEvent('minecraft-server.portal-bridge-config.saved', {
			configId: server.portalBridge.id,
		})
	}

	return {
		server: toMinecraftServerSummary(server),
	}
})
