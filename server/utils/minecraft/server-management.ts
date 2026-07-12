import {
	Prisma,
	type MinecraftServerDataSourceMode,
	type MinecraftServerKind,
	type MinecraftServerPeriodKind,
	type MinecraftServerStatus,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { createApiError, createBadRequestError } from '../errors'
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

export interface UpdateMinecraftServerInput {
	serverId?: string
	code?: string
	shortCode?: string
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

const normalizeOptionalText = (
	value: string | null | undefined,
): string | null | undefined => {
	if (value === undefined) {
		return undefined
	}

	return value?.trim() || null
}

const normalizeRequiredText = (
	value: string | null | undefined,
): string | undefined => {
	if (value === undefined) {
		return undefined
	}

	const normalized = value?.trim() || ''

	if (!normalized) {
		throw createBadRequestError('MINECRAFT_SERVER_REQUIRED_FIELDS_MISSING')
	}

	return normalized
}

const normalizeStringList = (
	value: string[] | undefined,
): string[] | undefined => value?.map((item) => item.trim()).filter(Boolean)

const normalizePortalBridgeSyncIntervalMinutes = (
	value: number | undefined,
): number | undefined =>
	value === undefined ? undefined : Math.max(1, Math.floor(value || 30))

const normalizeEnum = <TValue extends string>(
	value: string | undefined,
	allowed: Set<TValue>,
	fallback?: TValue,
): TValue | undefined => {
	if (value === undefined) {
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

const hasAnyPortalBridgeInput = (config: PortalBridgeConfigBody): boolean =>
	[
		config.bridgeId,
		config.module,
		config.wsUrl,
		config.secret,
		config.enabled,
		config.requestedTopics?.length,
		config.allowedTopics?.length,
		config.coreSyncIntervalMinutes,
	].some((value) => value !== undefined && value !== null && value !== '')

const buildPeriods = (periods: MinecraftServerPeriodBody[]) =>
	periods.flatMap((period, index) => {
		const startedAt = normalizeDateValue(period.startedAt)

		if (!startedAt) {
			return []
		}

		return [
			{
				kind: normalizeEnum(period.kind, periodKindValues, 'LIVE')!,
				startedAt,
				endedAt: normalizeDateValue(period.endedAt ?? null),
				note: period.note?.trim() || null,
				sortOrder: period.sortOrder ?? index,
			},
		]
	})

const buildServerPeriods = (
	periods: MinecraftServerPeriodBody[],
	minecraftServerId: string,
) => buildPeriods(periods).map((period) => ({ ...period, minecraftServerId }))

const serverInclude = {
	portalBridge: true,
	mapConfig: true,
	periods: {
		orderBy: [{ sortOrder: 'asc' }, { startedAt: 'asc' }],
	},
} satisfies Prisma.MinecraftServerInclude

const toConflictError = (error: unknown, fallback: string): never => {
	if (
		error instanceof Prisma.PrismaClientKnownRequestError &&
		error.code === 'P2002'
	) {
		throw createApiError({ statusCode: 409, code: fallback })
	}

	throw error
}

export const createMinecraftServer = async (
	input: CreateMinecraftServerInput,
) => {
	let serverId: string

	try {
		serverId = assertMinecraftServerId(input.serverId ?? '')
	} catch {
		throw createBadRequestError('INVALID_MINECRAFT_SERVER_ID')
	}

	const code = normalizeRequiredText(input.code)
	const shortCode = normalizeRequiredText(input.shortCode)
	const nameZhCn = normalizeRequiredText(input.nameZhCn)
	const nameZhTw = normalizeRequiredText(input.nameZhTw)
	const nameEnUs = normalizeRequiredText(input.nameEnUs)
	const nameJaJp = normalizeRequiredText(input.nameJaJp)

	if (!code || !shortCode || !nameZhCn || !nameZhTw || !nameEnUs || !nameJaJp) {
		throw createBadRequestError('MINECRAFT_SERVER_REQUIRED_FIELDS_MISSING')
	}

	const bridge = input.portalBridge
	const shouldCreateBridge = bridge ? hasAnyPortalBridgeInput(bridge) : false

	if (
		shouldCreateBridge &&
		(!bridge?.bridgeId?.trim() ||
			!bridge.module?.trim() ||
			!bridge.wsUrl?.trim())
	) {
		throw createBadRequestError(
			'MINECRAFT_SERVER_PORTAL_BRIDGE_CONFIG_INCOMPLETE',
		)
	}

	try {
		const server = await prisma.$transaction(async (tx) => {
			const [idConflict, codeConflict, bridgeConflict] = await Promise.all([
				tx.minecraftServer.findUnique({
					where: { serverId },
					select: { id: true },
				}),
				tx.minecraftServer.findUnique({
					where: { code },
					select: { id: true },
				}),
				shouldCreateBridge
					? tx.portalBridgeConfig.findFirst({
							where: {
								bridgeId: bridge!.bridgeId!.trim(),
								module: bridge!.module!.trim(),
							},
							select: { id: true },
						})
					: Promise.resolve(null),
			])

			if (idConflict) {
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
			if (bridgeConflict) {
				throw createApiError({
					statusCode: 409,
					code: 'MINECRAFT_SERVER_PORTAL_BRIDGE_CONFLICT',
				})
			}

			const isDefault = input.isDefault ?? false
			if (isDefault) {
				await tx.minecraftServer.updateMany({
					where: { isDefault: true },
					data: { isDefault: false },
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
					host: input.host?.trim() || '127.0.0.1',
					port: input.port ?? 25565,
					enabled: input.enabled ?? true,
					kind: normalizeEnum(input.kind, serverKindValues, 'MAIN')!,
					status: normalizeEnum(input.status, serverStatusValues, 'LIVE')!,
					dataSourceMode: normalizeEnum(
						input.dataSourceMode,
						dataSourceModeValues,
						'PORTAL_BRIDGE',
					)!,
					isDefault,
					sortOrder: input.sortOrder ?? 0,
					portalBridge: shouldCreateBridge
						? {
								create: {
									bridgeId: bridge!.bridgeId!.trim(),
									module: bridge!.module!.trim(),
									wsUrl: bridge!.wsUrl!.trim(),
									encryptedSecret: encryptConfigValue(bridge!.secret),
									enabled: bridge!.enabled ?? false,
									requestedTopics:
										normalizeStringList(bridge!.requestedTopics) ?? [],
									allowedTopics:
										normalizeStringList(bridge!.allowedTopics) ?? [],
									coreSyncIntervalMinutes:
										normalizePortalBridgeSyncIntervalMinutes(
											bridge!.coreSyncIntervalMinutes,
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

		return {
			server: toMinecraftServerSummary(server),
			portalBridgeConfigId: server.portalBridge?.id ?? null,
		}
	} catch (error) {
		return toConflictError(
			error,
			shouldCreateBridge
				? 'MINECRAFT_SERVER_PORTAL_BRIDGE_CONFLICT'
				: 'MINECRAFT_SERVER_CODE_CONFLICT',
		)
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
	const nextCode = normalizeRequiredText(input.code)
	const nextShortCode = normalizeRequiredText(input.shortCode)
	const nextNameZhCn = normalizeRequiredText(input.nameZhCn)
	const nextNameZhTw = normalizeRequiredText(input.nameZhTw)
	const nextNameEnUs = normalizeRequiredText(input.nameEnUs)
	const nextNameJaJp = normalizeRequiredText(input.nameJaJp)

	try {
		const result = await prisma.$transaction(async (tx) => {
			const existing = await tx.minecraftServer.findUnique({
				where: { serverId },
				select: {
					id: true,
					portalBridge: {
						select: { id: true, bridgeId: true, module: true },
					},
				},
			})

			if (!existing) {
				throw createApiError({
					statusCode: 404,
					code: 'MINECRAFT_SERVER_NOT_FOUND',
				})
			}

			if (nextServerId && nextServerId !== serverId) {
				const conflict = await tx.minecraftServer.findUnique({
					where: { serverId: nextServerId },
					select: { id: true },
				})
				if (conflict) {
					throw createApiError({
						statusCode: 409,
						code: 'MINECRAFT_SERVER_ID_CONFLICT',
					})
				}
			}

			if (nextCode) {
				const conflict = await tx.minecraftServer.findUnique({
					where: { code: nextCode },
					select: { id: true },
				})
				if (conflict && conflict.id !== existing.id) {
					throw createApiError({
						statusCode: 409,
						code: 'MINECRAFT_SERVER_CODE_CONFLICT',
					})
				}
			}

			let savedPortalBridgeConfigId: string | null = null
			let deletedPortalBridgeConfigId: string | null = null
			const bridge = input.portalBridge

			if (bridge === null && existing.portalBridge) {
				await tx.portalBridgeConfig.delete({
					where: { id: existing.portalBridge.id },
				})
				deletedPortalBridgeConfigId = existing.portalBridge.id
			} else if (bridge) {
				const wantsCreate =
					!existing.portalBridge && hasAnyPortalBridgeInput(bridge)

				if (
					wantsCreate &&
					(!bridge.bridgeId?.trim() ||
						!bridge.module?.trim() ||
						!bridge.wsUrl?.trim())
				) {
					throw createBadRequestError(
						'MINECRAFT_SERVER_PORTAL_BRIDGE_CONFIG_INCOMPLETE',
					)
				}

				if (existing.portalBridge || wantsCreate) {
					const nextBridgeId =
						normalizeOptionalText(bridge.bridgeId) ??
						existing.portalBridge?.bridgeId
					const nextModule =
						normalizeOptionalText(bridge.module) ??
						existing.portalBridge?.module

					if (nextBridgeId && nextModule) {
						const conflict = await tx.portalBridgeConfig.findFirst({
							where: {
								bridgeId: nextBridgeId,
								module: nextModule,
								NOT: { minecraftServerId: existing.id },
							},
							select: { id: true },
						})
						if (conflict) {
							throw createApiError({
								statusCode: 409,
								code: 'MINECRAFT_SERVER_PORTAL_BRIDGE_CONFLICT',
							})
						}
					}

					const config = await tx.portalBridgeConfig.upsert({
						where: { minecraftServerId: existing.id },
						create: {
							minecraftServerId: existing.id,
							bridgeId: bridge.bridgeId?.trim() || 'portalbridge-config',
							module: bridge.module?.trim() || 'portalbridge-core',
							wsUrl: bridge.wsUrl?.trim() || 'ws://127.0.0.1:28546',
							encryptedSecret: encryptConfigValue(bridge.secret),
							enabled: bridge.enabled ?? false,
							requestedTopics:
								normalizeStringList(bridge.requestedTopics) ?? [],
							allowedTopics: normalizeStringList(bridge.allowedTopics) ?? [],
							coreSyncIntervalMinutes:
								normalizePortalBridgeSyncIntervalMinutes(
									bridge.coreSyncIntervalMinutes,
								) ?? 30,
						},
						update: {
							bridgeId: normalizeOptionalText(bridge.bridgeId) ?? undefined,
							module: normalizeOptionalText(bridge.module) ?? undefined,
							wsUrl: normalizeOptionalText(bridge.wsUrl) ?? undefined,
							encryptedSecret:
								bridge.secret === undefined
									? undefined
									: encryptConfigValue(bridge.secret),
							enabled: bridge.enabled,
							requestedTopics: normalizeStringList(bridge.requestedTopics),
							allowedTopics: normalizeStringList(bridge.allowedTopics),
							coreSyncIntervalMinutes: normalizePortalBridgeSyncIntervalMinutes(
								bridge.coreSyncIntervalMinutes,
							),
						},
					})
					savedPortalBridgeConfigId = config.id
				}
			}

			if (input.mapConfig) {
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
						worldName:
							normalizeOptionalText(input.mapConfig.worldName) ?? undefined,
						mapName:
							normalizeOptionalText(input.mapConfig.mapName) ?? undefined,
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
			}

			if (input.periods) {
				await tx.minecraftServerPeriod.deleteMany({
					where: { minecraftServerId: existing.id },
				})
				const periods = buildServerPeriods(input.periods, existing.id)
				if (periods.length) {
					await tx.minecraftServerPeriod.createMany({ data: periods })
				}
			}

			if (input.isDefault === true) {
				await tx.minecraftServer.updateMany({
					where: { isDefault: true, NOT: { id: existing.id } },
					data: { isDefault: false },
				})
			}

			const server = await tx.minecraftServer.update({
				where: { serverId },
				data: {
					serverId: nextServerId,
					code: nextCode,
					shortCode: nextShortCode,
					nameZhCn: nextNameZhCn,
					nameZhTw: nextNameZhTw,
					nameEnUs: nextNameEnUs,
					nameJaJp: nextNameJaJp,
					host: normalizeOptionalText(input.host) ?? undefined,
					port: input.port,
					enabled: input.enabled,
					kind: normalizeEnum(input.kind, serverKindValues),
					status: normalizeEnum(input.status, serverStatusValues),
					dataSourceMode: normalizeEnum(
						input.dataSourceMode,
						dataSourceModeValues,
					),
					isDefault: input.isDefault,
					sortOrder: input.sortOrder,
				},
				include: serverInclude,
			})

			return { server, savedPortalBridgeConfigId, deletedPortalBridgeConfigId }
		})

		return {
			server: toMinecraftServerSummary(result.server),
			portalBridgeConfigId: result.savedPortalBridgeConfigId,
			deletedPortalBridgeConfigId: result.deletedPortalBridgeConfigId,
		}
	} catch (error) {
		return toConflictError(error, 'MINECRAFT_SERVER_CODE_CONFLICT')
	}
}
