import type {
	MinecraftAccountSource,
	MinecraftAccountStatus,
	Prisma,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'

const MINECRAFT_ACCOUNT_STATUSES = new Set<MinecraftAccountStatus>([
	'PENDING',
	'VERIFIED',
	'IMPORTED',
	'UNLINKED',
	'CONFLICTED',
])

const MINECRAFT_ACCOUNT_SOURCES = new Set<MinecraftAccountSource>([
	'PORTAL',
	'AUTHME',
	'MANUAL',
	'MIGRATION',
	'OTHER',
])

const SORT_FIELDS = new Set([
	'username',
	'status',
	'source',
	'firstJoinedAt',
	'lastSeenAt',
	'createdAt',
	'updatedAt',
])

const adminMinecraftAccountInclude = {
	user: {
		select: {
			id: true,
			username: true,
			displayName: true,
			email: true,
			avatarUrl: true,
		},
	},
} satisfies Prisma.MinecraftAccountInclude

type AdminMinecraftAccountEntity = Prisma.MinecraftAccountGetPayload<{
	include: typeof adminMinecraftAccountInclude
}>

interface AccountObservedStats {
	serverPlayerCount: number
	serverCount: number
	sameNameUuidCount: number
}

interface ServerPlayerProjectionGroup {
	normalizedUsername: string
	username: string
	uuid: string | null
	status: MinecraftAccountStatus
	authmeName: string | null
	firstJoinedAt: Date | null
	lastSeenAt: Date | null
}

const normalizeStatus = (
	value: string | undefined,
): MinecraftAccountStatus | undefined =>
	value && MINECRAFT_ACCOUNT_STATUSES.has(value as MinecraftAccountStatus)
		? (value as MinecraftAccountStatus)
		: undefined

const normalizeSource = (
	value: string | undefined,
): MinecraftAccountSource | undefined =>
	value && MINECRAFT_ACCOUNT_SOURCES.has(value as MinecraftAccountSource)
		? (value as MinecraftAccountSource)
		: undefined

const countObservedStats = async (
	account: AdminMinecraftAccountEntity,
): Promise<AccountObservedStats> => {
	const exactWhere: Prisma.MinecraftServerPlayerWhereInput = account.uuid
		? { uuid: account.uuid }
		: { normalizedUsername: account.normalizedUsername }

	const sameNamePlayers = await prisma.minecraftServerPlayer.findMany({
		where: {
			normalizedUsername: account.normalizedUsername,
			uuid: {
				not: null,
			},
		},
		select: {
			uuid: true,
		},
		distinct: ['uuid'],
	})

	const [serverPlayerCount, observedServers] = await Promise.all([
		prisma.minecraftServerPlayer.count({ where: exactWhere }),
		prisma.minecraftServerPlayer.findMany({
			where: exactWhere,
			select: {
				serverId: true,
			},
			distinct: ['serverId'],
		}),
	])

	return {
		serverPlayerCount,
		serverCount: observedServers.length,
		sameNameUuidCount: sameNamePlayers.length,
	}
}

const minDate = (left: Date | null, right: Date | null): Date | null => {
	if (!left) {
		return right
	}

	if (!right) {
		return left
	}

	return left.getTime() <= right.getTime() ? left : right
}

const maxDate = (left: Date | null, right: Date | null): Date | null => {
	if (!left) {
		return right
	}

	if (!right) {
		return left
	}

	return left.getTime() >= right.getTime() ? left : right
}

const buildServerPlayerProjectionGroups = async (): Promise<
	ServerPlayerProjectionGroup[]
> => {
	const players = await prisma.minecraftServerPlayer.findMany({
		where: {
			normalizedUsername: {
				not: null,
			},
		},
		orderBy: {
			updatedAt: 'desc',
		},
		select: {
			username: true,
			normalizedUsername: true,
			uuid: true,
			firstSeenAt: true,
			lastSeenAt: true,
			authmeId: true,
			authmeUsername: true,
			authmeRealname: true,
			updatedAt: true,
			playerData: {
				select: {
					firstPlayedAt: true,
					lastPlayedAt: true,
				},
			},
		},
	})
	const groups = new Map<
		string,
		{
			username: string | null
			uuids: Set<string>
			authmeIds: Set<number>
			authmeName: string | null
			firstJoinedAt: Date | null
			lastSeenAt: Date | null
		}
	>()

	for (const player of players) {
		if (!player.normalizedUsername) {
			continue
		}

		const group = groups.get(player.normalizedUsername) ?? {
			username: null,
			uuids: new Set<string>(),
			authmeIds: new Set<number>(),
			authmeName: null,
			firstJoinedAt: null,
			lastSeenAt: null,
		}

		group.username ??= player.username
		group.authmeName ??= player.authmeRealname ?? player.authmeUsername

		if (player.uuid) {
			group.uuids.add(player.uuid)
		}

		if (player.authmeId != null) {
			group.authmeIds.add(player.authmeId)
		}

		group.firstJoinedAt = minDate(
			group.firstJoinedAt,
			player.playerData?.firstPlayedAt ?? player.firstSeenAt,
		)
		group.lastSeenAt = maxDate(
			group.lastSeenAt,
			player.playerData?.lastPlayedAt ?? player.lastSeenAt,
		)
		groups.set(player.normalizedUsername, group)
	}

	return [...groups.entries()].map(([normalizedUsername, group]) => {
		const uuids = [...group.uuids]
		const authmeIds = [...group.authmeIds]
		const conflicted = uuids.length > 1

		return {
			normalizedUsername,
			username: group.username ?? normalizedUsername,
			uuid: !conflicted && uuids.length === 1 ? (uuids[0] ?? null) : null,
			status: conflicted ? 'CONFLICTED' : 'IMPORTED',
			authmeName: group.authmeName,
			firstJoinedAt: group.firstJoinedAt,
			lastSeenAt: group.lastSeenAt,
		}
	})
}

export const syncMinecraftAccountsFromServerPlayers = async () => {
	const groups = await buildServerPlayerProjectionGroups()
	let changed = 0

	for (const group of groups) {
		const uuidOwner = group.uuid
			? await prisma.minecraftAccount.findFirst({
					where: {
						uuid: group.uuid,
						normalizedUsername: {
							not: group.normalizedUsername,
						},
					},
					select: {
						id: true,
					},
				})
			: null
		const safeUuid = uuidOwner ? null : group.uuid
		const status: MinecraftAccountStatus = uuidOwner
			? 'CONFLICTED'
			: group.status
		const existing = await prisma.minecraftAccount.findUnique({
			where: {
				normalizedUsername: group.normalizedUsername,
			},
			select: {
				id: true,
				status: true,
				source: true,
			},
		})

		if (existing) {
			const nextStatus =
				existing.status === 'VERIFIED' || existing.status === 'IMPORTED'
					? existing.status
					: status
			const nextSource =
				existing.source === 'PORTAL' || existing.source === 'MANUAL'
					? existing.source
					: 'MIGRATION'
			await prisma.minecraftAccount.update({
				where: {
					id: existing.id,
				},
				data: {
					username: group.username,
					uuid: safeUuid,
					status: nextStatus,
					source: nextSource,
					authmeName: group.authmeName,
					firstJoinedAt: group.firstJoinedAt,
					lastSeenAt: group.lastSeenAt,
				},
			})
			changed += 1
			continue
		}

		await prisma.minecraftAccount.create({
			data: {
				username: group.username,
				normalizedUsername: group.normalizedUsername,
				uuid: safeUuid,
				status,
				source: 'MIGRATION',
				authmeName: group.authmeName,
				firstJoinedAt: group.firstJoinedAt,
				lastSeenAt: group.lastSeenAt,
			},
		})
		changed += 1
	}

	return {
		matched: groups.length,
		changed,
	}
}

const serializeAdminMinecraftAccount = (
	account: AdminMinecraftAccountEntity,
	stats: AccountObservedStats,
) => ({
	id: account.id,
	username: account.username,
	normalizedUsername: account.normalizedUsername,
	status: account.status,
	source: account.source,
	authmeName: account.authmeName,
	authmeId: account.authmeId,
	firstJoinedAt: account.firstJoinedAt?.toISOString() ?? null,
	lastSeenAt: account.lastSeenAt?.toISOString() ?? null,
	isPrimary: account.isPrimary,
	verifiedAt: account.verifiedAt?.toISOString() ?? null,
	unlinkedAt: account.unlinkedAt?.toISOString() ?? null,
	note: account.note,
	createdAt: account.createdAt.toISOString(),
	updatedAt: account.updatedAt.toISOString(),
	user: account.user
		? {
				id: account.user.id,
				username: account.user.username,
				displayName: account.user.displayName,
				email: account.user.email,
				avatarUrl: account.user.avatarUrl,
			}
		: null,
	observed: stats,
})

export const listAdminMinecraftAccounts = async (input: {
	page: number
	pageSize: number
	search?: string
	status?: string
	source?: string
	linked?: string
	sortField?: string
	sortDirection?: 'asc' | 'desc'
}) => {
	await syncMinecraftAccountsFromServerPlayers()

	const linked =
		input.linked === 'linked'
			? true
			: input.linked === 'unlinked'
				? false
				: undefined
	const where: Prisma.MinecraftAccountWhereInput = {
		...(normalizeStatus(input.status)
			? { status: normalizeStatus(input.status) }
			: {}),
		...(normalizeSource(input.source)
			? { source: normalizeSource(input.source) }
			: {}),
		...(linked === undefined
			? {}
			: linked
				? { userId: { not: null } }
				: { userId: null }),
		...(input.search
			? {
					OR: [
						{ username: { contains: input.search, mode: 'insensitive' } },
						{
							normalizedUsername: {
								contains: input.search.toLowerCase(),
								mode: 'insensitive',
							},
						},
						{ authmeName: { contains: input.search, mode: 'insensitive' } },
						{
							user: {
								is: {
									OR: [
										{
											username: {
												contains: input.search,
												mode: 'insensitive',
											},
										},
										{
											displayName: {
												contains: input.search,
												mode: 'insensitive',
											},
										},
										{
											email: {
												contains: input.search,
												mode: 'insensitive',
											},
										},
									],
								},
							},
						},
					],
				}
			: {}),
	}
	const sortField = input.sortField ?? 'updatedAt'
	const sortDirection = input.sortDirection ?? 'desc'
	const orderBy: Prisma.MinecraftAccountOrderByWithRelationInput =
		SORT_FIELDS.has(sortField)
			? { [sortField]: sortDirection }
			: { updatedAt: 'desc' }

	const [total, accounts] = await Promise.all([
		prisma.minecraftAccount.count({ where }),
		prisma.minecraftAccount.findMany({
			where,
			orderBy,
			skip: (input.page - 1) * input.pageSize,
			take: input.pageSize,
			include: adminMinecraftAccountInclude,
		}),
	])
	const stats = await Promise.all(accounts.map(countObservedStats))

	return {
		items: accounts.map((account, index) =>
			serializeAdminMinecraftAccount(
				account,
				stats[index] ?? {
					serverPlayerCount: 0,
					serverCount: 0,
					sameNameUuidCount: 0,
				},
			),
		),
		page: input.page,
		pageSize: input.pageSize,
		total,
		pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
	}
}
