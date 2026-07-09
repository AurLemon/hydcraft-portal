import {
	Prisma,
	type MinecraftServerDataSourceMode,
	type MinecraftServerKind,
	type MinecraftServerPeriodKind,
	type MinecraftServerStatus,
} from '~/generated/prisma/client'
import { prisma } from '../../../utils/db/prisma'
import { requireAdminUser } from '../../../utils/auth/session'
import { createApiError, createBadRequestError } from '../../../utils/errors'
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
	code: string
	shortCode: string
	nameZhCn: string
	nameZhTw: string
	nameEnUs: string
	nameJaJp: string
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

const normalizeStringList = (value: string[] | undefined): string[] =>
	value?.map((item) => item.trim()).filter(Boolean) ?? []

const normalizePortalBridgeSyncIntervalMinutes = (
	value: number | undefined,
): number => Math.max(1, Math.floor(value || 30))

const normalizeRequiredText = (value: string | null | undefined): string =>
	value?.trim() || ''

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

const hasAnyPortalBridgeInput = (
	config: PortalBridgeConfigBody | null | undefined,
): boolean =>
	Boolean(
		config &&
		[
			config.bridgeId,
			config.module,
			config.wsUrl,
			config.secret,
			config.enabled,
			config.requestedTopics?.length,
			config.allowedTopics?.length,
			config.coreSyncIntervalMinutes,
		].some((value) => value !== undefined && value !== null && value !== ''),
	)

const getPortalBridgeCreateInput = (
	config: PortalBridgeConfigBody | null | undefined,
) => {
	if (!hasAnyPortalBridgeInput(config)) {
		return null
	}

	const bridgeId = normalizeRequiredText(config?.bridgeId)
	const module = normalizeRequiredText(config?.module)
	const wsUrl = normalizeRequiredText(config?.wsUrl)

	if (!bridgeId || !module || !wsUrl) {
		throw createBadRequestError(
			'MINECRAFT_SERVER_PORTAL_BRIDGE_CONFIG_INCOMPLETE',
		)
	}

	return {
		bridgeId,
		module,
		wsUrl,
		encryptedSecret: encryptConfigValue(config?.secret),
		enabled: config?.enabled ?? false,
		requestedTopics: normalizeStringList(config?.requestedTopics),
		allowedTopics: normalizeStringList(config?.allowedTopics),
		coreSyncIntervalMinutes: normalizePortalBridgeSyncIntervalMinutes(
			config?.coreSyncIntervalMinutes,
		),
	}
}

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const body = await readBody<CreateMinecraftServerBody>(event)
	let serverId: string

	try {
		serverId = assertMinecraftServerId(body.serverId ?? '')
	} catch {
		throw createBadRequestError('INVALID_MINECRAFT_SERVER_ID')
	}

	const shouldSetDefault = body.isDefault ?? false
	const code = normalizeRequiredText(body.code)
	const shortCode = normalizeRequiredText(body.shortCode)
	const nameZhCn = normalizeRequiredText(body.nameZhCn)
	const nameZhTw = normalizeRequiredText(body.nameZhTw)
	const nameEnUs = normalizeRequiredText(body.nameEnUs)
	const nameJaJp = normalizeRequiredText(body.nameJaJp)
	const portalBridgeInput = getPortalBridgeCreateInput(body.portalBridge)

	if (!code || !shortCode || !nameZhCn || !nameZhTw || !nameEnUs || !nameJaJp) {
		throw createBadRequestError('MINECRAFT_SERVER_REQUIRED_FIELDS_MISSING')
	}

	const [serverIdConflict, codeConflict, portalBridgeConflict] =
		await Promise.all([
			prisma.minecraftServer.findUnique({
				where: { serverId },
				select: { id: true },
			}),
			prisma.minecraftServer.findUnique({
				where: { code },
				select: { id: true },
			}),
			portalBridgeInput
				? prisma.portalBridgeConfig.findFirst({
						where: {
							bridgeId: portalBridgeInput.bridgeId,
							module: portalBridgeInput.module,
						},
						select: { id: true },
					})
				: Promise.resolve(null),
		])

	if (serverIdConflict) {
		throw createApiError({
			statusCode: 409,
			code: 'MINECRAFT_SERVER_ID_CONFLICT',
		})
	}

	if (codeConflict) {
		throw createApiError({
			statusCode: 409,
			code: 'MINECRAFT_SERVER_CODE_CONFLICT',
		})
	}

	if (portalBridgeConflict) {
		throw createApiError({
			statusCode: 409,
			code: 'MINECRAFT_SERVER_PORTAL_BRIDGE_CONFLICT',
		})
	}

	let server

	try {
		server = await prisma.$transaction(async (tx) => {
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
					code,
					shortCode,
					nameZhCn,
					nameZhTw,
					nameEnUs,
					nameJaJp,
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
					portalBridge: portalBridgeInput
						? {
								create: portalBridgeInput,
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
											kind: normalizeEnum(
												period.kind,
												periodKindValues,
												'LIVE',
											),
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
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === 'P2002'
		) {
			throw createApiError({
				statusCode: 409,
				code: portalBridgeInput
					? 'MINECRAFT_SERVER_PORTAL_BRIDGE_CONFLICT'
					: 'MINECRAFT_SERVER_CODE_CONFLICT',
			})
		}

		throw error
	}

	if (server.portalBridge) {
		await emitEvent('minecraft-server.portal-bridge-config.saved', {
			configId: server.portalBridge.id,
		})
	}

	return {
		server: toMinecraftServerSummary(server),
	}
})
