import { prisma } from '../../../utils/db/prisma'
import { requireAdminUser } from '../../../utils/auth/session'
import { createApiError, createBadRequestError } from '../../../utils/errors'
import { encryptConfigValue } from '../../../utils/security/encryption'
import { toMinecraftServerSummary } from '../../../utils/minecraft/server-config'
import { assertMinecraftServerId } from '../../../utils/minecraft/normalize'
import { emitEvent } from '../../../utils/events/event-bus'

interface SourceConfigBody {
	host?: string
	port?: number
	database?: string
	username?: string
	password?: string | null
	enabled?: boolean
	syncIntervalSeconds?: number
}

interface PortalBridgeConfigBody {
	bridgeId?: string
	module?: string
	wsUrl?: string
	secret?: string | null
	enabled?: boolean
	requestedTopics?: string[]
	allowedTopics?: string[]
	coreSyncIntervalMinutes?: number
}

interface UpdateMinecraftServerBody {
	serverId?: string
	code?: string
	name?: string
	host?: string
	port?: number
	enabled?: boolean
	sortOrder?: number
	portalBridge?: PortalBridgeConfigBody | null
	authMe?: SourceConfigBody | null
	luckPerms?: SourceConfigBody | null
}

const normalizeOptionalText = (
	value: string | null | undefined,
): string | null | undefined => {
	if (value === undefined) {
		return undefined
	}

	return value?.trim() || null
}

const normalizeStringList = (
	value: string[] | undefined,
): string[] | undefined => value?.map((item) => item.trim()).filter(Boolean)

const normalizePortalBridgeSyncIntervalMinutes = (
	value: number | undefined,
): number | undefined =>
	value === undefined ? undefined : Math.max(1, Math.floor(value || 30))

const hasPortalBridgeConnectionFields = (
	config: PortalBridgeConfigBody,
): boolean =>
	config.bridgeId !== undefined ||
	config.module !== undefined ||
	config.wsUrl !== undefined ||
	config.secret !== undefined ||
	config.enabled !== undefined ||
	config.requestedTopics !== undefined ||
	config.allowedTopics !== undefined

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const serverId = getRouterParam(event, 'serverId') ?? ''
	const body = await readBody<UpdateMinecraftServerBody>(event)
	const existing = await prisma.minecraftServer.findUnique({
		where: {
			serverId,
		},
		select: {
			id: true,
			portalBridge: {
				select: {
					id: true,
				},
			},
		},
	})

	if (!existing) {
		throw createApiError({
			statusCode: 404,
			code: 'MINECRAFT_SERVER_NOT_FOUND',
		})
	}

	let nextServerId: string | undefined

	if (body.serverId !== undefined) {
		try {
			nextServerId = assertMinecraftServerId(body.serverId)
		} catch {
			throw createBadRequestError('INVALID_MINECRAFT_SERVER_ID')
		}
	}

	if (nextServerId && nextServerId !== serverId) {
		const conflict = await prisma.minecraftServer.findUnique({
			where: {
				serverId: nextServerId,
			},
			select: {
				id: true,
			},
		})

		if (conflict) {
			throw createApiError({
				statusCode: 409,
				code: 'MINECRAFT_SERVER_ID_CONFLICT',
			})
		}
	}

	if (
		body.portalBridge &&
		(existing.portalBridge ||
			hasPortalBridgeConnectionFields(body.portalBridge))
	) {
		const portalBridgeConfig = await prisma.portalBridgeConfig.upsert({
			where: {
				minecraftServerId: existing.id,
			},
			create: {
				minecraftServerId: existing.id,
				bridgeId: body.portalBridge.bridgeId?.trim() || `${serverId}-bridge`,
				module: body.portalBridge.module?.trim() || 'portalbridge-core',
				wsUrl: body.portalBridge.wsUrl?.trim() || 'ws://127.0.0.1:28546',
				encryptedSecret: encryptConfigValue(body.portalBridge.secret),
				enabled: body.portalBridge.enabled ?? false,
				requestedTopics:
					normalizeStringList(body.portalBridge.requestedTopics) ?? [],
				allowedTopics:
					normalizeStringList(body.portalBridge.allowedTopics) ?? [],
				coreSyncIntervalMinutes:
					normalizePortalBridgeSyncIntervalMinutes(
						body.portalBridge.coreSyncIntervalMinutes,
					) ?? 30,
			},
			update: {
				bridgeId:
					normalizeOptionalText(body.portalBridge.bridgeId) ?? undefined,
				module: normalizeOptionalText(body.portalBridge.module) ?? undefined,
				wsUrl: normalizeOptionalText(body.portalBridge.wsUrl) ?? undefined,
				encryptedSecret:
					body.portalBridge.secret === undefined
						? undefined
						: encryptConfigValue(body.portalBridge.secret),
				enabled: body.portalBridge.enabled,
				requestedTopics: normalizeStringList(body.portalBridge.requestedTopics),
				allowedTopics: normalizeStringList(body.portalBridge.allowedTopics),
				coreSyncIntervalMinutes: normalizePortalBridgeSyncIntervalMinutes(
					body.portalBridge.coreSyncIntervalMinutes,
				),
			},
		})

		await emitEvent('minecraft-server.portal-bridge-config.saved', {
			configId: portalBridgeConfig.id,
		})
	}

	const server = await prisma.minecraftServer.update({
		where: {
			serverId,
		},
		data: {
			serverId: nextServerId,
			code: normalizeOptionalText(body.code) ?? undefined,
			name: normalizeOptionalText(body.name) ?? undefined,
			host: normalizeOptionalText(body.host) ?? undefined,
			port: body.port,
			enabled: body.enabled,
			sortOrder: body.sortOrder,
		},
		include: {
			portalBridge: true,
		},
	})

	return {
		server: toMinecraftServerSummary(server),
	}
})
