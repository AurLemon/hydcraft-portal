import type { Prisma } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'

const SORT_FIELDS = new Set([
	'username',
	'firstSeenAt',
	'lastSeenAt',
	'authmeRegisteredAt',
	'authmeLastLoginAt',
	'luckPermsPrimaryGroup',
	'updatedAt',
])

type ServerPlayerEntity = Prisma.MinecraftServerPlayerGetPayload<{
	include: {
		playerData: true
	}
}>

export const serializeServerPlayer = (player: ServerPlayerEntity) => ({
	id: player.id,
	serverId: player.serverId,
	uuid: player.uuid,
	username: player.username,
	normalizedUsername: player.normalizedUsername,
	uuidSource: player.uuidSource,
	firstSeenAt: player.playerData?.firstPlayedAt?.toISOString() ?? null,
	lastSeenAt: player.playerData?.lastPlayedAt?.toISOString() ?? null,
	evidenceCount: player.evidenceCount,
	conflictState: player.conflictState,
	authMe: {
		id: player.authmeId,
		username: player.authmeUsername,
		realname: player.authmeRealname,
		email: player.authmeEmail,
		registeredAt: player.authmeRegisteredAt?.toISOString() ?? null,
		lastLoginAt: player.authmeLastLoginAt?.toISOString() ?? null,
		registerIp: player.authmeRegisterIp,
		lastIp: player.authmeLastIp,
		hasTotp: player.authmeHasTotp,
		syncedAt: player.authmeSyncedAt?.toISOString() ?? null,
	},
	luckPerms: {
		username: player.luckPermsUsername,
		primaryGroup: player.luckPermsPrimaryGroup,
		syncedAt: player.luckPermsSyncedAt?.toISOString() ?? null,
	},
	bridgeSyncedAt: player.bridgeSyncedAt?.toISOString() ?? null,
	createdAt: player.createdAt.toISOString(),
	updatedAt: player.updatedAt.toISOString(),
})

export const listServerPlayers = async (input: {
	serverId: string
	page: number
	pageSize: number
	search?: string
	group?: string
	sortField?: string
	sortDirection?: 'asc' | 'desc'
}) => {
	const where: Prisma.MinecraftServerPlayerWhereInput = {
		serverId: input.serverId,
		...(input.group
			? {
					luckPermsPrimaryGroup: input.group,
				}
			: {}),
		...(input.search
			? {
					OR: [
						{ username: { contains: input.search, mode: 'insensitive' } },
						{ uuid: { contains: input.search, mode: 'insensitive' } },
						{
							authmeUsername: {
								contains: input.search,
								mode: 'insensitive',
							},
						},
						{
							authmeRealname: {
								contains: input.search,
								mode: 'insensitive',
							},
						},
						{
							authmeEmail: {
								contains: input.search,
								mode: 'insensitive',
							},
						},
					],
				}
			: {}),
	}
	const sortField = input.sortField ?? 'lastSeenAt'
	const sortDirection = input.sortDirection ?? 'desc'
	const orderBy: Prisma.MinecraftServerPlayerOrderByWithRelationInput[] =
		sortField === 'firstSeenAt'
			? [
					{ playerData: { firstPlayedAt: sortDirection } },
					{ updatedAt: 'desc' },
				]
			: sortField === 'lastSeenAt'
				? [
						{ playerData: { lastPlayedAt: sortDirection } },
						{ updatedAt: 'desc' },
					]
				: SORT_FIELDS.has(sortField)
					? [{ [sortField]: sortDirection }, { updatedAt: 'desc' }]
					: [{ playerData: { lastPlayedAt: 'desc' } }, { updatedAt: 'desc' }]

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

	return {
		items: players.map(serializeServerPlayer),
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

	return players.map(serializeServerPlayer)
}
