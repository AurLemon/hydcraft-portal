import type { Prisma } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import {
	lookupIpLocation,
	normalizeIpAddressForDisplay,
} from '../ip-location/ip-location'
import { createLuckPermsPrimaryGroupResolver } from '../luckperms/primary-group'
import { readLuckPermsSnapshotBundle } from '../luckperms/snapshot'

const SORT_FIELDS = new Set([
	'username',
	'firstSeenAt',
	'lastSeenAt',
	'updatedAt',
])

type ServerPlayerEntity = Prisma.MinecraftServerPlayerGetPayload<{
	include: {
		playerData: true
	}
}>

interface ServerPlayerEnrichment {
	authMe?: {
		authmeId: number
		username: string
		realname: string | null
		email: string | null
		registeredAt: Date | null
		lastLoginAt: Date | null
		registerIp: string | null
		lastIp: string | null
		hasTotp: boolean
		syncedAt: Date
	} | null
	luckPerms?: {
		uuid: string
		username: string | null
		primaryGroup: string | null
		syncedAt: Date
	} | null
}

interface ServerPlayerIpLocations {
	registerIp: Awaited<ReturnType<typeof lookupIpLocation>>
	lastIp: Awaited<ReturnType<typeof lookupIpLocation>>
}

export const serializeServerPlayer = (
	player: ServerPlayerEntity,
	enrichment: ServerPlayerEnrichment = {},
	ipLocations: ServerPlayerIpLocations = {
		registerIp: null,
		lastIp: null,
	},
) => ({
	id: player.id,
	serverId: player.serverId,
	uuid: player.uuid,
	username: player.username,
	normalizedUsername: player.normalizedUsername,
	uuidSource: player.uuidSource,
	firstSeenAt: player.playerData?.firstPlayedAt?.toISOString() ?? null,
	lastSeenAt: player.playerData?.lastPlayedAt?.toISOString() ?? null,
	online: player.online,
	lastOnlineAt: player.lastOnlineAt?.toISOString() ?? null,
	lastOfflineAt: player.lastOfflineAt?.toISOString() ?? null,
	onlineLocation: {
		worldName: player.lastOnlineWorldName ?? null,
		dimension: player.lastOnlineDimension ?? null,
		x: player.lastOnlineX ?? null,
		y: player.lastOnlineY ?? null,
		z: player.lastOnlineZ ?? null,
		observedAt: player.lastOnlineAt?.toISOString() ?? null,
	},
	lastSavedLocation: {
		worldName: player.playerData?.lastWorldName ?? null,
		dimension: player.playerData?.lastDimension ?? null,
		x: player.playerData?.lastX ?? null,
		y: player.playerData?.lastY ?? null,
		z: player.playerData?.lastZ ?? null,
		yaw: player.playerData?.lastYaw ?? null,
		pitch: player.playerData?.lastPitch ?? null,
		observedAt: player.playerData?.syncedAt?.toISOString() ?? null,
	},
	hasStats: player.playerData?.hasStatsFile ?? false,
	hasAdvancements: player.playerData?.hasAdvancementsFile ?? false,
	evidenceCount: player.evidenceCount,
	conflictState: player.conflictState,
	authMe: {
		id: enrichment.authMe?.authmeId ?? null,
		username: enrichment.authMe?.username ?? null,
		realname: enrichment.authMe?.realname ?? null,
		email: enrichment.authMe?.email ?? null,
		registeredAt: enrichment.authMe?.registeredAt?.toISOString() ?? null,
		lastLoginAt: enrichment.authMe?.lastLoginAt?.toISOString() ?? null,
		registerIp:
			normalizeIpAddressForDisplay(enrichment.authMe?.registerIp) ??
			enrichment.authMe?.registerIp ??
			null,
		registerIpLocation: ipLocations.registerIp,
		lastIp:
			normalizeIpAddressForDisplay(enrichment.authMe?.lastIp) ??
			enrichment.authMe?.lastIp ??
			null,
		lastIpLocation: ipLocations.lastIp,
		hasTotp: enrichment.authMe?.hasTotp ?? false,
		syncedAt: enrichment.authMe?.syncedAt?.toISOString() ?? null,
	},
	luckPerms: {
		username: enrichment.luckPerms?.username ?? null,
		primaryGroup: enrichment.luckPerms?.primaryGroup ?? null,
		syncedAt: enrichment.luckPerms?.syncedAt?.toISOString() ?? null,
	},
	bridgeSyncedAt: player.bridgeSyncedAt?.toISOString() ?? null,
	createdAt: player.createdAt.toISOString(),
	updatedAt: player.updatedAt.toISOString(),
})

const readServerPlayerEnrichment = async (players: ServerPlayerEntity[]) => {
	const normalizedUsernames = [
		...new Set(players.flatMap((player) => player.normalizedUsername ?? [])),
	]
	const uuids = [...new Set(players.map((player) => player.uuid))]
	const [authMeAccounts, luckPermsSnapshot] = await Promise.all([
		prisma.authMeAccount.findMany({
			where: {
				normalizedUsername: {
					in: normalizedUsernames,
				},
			},
		}),
		readLuckPermsSnapshotBundle({
			uuids,
			normalizedUsernames,
		}),
	])
	const authMeByName = new Map(
		authMeAccounts.map((account) => [account.normalizedUsername, account]),
	)
	const luckPermsResolver =
		createLuckPermsPrimaryGroupResolver(luckPermsSnapshot)

	return new Map(
		players.map((player) => [
			player.id,
			{
				authMe: player.normalizedUsername
					? authMeByName.get(player.normalizedUsername)
					: null,
				luckPerms: (() => {
					const luckPermsPlayer = luckPermsResolver.resolvePlayer({
						uuid: player.uuid,
						normalizedUsername: player.normalizedUsername ?? null,
					})

					if (!luckPermsPlayer) {
						return null
					}

					return {
						uuid: luckPermsPlayer.uuid,
						username: luckPermsPlayer.username,
						primaryGroup: luckPermsResolver.resolveEffectivePrimaryGroup({
							uuid: player.uuid,
							normalizedUsername: player.normalizedUsername ?? null,
						}),
						syncedAt: luckPermsPlayer.syncedAt,
					}
				})(),
			},
		]),
	)
}

const readServerPlayerIpLocations = async (
	players: ServerPlayerEntity[],
	enrichment: Map<string, ServerPlayerEnrichment>,
) =>
	new Map(
		await Promise.all(
			players.map(
				async (player) =>
					[
						player.id,
						{
							registerIp: await lookupIpLocation(
								enrichment.get(player.id)?.authMe?.registerIp,
							),
							lastIp: await lookupIpLocation(
								enrichment.get(player.id)?.authMe?.lastIp,
							),
						},
					] as const,
			),
		),
	)

const getPlayerName = (player: ServerPlayerEntity): string | null =>
	player.username ?? player.normalizedUsername

const compareNullableText = (
	left: string | null | undefined,
	right: string | null | undefined,
	direction: 'asc' | 'desc',
): number => {
	if (!left && !right) {
		return 0
	}

	if (!left) {
		return 1
	}

	if (!right) {
		return -1
	}

	const result = left.localeCompare(right)

	return direction === 'asc' ? result : -result
}

const compareServerPlayersByFallback = (
	left: ServerPlayerEntity,
	right: ServerPlayerEntity,
): number =>
	compareNullableText(getPlayerName(left), getPlayerName(right), 'asc') ||
	left.uuid.localeCompare(right.uuid)

const sortServerPlayersByLuckPermsGroup = (
	players: ServerPlayerEntity[],
	enrichment: Map<string, ServerPlayerEnrichment>,
	direction: 'asc' | 'desc',
): ServerPlayerEntity[] =>
	[...players].sort(
		(left, right) =>
			compareNullableText(
				enrichment.get(left.id)?.luckPerms?.primaryGroup,
				enrichment.get(right.id)?.luckPerms?.primaryGroup,
				direction,
			) || compareServerPlayersByFallback(left, right),
	)

const nullableSort = (sort: 'asc' | 'desc'): Prisma.SortOrderInput => ({
	sort,
	nulls: 'last',
})

const buildServerPlayerOrderBy = (
	sortField: string | undefined,
	sortDirection: 'asc' | 'desc' | undefined,
): Prisma.MinecraftServerPlayerOrderByWithRelationInput[] => {
	const field = sortField ?? 'lastSeenAt'
	const direction = sortDirection ?? 'desc'
	const fallbackOrder = [
		{ username: nullableSort('asc') },
		{ uuid: 'asc' },
	] satisfies Prisma.MinecraftServerPlayerOrderByWithRelationInput[]

	if (field === 'firstSeenAt') {
		return [
			{ playerData: { firstPlayedAt: nullableSort(direction) } },
			...fallbackOrder,
		]
	}

	if (field === 'lastSeenAt') {
		return [
			{ playerData: { lastPlayedAt: nullableSort(direction) } },
			...fallbackOrder,
		]
	}

	if (field === 'username') {
		return [{ username: nullableSort(direction) }, { uuid: 'asc' }]
	}

	if (SORT_FIELDS.has(field)) {
		return [{ [field]: direction }, ...fallbackOrder]
	}

	return [
		{ playerData: { lastPlayedAt: nullableSort('desc') } },
		...fallbackOrder,
	]
}

export const listServerPlayers = async (input: {
	serverId: string
	page: number
	pageSize: number
	search?: string
	group?: string
	sortField?: string
	sortDirection?: 'asc' | 'desc'
}) => {
	const allLuckPermsPlayers =
		input.group || input.sortField === 'luckPermsPrimaryGroup'
			? await prisma.luckPermsPlayer.findMany()
			: []
	const groupResolver =
		input.group || input.sortField === 'luckPermsPrimaryGroup'
			? createLuckPermsPrimaryGroupResolver({
					players: allLuckPermsPlayers,
					userPermissions: await prisma.luckPermsUserPermission.findMany({
						where: {
							uuid: {
								in: allLuckPermsPlayers.map((player) => player.uuid),
							},
							permission: {
								startsWith: 'group.',
							},
						},
					}),
					groupPermissions: await prisma.luckPermsGroupPermission.findMany({
						where: {
							permission: {
								startsWith: 'weight.',
							},
						},
					}),
				})
			: null
	const groupUuids =
		input.group && groupResolver
			? allLuckPermsPlayers
					.filter(
						(player) =>
							groupResolver.resolveEffectivePrimaryGroup({
								uuid: player.uuid,
								normalizedUsername: player.normalizedUsername,
							}) === input.group,
					)
					.map((player) => player.uuid)
			: []
	const where: Prisma.MinecraftServerPlayerWhereInput = {
		serverId: input.serverId,
		...(input.group
			? {
					uuid: {
						in: groupUuids,
					},
				}
			: {}),
		...(input.search
			? {
					OR: [
						{ username: { contains: input.search, mode: 'insensitive' } },
						{ uuid: { contains: input.search, mode: 'insensitive' } },
					],
				}
			: {}),
	}
	const sortDirection = input.sortDirection ?? 'desc'
	const orderBy = buildServerPlayerOrderBy(input.sortField, sortDirection)

	if (input.sortField === 'luckPermsPrimaryGroup') {
		const allPlayers = await prisma.minecraftServerPlayer.findMany({
			where,
			orderBy: buildServerPlayerOrderBy('username', 'asc'),
			include: {
				playerData: true,
			},
		})
		const enrichment = await readServerPlayerEnrichment(allPlayers)
		const sortedPlayers = sortServerPlayersByLuckPermsGroup(
			allPlayers,
			enrichment,
			sortDirection,
		)
		const players = sortedPlayers.slice(
			(input.page - 1) * input.pageSize,
			input.page * input.pageSize,
		)
		const ipLocations = await readServerPlayerIpLocations(players, enrichment)

		return {
			items: players.map((player) =>
				serializeServerPlayer(
					player,
					enrichment.get(player.id),
					ipLocations.get(player.id),
				),
			),
			page: input.page,
			pageSize: input.pageSize,
			total: allPlayers.length,
			pageCount: Math.max(1, Math.ceil(allPlayers.length / input.pageSize)),
		}
	}

	const [total, players] = await Promise.all([
		prisma.minecraftServerPlayer.count({ where }),
		prisma.minecraftServerPlayer.findMany({
			where,
			orderBy,
			include: {
				playerData: true,
			},
			skip: (input.page - 1) * input.pageSize,
			take: input.pageSize,
		}),
	])
	const enrichment = await readServerPlayerEnrichment(players)
	const ipLocations = await readServerPlayerIpLocations(players, enrichment)

	return {
		items: players.map((player) =>
			serializeServerPlayer(
				player,
				enrichment.get(player.id),
				ipLocations.get(player.id),
			),
		),
		page: input.page,
		pageSize: input.pageSize,
		total,
		pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
	}
}

export const listServerPlayerPreview = async (serverId: string) => {
	const players = await prisma.minecraftServerPlayer.findMany({
		where: {
			serverId,
		},
		orderBy: {
			playerData: {
				lastPlayedAt: 'desc',
			},
		},
		include: {
			playerData: true,
		},
		take: 6,
	})
	const enrichment = await readServerPlayerEnrichment(players)
	const ipLocations = await readServerPlayerIpLocations(players, enrichment)

	return players.map((player) =>
		serializeServerPlayer(
			player,
			enrichment.get(player.id),
			ipLocations.get(player.id),
		),
	)
}
