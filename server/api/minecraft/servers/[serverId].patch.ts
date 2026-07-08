import type {
	MinecraftServerDataSourceMode,
	MinecraftServerKind,
	MinecraftServerPeriodKind,
	MinecraftServerStatus,
} from '~/generated/prisma/client'
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

interface MinecraftServerPeriodBody {
	id?: string
	kind?: string
	startedAt: string
	endedAt?: string | null
	note?: string | null
	sortOrder?: number
}

interface MinecraftServerMapConfigBody {
	enabled?: boolean
	hasTiles?: boolean
	tileBaseUrl?: string | null
	worldName?: string
	mapName?: string
	tileExtension?: string
	defaultCenterX?: number
	defaultCenterZ?: number
	defaultZoom?: number
}

interface UpdateMinecraftServerBody {
	serverId?: string
	code?: string
	name?: string
	nameZhCn?: string | null
	nameZhTw?: string | null
	nameEnUs?: string | null
	nameJaJp?: string | null
	host?: string
	port?: number
	enabled?: boolean
	kind?: string
	status?: string
	dataSourceMode?: string
	isDefault?: boolean
	sortOrder?: number
	portalBridge?: PortalBridgeConfigBody | null
	mapConfig?: MinecraftServerMapConfigBody | null
	periods?: MinecraftServerPeriodBody[]
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

const serverKindValues = new Set<MinecraftServerKind>([
	'MAIN',
	'ARCHIVE',
	'EVENT',
	'TEST',
])
const serverStatusValues = new Set<MinecraftServerStatus>([
	'PLANNED',
	'LIVE',
	'FROZEN',
	'ARCHIVED',
	'HIDDEN',
])
const dataSourceModeValues = new Set<MinecraftServerDataSourceMode>([
	'PORTAL_BRIDGE',
	'IMPORTED',
	'MIXED',
])
const periodKindValues = new Set<MinecraftServerPeriodKind>([
	'LIVE',
	'ARCHIVE',
	'EVENT',
	'MAINTENANCE',
	'OTHER',
])

const normalizeEnum = <TValue extends string>(
	value: string | undefined,
	allowed: Set<TValue>,
): TValue | undefined => {
	if (value === undefined) {
		return undefined
	}

	return allowed.has(value as TValue) ? (value as TValue) : undefined
}

const normalizeDateValue = (value: string | null | undefined): Date | null => {
	if (!value) {
		return null
	}

	const parsed = new Date(value)
	return Number.isNaN(parsed.getTime()) ? null : parsed
}

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

	if (body.mapConfig) {
		await prisma.minecraftServerMapConfig.upsert({
			where: {
				minecraftServerId: existing.id,
			},
			create: {
				minecraftServerId: existing.id,
				enabled: body.mapConfig.enabled ?? false,
				hasTiles: body.mapConfig.hasTiles ?? false,
				tileBaseUrl: body.mapConfig.tileBaseUrl?.trim() || null,
				worldName: body.mapConfig.worldName?.trim() || 'world',
				mapName: body.mapConfig.mapName?.trim() || 'flat',
				tileExtension: body.mapConfig.tileExtension === 'png' ? 'png' : 'jpg',
				defaultCenterX: body.mapConfig.defaultCenterX ?? 811,
				defaultCenterZ: body.mapConfig.defaultCenterZ ?? 2933,
				defaultZoom: Math.max(0, Math.floor(body.mapConfig.defaultZoom ?? 0)),
			},
			update: {
				enabled: body.mapConfig.enabled,
				hasTiles: body.mapConfig.hasTiles,
				tileBaseUrl:
					body.mapConfig.tileBaseUrl === undefined
						? undefined
						: body.mapConfig.tileBaseUrl?.trim() || null,
				worldName: normalizeOptionalText(body.mapConfig.worldName) ?? undefined,
				mapName: normalizeOptionalText(body.mapConfig.mapName) ?? undefined,
				tileExtension:
					body.mapConfig.tileExtension === undefined
						? undefined
						: body.mapConfig.tileExtension === 'png'
							? 'png'
							: 'jpg',
				defaultCenterX: body.mapConfig.defaultCenterX,
				defaultCenterZ: body.mapConfig.defaultCenterZ,
				defaultZoom:
					body.mapConfig.defaultZoom === undefined
						? undefined
						: Math.max(0, Math.floor(body.mapConfig.defaultZoom || 0)),
			},
		})
	}

	if (body.periods) {
		await prisma.minecraftServerPeriod.deleteMany({
			where: {
				minecraftServerId: existing.id,
			},
		})

		const periods = body.periods.flatMap((period, index) => {
			const startedAt = normalizeDateValue(period.startedAt)

			if (!startedAt) {
				return []
			}

			return [
				{
					minecraftServerId: existing.id,
					kind: normalizeEnum(period.kind, periodKindValues) ?? 'LIVE',
					startedAt,
					endedAt: normalizeDateValue(period.endedAt ?? null),
					note: period.note?.trim() || null,
					sortOrder: period.sortOrder ?? index,
				},
			]
		})

		if (periods.length > 0) {
			await prisma.minecraftServerPeriod.createMany({
				data: periods,
			})
		}
	}

	const server = await prisma.$transaction(async (tx) => {
		if (body.isDefault === true) {
			await tx.minecraftServer.updateMany({
				where: {
					isDefault: true,
					NOT: {
						id: existing.id,
					},
				},
				data: {
					isDefault: false,
				},
			})
		}

		return await tx.minecraftServer.update({
			where: {
				serverId,
			},
			data: {
				serverId: nextServerId,
				code: normalizeOptionalText(body.code) ?? undefined,
				name: normalizeOptionalText(body.name) ?? undefined,
				nameZhCn:
					body.nameZhCn === undefined
						? undefined
						: normalizeOptionalText(body.nameZhCn),
				nameZhTw:
					body.nameZhTw === undefined
						? undefined
						: normalizeOptionalText(body.nameZhTw),
				nameEnUs:
					body.nameEnUs === undefined
						? undefined
						: normalizeOptionalText(body.nameEnUs),
				nameJaJp:
					body.nameJaJp === undefined
						? undefined
						: normalizeOptionalText(body.nameJaJp),
				host: normalizeOptionalText(body.host) ?? undefined,
				port: body.port,
				enabled: body.enabled,
				kind: normalizeEnum(body.kind, serverKindValues),
				status: normalizeEnum(body.status, serverStatusValues),
				dataSourceMode: normalizeEnum(
					body.dataSourceMode,
					dataSourceModeValues,
				),
				isDefault: body.isDefault,
				sortOrder: body.sortOrder,
			},
			include: {
				portalBridge: true,
				mapConfig: true,
				periods: {
					orderBy: [{ sortOrder: 'asc' }, { startedAt: 'asc' }],
				},
			},
		})
	})

	return {
		server: toMinecraftServerSummary(server),
	}
})
