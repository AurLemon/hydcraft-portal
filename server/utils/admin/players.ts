import type { Prisma } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import {
	lookupIpLocation,
	normalizeIpAddressForDisplay,
} from '../ip-location/ip-location'

const SORT_FIELDS = new Set([
	'username',
	'authMeRegisteredAt',
	'authMeLastLoginAt',
	'authMeSyncedAt',
	'createdAt',
	'updatedAt',
])

const adminMinecraftAccountInclude = {
	authMeAccount: true,
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

interface AccountServerLink {
	serverId: string
	uuid: string
	username: string | null
	hasStats: boolean
	hasAdvancements: boolean
}

interface AccountWorldJoinSummary {
	firstJoinedAt: Date | null
	lastJoinedAt: Date | null
}

interface AccountEnrichment {
	luckPerms: {
		uuid: string
		username: string | null
		primaryGroup: string | null
		syncedAt: Date
	} | null
	worldJoin: AccountWorldJoinSummary
	serverLinks: AccountServerLink[]
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

export const syncMinecraftAccountsFromAuthMeAccounts = async () => {
	const accounts = await prisma.authMeAccount.findMany({
		orderBy: {
			updatedAt: 'desc',
		},
	})
	let changed = 0

	for (const authMeAccount of accounts) {
		const existing = await prisma.minecraftAccount.findUnique({
			where: {
				normalizedUsername: authMeAccount.normalizedUsername,
			},
			select: {
				id: true,
				status: true,
				source: true,
			},
		})
		const username = authMeAccount.realname || authMeAccount.username
		const authmeName = authMeAccount.realname || authMeAccount.username

		if (existing) {
			const nextStatus =
				existing.status === 'VERIFIED' || existing.status === 'IMPORTED'
					? existing.status
					: 'IMPORTED'
			const nextSource =
				existing.source === 'PORTAL' || existing.source === 'MANUAL'
					? existing.source
					: 'AUTHME'
			await prisma.minecraftAccount.update({
				where: {
					id: existing.id,
				},
				data: {
					username,
					status: nextStatus,
					source: nextSource,
					authmeId: authMeAccount.authmeId,
					authmeName,
					firstJoinedAt: authMeAccount.registeredAt,
					lastSeenAt: maxDate(
						authMeAccount.lastLoginAt,
						authMeAccount.syncedAt,
					),
				},
			})
			changed += 1
			continue
		}

		await prisma.minecraftAccount.create({
			data: {
				username,
				normalizedUsername: authMeAccount.normalizedUsername,
				status: 'IMPORTED',
				source: 'AUTHME',
				authmeId: authMeAccount.authmeId,
				authmeName,
				firstJoinedAt: authMeAccount.registeredAt,
				lastSeenAt: maxDate(authMeAccount.lastLoginAt, authMeAccount.syncedAt),
			},
		})
		changed += 1
	}

	return {
		matched: accounts.length,
		changed,
	}
}

const serializeAdminMinecraftAccount = (
	account: AdminMinecraftAccountEntity,
	enrichment: AccountEnrichment,
	ipLocations: {
		registerIp: Awaited<ReturnType<typeof lookupIpLocation>>
		lastIp: Awaited<ReturnType<typeof lookupIpLocation>>
	},
) => ({
	id: account.id,
	username: account.username,
	normalizedUsername: account.normalizedUsername,
	uuid: account.uuid,
	authmeName: account.authmeName,
	authmeId: account.authmeId,
	authMe: account.authMeAccount
		? {
				id: account.authMeAccount.authmeId,
				username: account.authMeAccount.username,
				realname: account.authMeAccount.realname,
				email: account.authMeAccount.email,
				registeredAt: account.authMeAccount.registeredAt?.toISOString() ?? null,
				lastLoginAt: account.authMeAccount.lastLoginAt?.toISOString() ?? null,
				registerIp:
					normalizeIpAddressForDisplay(account.authMeAccount.registerIp) ??
					account.authMeAccount.registerIp,
				registerIpLocation: ipLocations.registerIp,
				lastIp:
					normalizeIpAddressForDisplay(account.authMeAccount.lastIp) ??
					account.authMeAccount.lastIp,
				lastIpLocation: ipLocations.lastIp,
				hasTotp: account.authMeAccount.hasTotp,
				syncedAt: account.authMeAccount.syncedAt.toISOString(),
			}
		: null,
	luckPerms: enrichment.luckPerms
		? {
				uuid: enrichment.luckPerms.uuid,
				username: enrichment.luckPerms.username,
				primaryGroup: enrichment.luckPerms.primaryGroup,
				syncedAt: enrichment.luckPerms.syncedAt.toISOString(),
			}
		: null,
	worldJoin: {
		firstJoinedAt: enrichment.worldJoin.firstJoinedAt?.toISOString() ?? null,
		lastJoinedAt: enrichment.worldJoin.lastJoinedAt?.toISOString() ?? null,
	},
	isPrimary: account.isPrimary,
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
	serverLinks: enrichment.serverLinks,
})

const readAccountEnrichment = async (
	accounts: AdminMinecraftAccountEntity[],
): Promise<Map<string, AccountEnrichment>> => {
	const normalizedUsernames = [
		...new Set(
			accounts.flatMap(
				(account) =>
					account.authMeAccount?.normalizedUsername ??
					account.normalizedUsername,
			),
		),
	]
	const accountUuids = [
		...new Set(accounts.flatMap((account) => account.uuid ?? [])),
	]
	const [luckPermsPlayers, serverPlayers] = await Promise.all([
		prisma.luckPermsPlayer.findMany({
			where: {
				OR: [
					{
						normalizedUsername: {
							in: normalizedUsernames,
						},
					},
					...(accountUuids.length
						? [
								{
									uuid: {
										in: accountUuids,
									},
								},
							]
						: []),
				],
			},
		}),
		prisma.minecraftServerPlayer.findMany({
			where: {
				OR: [
					{
						normalizedUsername: {
							in: normalizedUsernames,
						},
					},
					...(accountUuids.length
						? [
								{
									uuid: {
										in: accountUuids,
									},
								},
							]
						: []),
				],
			},
			select: {
				serverId: true,
				uuid: true,
				username: true,
				normalizedUsername: true,
				playerData: {
					select: {
						firstPlayedAt: true,
						lastPlayedAt: true,
					},
				},
				statsSnapshot: {
					select: {
						id: true,
					},
				},
				advancementsSnapshot: {
					select: {
						id: true,
					},
				},
			},
			orderBy: [{ serverId: 'asc' }, { updatedAt: 'desc' }],
		}),
	])
	const luckPermsByUuid = new Map(
		luckPermsPlayers.map((player) => [player.uuid, player]),
	)
	const luckPermsByName = new Map(
		luckPermsPlayers.flatMap((player) =>
			player.normalizedUsername ? [[player.normalizedUsername, player]] : [],
		),
	)

	return new Map(
		accounts.map((account) => {
			const normalizedUsername =
				account.authMeAccount?.normalizedUsername ?? account.normalizedUsername
			const luckPerms =
				(account.uuid ? luckPermsByUuid.get(account.uuid) : undefined) ??
				luckPermsByName.get(normalizedUsername) ??
				null
			const matchedPlayers = serverPlayers.filter(
				(player) =>
					(account.uuid && player.uuid === account.uuid) ||
					player.normalizedUsername === normalizedUsername,
			)
			const nameMatchedPlayers = serverPlayers.filter(
				(player) => player.normalizedUsername === normalizedUsername,
			)
			const firstJoinedAt = nameMatchedPlayers.reduce<Date | null>(
				(earliest, player) => {
					const firstPlayedAt = player.playerData?.firstPlayedAt ?? null

					if (!firstPlayedAt) {
						return earliest
					}

					if (!earliest) {
						return firstPlayedAt
					}

					return firstPlayedAt.getTime() < earliest.getTime()
						? firstPlayedAt
						: earliest
				},
				null,
			)
			const lastJoinedAt = nameMatchedPlayers.reduce<Date | null>(
				(latest, player) => {
					const lastPlayedAt = player.playerData?.lastPlayedAt ?? null

					if (!lastPlayedAt) {
						return latest
					}

					if (!latest) {
						return lastPlayedAt
					}

					return lastPlayedAt.getTime() > latest.getTime()
						? lastPlayedAt
						: latest
				},
				null,
			)

			return [
				account.id,
				{
					luckPerms,
					worldJoin: {
						firstJoinedAt,
						lastJoinedAt,
					},
					serverLinks: matchedPlayers.map((player) => ({
						serverId: player.serverId,
						uuid: player.uuid,
						username: player.username,
						hasStats: Boolean(player.statsSnapshot),
						hasAdvancements: Boolean(player.advancementsSnapshot),
					})),
				},
			]
		}),
	)
}

const findGroupMatchedNames = async (group: string): Promise<string[]> => {
	const luckPermsPlayers = await prisma.luckPermsPlayer.findMany({
		where: {
			primaryGroup: {
				contains: group,
				mode: 'insensitive',
			},
		},
		select: {
			uuid: true,
			normalizedUsername: true,
		},
	})
	const groupUuids = luckPermsPlayers.map((player) => player.uuid)
	const serverPlayers = groupUuids.length
		? await prisma.minecraftServerPlayer.findMany({
				where: {
					uuid: {
						in: groupUuids,
					},
					normalizedUsername: {
						not: null,
					},
				},
				select: {
					normalizedUsername: true,
				},
				distinct: ['normalizedUsername'],
			})
		: []

	return [
		...new Set([
			...luckPermsPlayers.flatMap((player) => player.normalizedUsername ?? []),
			...serverPlayers.flatMap((player) => player.normalizedUsername ?? []),
		]),
	]
}

const buildOrderBy = (
	sortField: string | undefined,
	sortDirection: 'asc' | 'desc' | undefined,
): Prisma.MinecraftAccountOrderByWithRelationInput[] => {
	const field = sortField ?? 'authMeLastLoginAt'
	const direction = sortDirection ?? 'desc'
	const usernameOrder = {
		username: 'asc',
	} satisfies Prisma.MinecraftAccountOrderByWithRelationInput
	const uuidOrder = {
		uuid: { sort: 'asc', nulls: 'last' },
	} satisfies Prisma.MinecraftAccountOrderByWithRelationInput
	const fallbackOrder = [usernameOrder, uuidOrder]

	if (field === 'authMeRegisteredAt') {
		return [
			{
				authMeAccount: {
					registeredAt: { sort: direction, nulls: 'last' },
				},
			},
			...fallbackOrder,
		]
	}

	if (field === 'authMeLastLoginAt') {
		return [
			{
				authMeAccount: {
					lastLoginAt: { sort: direction, nulls: 'last' },
				},
			},
			...fallbackOrder,
		]
	}

	if (field === 'authMeSyncedAt') {
		return [
			{
				authMeAccount: {
					syncedAt: direction,
				},
			},
			...fallbackOrder,
		]
	}

	if (field === 'username') {
		return [{ username: direction }, { uuid: { sort: 'asc', nulls: 'last' } }]
	}

	if (SORT_FIELDS.has(field)) {
		return [{ [field]: direction }, ...fallbackOrder]
	}

	return [{ updatedAt: 'desc' }, ...fallbackOrder]
}

export const listAdminMinecraftAccounts = async (input: {
	page: number
	pageSize: number
	search?: string
	linked?: string
	group?: string
	totp?: string
	sortField?: string
	sortDirection?: 'asc' | 'desc'
}) => {
	const linked =
		input.linked === 'linked'
			? true
			: input.linked === 'unlinked'
				? false
				: undefined
	const hasTotp =
		input.totp === 'yes' ? true : input.totp === 'no' ? false : undefined
	const groupMatchedNames = input.group
		? await findGroupMatchedNames(input.group)
		: undefined
	const where: Prisma.MinecraftAccountWhereInput = {
		authMeAccount: {
			isNot: null,
		},
		...(linked === undefined
			? {}
			: linked
				? { userId: { not: null } }
				: { userId: null }),
		...(hasTotp === undefined
			? {}
			: {
					authMeAccount: {
						is: {
							hasTotp,
						},
					},
				}),
		...(groupMatchedNames
			? {
					normalizedUsername: {
						in: groupMatchedNames,
					},
				}
			: {}),
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
							authMeAccount: {
								is: {
									OR: [
										{
											authmeId: Number.isFinite(Number(input.search))
												? Number(input.search)
												: -1,
										},
										{
											username: {
												contains: input.search,
												mode: 'insensitive',
											},
										},
										{
											realname: {
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
										{
											registerIp: {
												contains: input.search,
												mode: 'insensitive',
											},
										},
										{
											lastIp: {
												contains: input.search,
												mode: 'insensitive',
											},
										},
									],
								},
							},
						},
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
	const orderBy = buildOrderBy(input.sortField, input.sortDirection)

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
	const enrichment = await readAccountEnrichment(accounts)
	const ipLocationsByAccountId = new Map(
		await Promise.all(
			accounts.map(
				async (account) =>
					[
						account.id,
						{
							registerIp: await lookupIpLocation(
								account.authMeAccount?.registerIp,
							),
							lastIp: await lookupIpLocation(account.authMeAccount?.lastIp),
						},
					] as const,
			),
		),
	)

	return {
		items: accounts.map((account) => {
			const ipLocations = ipLocationsByAccountId.get(account.id) ?? {
				registerIp: null,
				lastIp: null,
			}

			return serializeAdminMinecraftAccount(
				account,
				enrichment.get(account.id) ?? {
					luckPerms: null,
					worldJoin: {
						firstJoinedAt: null,
						lastJoinedAt: null,
					},
					serverLinks: [],
				},
				ipLocations,
			)
		}),
		page: input.page,
		pageSize: input.pageSize,
		total,
		pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
	}
}
