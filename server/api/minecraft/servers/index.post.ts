import type {
	MinecraftServerDataSourceMode,
	MinecraftServerKind,
	MinecraftServerPeriodKind,
	MinecraftServerStatus,
} from '~/generated/prisma/client'
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

interface MinecraftServerPeriodBody {
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

interface CreateMinecraftServerBody {
	serverId: string
	code?: string
	name: string
	nameZhCn?: string | null
	nameZhTw?: string | null
	nameEnUs?: string | null
	nameJaJp?: string | null
	host: string
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

const normalizeStringList = (value: string[] | undefined): string[] =>
	value?.map((item) => item.trim()).filter(Boolean) ?? []

const normalizePortalBridgeSyncIntervalMinutes = (
	value: number | undefined,
): number => Math.max(1, Math.floor(value || 30))

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
	fallback: TValue,
): TValue => {
	if (!value) {
		return fallback
	}

	return allowed.has(value as TValue) ? (value as TValue) : fallback
}

const normalizeDateValue = (value: string | null | undefined): Date | null => {
	if (!value) {
		return null
	}

	const parsed = new Date(value)
	return Number.isNaN(parsed.getTime()) ? null : parsed
}

const normalizeOptionalText = (
	value: string | null | undefined,
): string | null => value?.trim() || null

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const body = await readBody<CreateMinecraftServerBody>(event)
	const serverId = assertMinecraftServerId(body.serverId ?? '')
	const shouldSetDefault = body.isDefault ?? false

	const server = await prisma.$transaction(async (tx) => {
		if (shouldSetDefault) {
			await tx.minecraftServer.updateMany({
				where: {
					isDefault: true,
				},
				data: {
					isDefault: false,
				},
			})
		}

		return await tx.minecraftServer.create({
			data: {
				serverId,
				code: body.code?.trim() || serverId,
				name: body.name?.trim() || serverId,
				nameZhCn:
					normalizeOptionalText(body.nameZhCn) ?? body.name?.trim() ?? serverId,
				nameZhTw: normalizeOptionalText(body.nameZhTw),
				nameEnUs: normalizeOptionalText(body.nameEnUs),
				nameJaJp: normalizeOptionalText(body.nameJaJp),
				host: body.host?.trim() || '127.0.0.1',
				port: body.port ?? 25565,
				enabled: body.enabled ?? true,
				kind: normalizeEnum(body.kind, serverKindValues, 'MAIN'),
				status: normalizeEnum(body.status, serverStatusValues, 'LIVE'),
				dataSourceMode: normalizeEnum(
					body.dataSourceMode,
					dataSourceModeValues,
					'PORTAL_BRIDGE',
				),
				isDefault: shouldSetDefault,
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
								coreSyncIntervalMinutes:
									normalizePortalBridgeSyncIntervalMinutes(
										body.portalBridge.coreSyncIntervalMinutes,
									),
							},
						}
					: undefined,
				mapConfig: body.mapConfig
					? {
							create: {
								enabled: body.mapConfig.enabled ?? false,
								hasTiles: body.mapConfig.hasTiles ?? false,
								tileBaseUrl: body.mapConfig.tileBaseUrl?.trim() || null,
								worldName: body.mapConfig.worldName?.trim() || 'world',
								mapName: body.mapConfig.mapName?.trim() || 'flat',
								tileExtension:
									body.mapConfig.tileExtension === 'png' ? 'png' : 'jpg',
								defaultCenterX: body.mapConfig.defaultCenterX ?? 811,
								defaultCenterZ: body.mapConfig.defaultCenterZ ?? 2933,
								defaultZoom: Math.max(
									0,
									Math.floor(body.mapConfig.defaultZoom ?? 0),
								),
							},
						}
					: undefined,
				periods: body.periods?.length
					? {
							create: body.periods.flatMap((period, index) => {
								const startedAt = normalizeDateValue(period.startedAt)

								if (!startedAt) {
									return []
								}

								return [
									{
										kind: normalizeEnum(period.kind, periodKindValues, 'LIVE'),
										startedAt,
										endedAt: normalizeDateValue(period.endedAt ?? null),
										note: period.note?.trim() || null,
										sortOrder: period.sortOrder ?? index,
									},
								]
							}),
						}
					: undefined,
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

	if (server.portalBridge) {
		await emitEvent('minecraft-server.portal-bridge-config.saved', {
			configId: server.portalBridge.id,
		})
	}

	return {
		server: toMinecraftServerSummary(server),
	}
})
