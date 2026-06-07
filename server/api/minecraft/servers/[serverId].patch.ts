import { prisma } from '../../../utils/db/prisma'
import { requireAdminUser } from '../../../utils/auth/session'
import { encryptConfigValue } from '../../../utils/security/encryption'
import { toMinecraftServerSummary } from '../../../utils/minecraft/server-config'

interface SourceConfigBody {
	host?: string
	port?: number
	database?: string
	username?: string
	password?: string | null
	enabled?: boolean
}

interface PortalBridgeConfigBody {
	bridgeId?: string
	module?: string
	wsUrl?: string
	secret?: string | null
	enabled?: boolean
	requestedTopics?: string[]
	allowedTopics?: string[]
}

interface UpdateMinecraftServerBody {
	code?: string
	name?: string
	description?: string | null
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
		},
	})

	if (!existing) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Minecraft server not found',
		})
	}

	if (body.portalBridge) {
		await prisma.portalBridgeConfig.upsert({
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
			},
		})
	}

	if (body.authMe) {
		await prisma.authMeSourceConfig.upsert({
			where: {
				minecraftServerId: existing.id,
			},
			create: {
				minecraftServerId: existing.id,
				host: body.authMe.host?.trim() || '127.0.0.1',
				port: body.authMe.port ?? 3306,
				database: body.authMe.database?.trim() || 'authme',
				username: body.authMe.username?.trim() || 'readonly',
				encryptedPassword: encryptConfigValue(body.authMe.password),
				enabled: body.authMe.enabled ?? false,
			},
			update: {
				host: normalizeOptionalText(body.authMe.host) ?? undefined,
				port: body.authMe.port,
				database: normalizeOptionalText(body.authMe.database) ?? undefined,
				username: normalizeOptionalText(body.authMe.username) ?? undefined,
				encryptedPassword:
					body.authMe.password === undefined
						? undefined
						: encryptConfigValue(body.authMe.password),
				enabled: body.authMe.enabled,
			},
		})
	}

	if (body.luckPerms) {
		await prisma.luckPermsSourceConfig.upsert({
			where: {
				minecraftServerId: existing.id,
			},
			create: {
				minecraftServerId: existing.id,
				host: body.luckPerms.host?.trim() || '127.0.0.1',
				port: body.luckPerms.port ?? 3306,
				database: body.luckPerms.database?.trim() || 'luckperms',
				username: body.luckPerms.username?.trim() || 'readonly',
				encryptedPassword: encryptConfigValue(body.luckPerms.password),
				enabled: body.luckPerms.enabled ?? false,
			},
			update: {
				host: normalizeOptionalText(body.luckPerms.host) ?? undefined,
				port: body.luckPerms.port,
				database: normalizeOptionalText(body.luckPerms.database) ?? undefined,
				username: normalizeOptionalText(body.luckPerms.username) ?? undefined,
				encryptedPassword:
					body.luckPerms.password === undefined
						? undefined
						: encryptConfigValue(body.luckPerms.password),
				enabled: body.luckPerms.enabled,
			},
		})
	}

	const server = await prisma.minecraftServer.update({
		where: {
			serverId,
		},
		data: {
			code: normalizeOptionalText(body.code) ?? undefined,
			name: normalizeOptionalText(body.name) ?? undefined,
			description: normalizeOptionalText(body.description),
			host: normalizeOptionalText(body.host) ?? undefined,
			port: body.port,
			enabled: body.enabled,
			sortOrder: body.sortOrder,
		},
		include: {
			portalBridge: true,
			authMe: true,
			luckPerms: true,
		},
	})

	return {
		server: toMinecraftServerSummary(server),
	}
})
