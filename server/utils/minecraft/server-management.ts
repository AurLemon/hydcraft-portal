import {
	Prisma,
	type MinecraftServerPeriodKind,
	type MinecraftServerStatus,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { createApiError, createBadRequestError } from '../errors'
import { emitEvent } from '../events/event-bus'
import { encryptConfigValue } from '../security/encryption'
import { assertMinecraftServerId } from './normalize'
import { toMinecraftServerSummary } from './server-config'

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

export interface CreateMinecraftServerInput {
	serverId: string
	code: string
	shortCode: string
	nameZhCn: string
	nameZhTw: string
	nameEnUs: string
	nameJaJp: string
	host?: string
	port?: number
	status?: string
	isDefault?: boolean
	sortOrder?: number
	portalBridge?: PortalBridgeConfigBody | null
	mapConfig?: MinecraftServerMapConfigBody | null
	periods?: MinecraftServerPeriodBody[]
	authMe?: SourceConfigBody | null
	luckPerms?: SourceConfigBody | null
}

export type UpdateMinecraftServerInput = Partial<CreateMinecraftServerInput>

const statusValues = new Set<MinecraftServerStatus>(['ONLINE', 'ARCHIVED'])
const periodKindValues = new Set<MinecraftServerPeriodKind>([
	'LIVE',
	'ARCHIVE',
	'EVENT',
	'MAINTENANCE',
	'OTHER',
])

const optionalText = (value: string | null | undefined) =>
	value === undefined ? undefined : value?.trim() || null

const requiredText = (value: string | null | undefined) => {
	if (value === undefined) return undefined
	const normalized = value?.trim() ?? ''
	if (!normalized)
		throw createBadRequestError('MINECRAFT_SERVER_REQUIRED_FIELDS_MISSING')
	return normalized
}

const normalizeStatus = (
	value: string | undefined,
	fallback?: MinecraftServerStatus,
): MinecraftServerStatus | undefined => {
	if (value === undefined) return fallback
	if (!statusValues.has(value as MinecraftServerStatus)) {
		throw createBadRequestError('MINECRAFT_SERVER_STATUS_INVALID')
	}
	return value as MinecraftServerStatus
}

const normalizeList = (value: string[] | undefined) =>
	value?.map((item) => item.trim()).filter(Boolean)

const normalizeInterval = (value: number | undefined) =>
	value === undefined ? undefined : Math.max(1, Math.floor(value || 30))

const normalizeDate = (value: string | null | undefined) => {
	if (!value) return null
	const date = new Date(value)
	return Number.isNaN(date.getTime()) ? null : date
}

const buildPeriods = (periods: MinecraftServerPeriodBody[]) =>
	periods.flatMap((period, index) => {
		const startedAt = normalizeDate(period.startedAt)
		if (!startedAt) return []
		const kind = period.kind as MinecraftServerPeriodKind
		return [
			{
				kind: periodKindValues.has(kind) ? kind : 'LIVE',
				startedAt,
				endedAt: normalizeDate(period.endedAt),
				note: period.note?.trim() || null,
				sortOrder: period.sortOrder ?? index,
			},
		]
	})

const serverInclude = {
	portalBridge: true,
	mapConfig: true,
	periods: { orderBy: [{ sortOrder: 'asc' }, { startedAt: 'asc' }] },
} satisfies Prisma.MinecraftServerInclude

const assertOnlineBridge = (
	bridge: PortalBridgeConfigBody | null | undefined,
) => {
	if (
		!bridge?.bridgeId?.trim() ||
		!bridge.module?.trim() ||
		!bridge.wsUrl?.trim() ||
		!bridge.secret?.trim()
	) {
		throw createBadRequestError(
			'MINECRAFT_SERVER_PORTAL_BRIDGE_CONFIG_INCOMPLETE',
		)
	}
}

const publishLifecycle = async (
	serverId: string,
	status: MinecraftServerStatus,
) => {
	await emitEvent('minecraft-server.lifecycle.updated', { serverId, status })
}

export const createMinecraftServer = async (
	input: CreateMinecraftServerInput,
) => {
	let serverId: string
	try {
		serverId = assertMinecraftServerId(input.serverId)
	} catch {
		throw createBadRequestError('INVALID_MINECRAFT_SERVER_ID')
	}
	const code = requiredText(input.code)
	const shortCode = requiredText(input.shortCode)
	const nameZhCn = requiredText(input.nameZhCn)
	const nameZhTw = requiredText(input.nameZhTw)
	const nameEnUs = requiredText(input.nameEnUs)
	const nameJaJp = requiredText(input.nameJaJp)
	if (!code || !shortCode || !nameZhCn || !nameZhTw || !nameEnUs || !nameJaJp)
		throw createBadRequestError('MINECRAFT_SERVER_REQUIRED_FIELDS_MISSING')
	const status = normalizeStatus(input.status, 'ONLINE')!
	if (status === 'ONLINE') assertOnlineBridge(input.portalBridge)

	try {
		const server = await prisma.$transaction(async (tx) => {
			if (
				await tx.minecraftServer.findFirst({
					where: { OR: [{ serverId }, { code }] },
					select: { id: true },
				})
			) {
				throw createApiError({
					statusCode: 409,
					code: 'MINECRAFT_SERVER_CODE_CONFLICT',
				})
			}
			if (status === 'ONLINE') {
				const bridge = input.portalBridge!
				if (
					await tx.portalBridgeConfig.findFirst({
						where: {
							bridgeId: bridge.bridgeId!.trim(),
							module: bridge.module!.trim(),
						},
						select: { id: true },
					})
				) {
					throw createApiError({
						statusCode: 409,
						code: 'MINECRAFT_SERVER_PORTAL_BRIDGE_CONFLICT',
					})
				}
			}
			if (input.isDefault)
				await tx.minecraftServer.updateMany({
					where: { isDefault: true },
					data: { isDefault: false },
				})
			return await tx.minecraftServer.create({
				data: {
					serverId,
					code,
					shortCode,
					nameZhCn,
					nameZhTw,
					nameEnUs,
					nameJaJp,
					host: input.host?.trim() || '127.0.0.1',
					port: input.port ?? 25565,
					status,
					isDefault: input.isDefault ?? false,
					sortOrder: input.sortOrder ?? 0,
					portalBridge:
						status === 'ONLINE'
							? {
									create: {
										bridgeId: input.portalBridge!.bridgeId!.trim(),
										module: input.portalBridge!.module!.trim(),
										wsUrl: input.portalBridge!.wsUrl!.trim(),
										encryptedSecret: encryptConfigValue(
											input.portalBridge!.secret,
										),
										requestedTopics:
											normalizeList(input.portalBridge!.requestedTopics) ?? [],
										allowedTopics:
											normalizeList(input.portalBridge!.allowedTopics) ?? [],
										coreSyncIntervalMinutes:
											normalizeInterval(
												input.portalBridge!.coreSyncIntervalMinutes,
											) ?? 30,
									},
								}
							: undefined,
					mapConfig: input.mapConfig
						? {
								create: {
									enabled: input.mapConfig.enabled ?? false,
									hasTiles: input.mapConfig.hasTiles ?? false,
									tileBaseUrl: input.mapConfig.tileBaseUrl?.trim() || null,
									worldName: input.mapConfig.worldName?.trim() || 'world',
									mapName: input.mapConfig.mapName?.trim() || 'flat',
									tileExtension:
										input.mapConfig.tileExtension === 'png' ? 'png' : 'jpg',
									defaultCenterX: input.mapConfig.defaultCenterX ?? 811,
									defaultCenterZ: input.mapConfig.defaultCenterZ ?? 2933,
									defaultZoom: Math.max(
										0,
										Math.floor(input.mapConfig.defaultZoom ?? 0),
									),
								},
							}
						: undefined,
					periods: input.periods?.length
						? { create: buildPeriods(input.periods) }
						: undefined,
				},
				include: serverInclude,
			})
		})
		await publishLifecycle(server.serverId, server.status)
		return { server: toMinecraftServerSummary(server) }
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === 'P2002'
		)
			throw createApiError({
				statusCode: 409,
				code: 'MINECRAFT_SERVER_CODE_CONFLICT',
			})
		throw error
	}
}

export const updateMinecraftServer = async (
	serverId: string,
	input: UpdateMinecraftServerInput,
) => {
	const nextServerId =
		input.serverId === undefined
			? undefined
			: (() => {
					try {
						return assertMinecraftServerId(input.serverId!)
					} catch {
						throw createBadRequestError('INVALID_MINECRAFT_SERVER_ID')
					}
				})()
	const nextCode = requiredText(input.code)
	const nextShortCode = requiredText(input.shortCode)
	const nextStatus = normalizeStatus(input.status)
	const result = await prisma.$transaction(async (tx) => {
		const existing = await tx.minecraftServer.findUnique({
			where: { serverId },
			include: { portalBridge: true },
		})
		if (!existing)
			throw createApiError({
				statusCode: 404,
				code: 'MINECRAFT_SERVER_NOT_FOUND',
			})
		const status = nextStatus ?? existing.status
		if (
			nextServerId &&
			nextServerId !== serverId &&
			(await tx.minecraftServer.findUnique({
				where: { serverId: nextServerId },
				select: { id: true },
			}))
		)
			throw createApiError({
				statusCode: 409,
				code: 'MINECRAFT_SERVER_ID_CONFLICT',
			})
		if (
			nextCode &&
			nextCode !== existing.code &&
			(await tx.minecraftServer.findUnique({
				where: { code: nextCode },
				select: { id: true },
			}))
		)
			throw createApiError({
				statusCode: 409,
				code: 'MINECRAFT_SERVER_CODE_CONFLICT',
			})

		if (status === 'ONLINE') {
			const bridge = input.portalBridge
			const restoring = existing.status === 'ARCHIVED'
			if (!existing.portalBridge && !bridge)
				throw createBadRequestError(
					'MINECRAFT_SERVER_PORTAL_BRIDGE_CONFIG_INCOMPLETE',
				)
			if (restoring && !bridge?.secret?.trim())
				throw createBadRequestError(
					'MINECRAFT_SERVER_PORTAL_BRIDGE_SECRET_REQUIRED',
				)
			if (bridge) {
				const bridgeId =
					optionalText(bridge.bridgeId) ?? existing.portalBridge?.bridgeId
				const module =
					optionalText(bridge.module) ?? existing.portalBridge?.module
				const wsUrl = optionalText(bridge.wsUrl) ?? existing.portalBridge?.wsUrl
				if (
					!bridgeId ||
					!module ||
					!wsUrl ||
					bridge.secret === null ||
					(!existing.portalBridge?.encryptedSecret && !bridge.secret?.trim())
				)
					throw createBadRequestError(
						'MINECRAFT_SERVER_PORTAL_BRIDGE_CONFIG_INCOMPLETE',
					)
				const conflict = await tx.portalBridgeConfig.findFirst({
					where: { bridgeId, module, NOT: { minecraftServerId: existing.id } },
					select: { id: true },
				})
				if (conflict)
					throw createApiError({
						statusCode: 409,
						code: 'MINECRAFT_SERVER_PORTAL_BRIDGE_CONFLICT',
					})
				await tx.portalBridgeConfig.upsert({
					where: { minecraftServerId: existing.id },
					create: {
						minecraftServerId: existing.id,
						bridgeId,
						module,
						wsUrl,
						encryptedSecret: encryptConfigValue(bridge.secret),
						requestedTopics: normalizeList(bridge.requestedTopics) ?? [],
						allowedTopics: normalizeList(bridge.allowedTopics) ?? [],
						coreSyncIntervalMinutes:
							normalizeInterval(bridge.coreSyncIntervalMinutes) ?? 30,
					},
					update: {
						bridgeId,
						module,
						wsUrl,
						encryptedSecret:
							bridge.secret === undefined
								? undefined
								: encryptConfigValue(bridge.secret),
						requestedTopics: normalizeList(bridge.requestedTopics),
						allowedTopics: normalizeList(bridge.allowedTopics),
						coreSyncIntervalMinutes: normalizeInterval(
							bridge.coreSyncIntervalMinutes,
						),
					},
				})
			}
		} else if (existing.portalBridge) {
			await tx.portalBridgeConfig.update({
				where: { id: existing.portalBridge.id },
				data: { encryptedSecret: null },
			})
		}

		if (input.mapConfig)
			await tx.minecraftServerMapConfig.upsert({
				where: { minecraftServerId: existing.id },
				create: {
					minecraftServerId: existing.id,
					enabled: input.mapConfig.enabled ?? false,
					hasTiles: input.mapConfig.hasTiles ?? false,
					tileBaseUrl: input.mapConfig.tileBaseUrl?.trim() || null,
					worldName: input.mapConfig.worldName?.trim() || 'world',
					mapName: input.mapConfig.mapName?.trim() || 'flat',
					tileExtension:
						input.mapConfig.tileExtension === 'png' ? 'png' : 'jpg',
					defaultCenterX: input.mapConfig.defaultCenterX ?? 811,
					defaultCenterZ: input.mapConfig.defaultCenterZ ?? 2933,
					defaultZoom: Math.max(
						0,
						Math.floor(input.mapConfig.defaultZoom ?? 0),
					),
				},
				update: {
					enabled: input.mapConfig.enabled,
					hasTiles: input.mapConfig.hasTiles,
					tileBaseUrl:
						input.mapConfig.tileBaseUrl === undefined
							? undefined
							: input.mapConfig.tileBaseUrl?.trim() || null,
					worldName: optionalText(input.mapConfig.worldName) ?? undefined,
					mapName: optionalText(input.mapConfig.mapName) ?? undefined,
					tileExtension:
						input.mapConfig.tileExtension === undefined
							? undefined
							: input.mapConfig.tileExtension === 'png'
								? 'png'
								: 'jpg',
					defaultCenterX: input.mapConfig.defaultCenterX,
					defaultCenterZ: input.mapConfig.defaultCenterZ,
					defaultZoom:
						input.mapConfig.defaultZoom === undefined
							? undefined
							: Math.max(0, Math.floor(input.mapConfig.defaultZoom || 0)),
				},
			})
		if (input.periods) {
			await tx.minecraftServerPeriod.deleteMany({
				where: { minecraftServerId: existing.id },
			})
			const periods = buildPeriods(input.periods).map((period) => ({
				...period,
				minecraftServerId: existing.id,
			}))
			if (periods.length)
				await tx.minecraftServerPeriod.createMany({ data: periods })
		}
		if (status === 'ARCHIVED' && input.isDefault)
			throw createBadRequestError('MINECRAFT_SERVER_ARCHIVED_CANNOT_BE_DEFAULT')
		if (status === 'ARCHIVED' && existing.isDefault) {
			const replacement = await tx.minecraftServer.findFirst({
				where: { status: 'ONLINE', NOT: { id: existing.id } },
				orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
				select: { id: true },
			})
			if (!replacement)
				throw createBadRequestError(
					'MINECRAFT_SERVER_ARCHIVED_CANNOT_BE_DEFAULT',
				)
			await tx.minecraftServer.update({
				where: { id: replacement.id },
				data: { isDefault: true },
			})
		}
		if (input.isDefault)
			await tx.minecraftServer.updateMany({
				where: { isDefault: true, NOT: { id: existing.id } },
				data: { isDefault: false },
			})
		const server = await tx.minecraftServer.update({
			where: { serverId },
			data: {
				serverId: nextServerId,
				code: nextCode,
				shortCode: nextShortCode,
				nameZhCn: requiredText(input.nameZhCn),
				nameZhTw: requiredText(input.nameZhTw),
				nameEnUs: requiredText(input.nameEnUs),
				nameJaJp: requiredText(input.nameJaJp),
				host: optionalText(input.host) ?? undefined,
				port: input.port,
				status,
				isDefault: status === 'ARCHIVED' ? false : input.isDefault,
				sortOrder: input.sortOrder,
			},
			include: serverInclude,
		})
		return server
	})
	await publishLifecycle(result.serverId, result.status)
	return { server: toMinecraftServerSummary(result) }
}
