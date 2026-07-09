import type { Prisma } from '~/generated/prisma/client'
import type {
	ServerDirectoryPlayerItem,
	ServerDirectoryUserItem,
} from '../../../utils/server/directories'
import {
	buildMinecraftAccountSummary,
	minecraftAccountSummaryPlayerInclude,
} from '../minecraft/account-summary'
import { prisma } from '../db/prisma'
import { createLuckPermsPrimaryGroupResolver } from '../luckperms/primary-group'
import {
	toBadgeSummary,
	toRoleBadgeSummary,
	toVerifiedSummary,
} from '../profile/mapper'
import { readLuckPermsSnapshotBundle } from '../luckperms/snapshot'

const USER_SORT_FIELDS = new Set([
	'createdAt',
	'hydrolineId',
	'joinedAt',
	'updatedAt',
	'username',
	'displayName',
])

const PLAYER_SORT_FIELDS = new Set([
	'username',
	'authMeLastLoginAt',
	'authMeRegisteredAt',
	'updatedAt',
	'createdAt',
])

const publicPlayerInclude = {
	authMeAccount: true,
	user: {
		select: {
			username: true,
			displayName: true,
			avatarUrl: true,
			privacy: {
				select: {
					publicProfile: true,
					allowMinecraftProfileDiscovery: true,
				},
			},
		},
	},
} satisfies Prisma.MinecraftAccountInclude

type PublicPlayerEntity = Prisma.MinecraftAccountGetPayload<{
	include: typeof publicPlayerInclude
}>

const PUBLIC_PLAYERDATA_INCLUDE =
	minecraftAccountSummaryPlayerInclude satisfies Prisma.MinecraftServerPlayerInclude

type PublicServerPlayerEntity = Prisma.MinecraftServerPlayerGetPayload<{
	include: typeof PUBLIC_PLAYERDATA_INCLUDE
}>

const buildPlayerOrderBy = (
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

	if (field === 'username') {
		return [{ username: direction }, uuidOrder]
	}

	if (PLAYER_SORT_FIELDS.has(field)) {
		return [{ [field]: direction }, ...fallbackOrder]
	}

	return [{ updatedAt: 'desc' }, ...fallbackOrder]
}

const findGroupMatchedNames = async (group: string): Promise<string[]> => {
	const luckPermsPlayers = await prisma.luckPermsPlayer.findMany()
	const resolver = createLuckPermsPrimaryGroupResolver({
		players: luckPermsPlayers,
		userPermissions: await prisma.luckPermsUserPermission.findMany({
			where: {
				uuid: {
					in: luckPermsPlayers.map((player) => player.uuid),
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
	const matchedLuckPermsPlayers = luckPermsPlayers.filter((player) =>
		(
			resolver.resolveEffectivePrimaryGroup({
				uuid: player.uuid,
				normalizedUsername: player.normalizedUsername,
			}) ?? ''
		)
			.toLowerCase()
			.includes(group.toLowerCase()),
	)
	const groupUuids = matchedLuckPermsPlayers.map((player) => player.uuid)
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
			...matchedLuckPermsPlayers.flatMap(
				(player) => player.normalizedUsername ?? [],
			),
			...serverPlayers.flatMap((player) => player.normalizedUsername ?? []),
		]),
	]
}

const isPublicDirectoryUser = (
	privacy:
		| {
				publicProfile: boolean
				searchableInUserDirectory: boolean
		  }
		| null
		| undefined,
): boolean =>
	(privacy?.publicProfile ?? true) &&
	(privacy?.searchableInUserDirectory ?? true)

const canExposeBoundUser = (
	privacy:
		| {
				publicProfile: boolean
				allowMinecraftProfileDiscovery: boolean
		  }
		| null
		| undefined,
): boolean =>
	(privacy?.publicProfile ?? true) &&
	(privacy?.allowMinecraftProfileDiscovery ?? true)

const buildUserOrderBy = (
	sortField: string | undefined,
	sortDirection: 'asc' | 'desc' | undefined,
): Prisma.UserOrderByWithRelationInput => {
	const field = sortField ?? 'joinedAt'
	const direction = sortDirection ?? 'desc'

	if (USER_SORT_FIELDS.has(field)) {
		return { [field]: direction }
	}

	return { joinedAt: 'desc' }
}

const publicDirectoryUserSelect = {
	id: true,
	hydrolineId: true,
	username: true,
	displayName: true,
	avatarUrl: true,
	bio: true,
	role: true,
	verified: true,
	verifiedTextZhCn: true,
	verifiedTextZhTw: true,
	verifiedTextEnUs: true,
	verifiedTextJaJp: true,
	createdAt: true,
	joinedAt: true,
	badges: {
		orderBy: {
			sortOrder: 'asc',
		},
		include: {
			badge: true,
		},
	},
	privacy: {
		select: {
			publicProfile: true,
			showBio: true,
			showHydrolineId: true,
			showJoinedAt: true,
			showBadges: true,
			showMinecraftProfileLink: true,
			searchableInUserDirectory: true,
		},
	},
	minecraftAccounts: {
		where: {
			unlinkedAt: null,
		},
		orderBy: [
			{
				isPrimary: 'desc',
			},
			{
				updatedAt: 'desc',
			},
		],
		select: {
			id: true,
			username: true,
		},
	},
} satisfies Prisma.UserSelect

type PublicDirectoryUserEntity = Prisma.UserGetPayload<{
	select: typeof publicDirectoryUserSelect
}>

const compareDirectoryUserPlayTime = (
	left: ServerDirectoryUserItem,
	right: ServerDirectoryUserItem,
	direction: 'asc' | 'desc',
): number => {
	const leftPlayTime = left.hasPlayTime ? left.playTimeTicks : null
	const rightPlayTime = right.hasPlayTime ? right.playTimeTicks : null

	if (leftPlayTime === null && rightPlayTime === null) {
		return left.username.localeCompare(right.username)
	}

	if (leftPlayTime === null) {
		return 1
	}

	if (rightPlayTime === null) {
		return -1
	}

	if (leftPlayTime !== rightPlayTime) {
		return direction === 'asc'
			? leftPlayTime - rightPlayTime
			: rightPlayTime - leftPlayTime
	}

	return left.username.localeCompare(right.username)
}

const summarizePublicDirectoryUserPlayTime = async (
	userIds: string[],
): Promise<Map<string, number>> => {
	if (!userIds.length) {
		return new Map()
	}

	const accounts = await prisma.minecraftAccount.findMany({
		where: {
			userId: {
				in: userIds,
			},
			unlinkedAt: null,
		},
		include: publicPlayerInclude,
	})

	if (!accounts.length) {
		return new Map()
	}

	const players = await readDirectoryServerPlayers(accounts)
	const histories = await prisma.minecraftAccountBindingHistory.findMany({
		where: {
			minecraftAccountId: {
				in: accounts.map((account) => account.id),
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
	})
	const historyByAccountId = new Map<string, typeof histories>()

	for (const history of histories) {
		const bucket = historyByAccountId.get(history.minecraftAccountId) ?? []
		bucket.push(history)
		historyByAccountId.set(history.minecraftAccountId, bucket)
	}

	const luckPermsResolver = createLuckPermsPrimaryGroupResolver(
		await readLuckPermsSnapshotBundle({
			uuids: players.map((player) => player.uuid),
			normalizedUsernames: accounts.map(
				(account) => account.normalizedUsername,
			),
		}),
	)
	const playTimeByUserId = new Map<string, number>()

	for (const account of accounts) {
		const summary = buildMinecraftAccountSummary(
			account,
			players,
			historyByAccountId.get(account.id) ?? [],
			luckPermsResolver,
		)
		const currentTotal = playTimeByUserId.get(account.userId ?? '') ?? 0
		playTimeByUserId.set(
			account.userId ?? '',
			currentTotal + summary.playerProfile.playTimeTicks,
		)
	}

	return playTimeByUserId
}

const toPublicDirectoryUserItem = (
	user: PublicDirectoryUserEntity,
	playTimeByUserId: Map<string, number>,
): ServerDirectoryUserItem => ({
	hydrolineId:
		(user.privacy?.showHydrolineId ?? true) ? user.hydrolineId : null,
	username: user.username,
	displayName: user.displayName,
	avatarUrl: user.avatarUrl,
	bio: (user.privacy?.showBio ?? true) ? user.bio : null,
	registeredAt:
		(user.privacy?.showJoinedAt ?? true) ? user.createdAt.toISOString() : null,
	joinedAt:
		(user.privacy?.showJoinedAt ?? true) ? user.joinedAt.toISOString() : null,
	playTimeTicks: playTimeByUserId.get(user.id) ?? 0,
	hasPlayTime: user.minecraftAccounts.length > 0,
	minecraftAccounts:
		(user.privacy?.showMinecraftProfileLink ?? true)
			? user.minecraftAccounts.map((account) => ({
					mcid: account.username,
					username: account.username,
				}))
			: [],
	badges:
		(user.privacy?.showBadges ?? true) ? user.badges.map(toBadgeSummary) : [],
	roleBadge:
		(user.privacy?.showBadges ?? true) ? toRoleBadgeSummary(user) : null,
	verified: toVerifiedSummary(user),
})

export const listPublicServerUsers = async (input: {
	page: number
	pageSize: number
	search?: string
	sortField?: string
	sortDirection?: 'asc' | 'desc'
}) => {
	const where: Prisma.UserWhereInput = {
		status: 'ACTIVE',
		OR: [
			{
				privacy: null,
			},
			{
				privacy: {
					is: {
						publicProfile: true,
						searchableInUserDirectory: true,
					},
				},
			},
		],
		...(input.search
			? {
					AND: [
						{
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
									bio: {
										contains: input.search,
										mode: 'insensitive',
									},
								},
							],
						},
					],
				}
			: {}),
	}
	const [total, users] = await Promise.all([
		prisma.user.count({
			where,
		}),
		prisma.user.findMany({
			where,
			orderBy:
				input.sortField === 'playTimeTicks'
					? buildUserOrderBy('username', 'asc')
					: buildUserOrderBy(input.sortField, input.sortDirection),
			...(input.sortField === 'playTimeTicks'
				? {}
				: {
						skip: (input.page - 1) * input.pageSize,
						take: input.pageSize,
					}),
			select: publicDirectoryUserSelect,
		}),
	])

	const visibleUsers = users.filter((user) =>
		isPublicDirectoryUser(user.privacy),
	)
	const playTimeByUserId = await summarizePublicDirectoryUserPlayTime(
		visibleUsers.map((user) => user.id),
	)
	const items = visibleUsers.map((user) =>
		toPublicDirectoryUserItem(user, playTimeByUserId),
	)

	if (input.sortField === 'playTimeTicks') {
		items.sort((left, right) =>
			compareDirectoryUserPlayTime(left, right, input.sortDirection ?? 'desc'),
		)
	}

	return {
		items:
			input.sortField === 'playTimeTicks'
				? items.slice(
						(input.page - 1) * input.pageSize,
						input.page * input.pageSize,
					)
				: items,
		page: input.page,
		pageSize: input.pageSize,
		total,
		pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
	}
}

const readDirectoryServerPlayers = async (
	accounts: PublicPlayerEntity[],
): Promise<PublicServerPlayerEntity[]> => {
	const uuids = accounts
		.map((account) => account.uuid)
		.filter((uuid): uuid is string => Boolean(uuid))
	const normalizedUsernames = accounts.map(
		(account) => account.normalizedUsername,
	)

	if (!uuids.length && !normalizedUsernames.length) {
		return []
	}

	return await prisma.minecraftServerPlayer.findMany({
		where: {
			OR: [
				{
					normalizedUsername: {
						in: normalizedUsernames,
					},
				},
				...(uuids.length
					? [
							{
								uuid: {
									in: uuids,
								},
							},
						]
					: []),
			],
		},
		include: PUBLIC_PLAYERDATA_INCLUDE,
		orderBy: [{ online: 'desc' }, { bridgeSyncedAt: 'desc' }],
	})
}

const summarizeDirectoryPlayTime = (
	summary: ReturnType<typeof buildMinecraftAccountSummary>,
): Pick<ServerDirectoryPlayerItem, 'playTimeTicks' | 'hasStats'> => {
	const observedPlayers = summary.playerIdentity.observedPlayers

	if (!observedPlayers.length) {
		return {
			playTimeTicks: summary.playerProfile.playTimeTicks,
			hasStats: summary.playerProfile.hasStats,
		}
	}

	return observedPlayers.reduce<
		Pick<ServerDirectoryPlayerItem, 'playTimeTicks' | 'hasStats'>
	>(
		(aggregate, player) => ({
			playTimeTicks:
				aggregate.playTimeTicks + player.playerProfile.playTimeTicks,
			hasStats: aggregate.hasStats || player.playerProfile.hasStats,
		}),
		{
			playTimeTicks: 0,
			hasStats: false,
		},
	)
}

const compareNullableStrings = (
	left: string | null,
	right: string | null,
): number => {
	if (left === right) {
		return 0
	}

	if (left === null) {
		return 1
	}

	if (right === null) {
		return -1
	}

	return left.localeCompare(right)
}

const compareDirectoryPlayerPlayTime = (
	left: ServerDirectoryPlayerItem,
	right: ServerDirectoryPlayerItem,
	direction: 'asc' | 'desc',
): number => {
	const leftPlayTime = left.hasStats ? left.playTimeTicks : null
	const rightPlayTime = right.hasStats ? right.playTimeTicks : null

	if (leftPlayTime === null && rightPlayTime === null) {
		const usernameResult = left.username.localeCompare(right.username)
		return usernameResult || compareNullableStrings(left.uuid, right.uuid)
	}

	if (leftPlayTime === null) {
		return 1
	}

	if (rightPlayTime === null) {
		return -1
	}

	if (leftPlayTime !== rightPlayTime) {
		return direction === 'asc'
			? leftPlayTime - rightPlayTime
			: rightPlayTime - leftPlayTime
	}

	const usernameResult = left.username.localeCompare(right.username)
	return usernameResult || compareNullableStrings(left.uuid, right.uuid)
}

const buildDirectoryPlayerItems = (
	accounts: PublicPlayerEntity[],
	players: PublicServerPlayerEntity[],
	luckPermsResolver: ReturnType<typeof createLuckPermsPrimaryGroupResolver>,
): ServerDirectoryPlayerItem[] =>
	accounts.map((account) => {
		const summary = buildMinecraftAccountSummary(
			account,
			players,
			[],
			luckPermsResolver,
		)
		const playTimeSummary = summarizeDirectoryPlayTime(summary)
		const linkedUser =
			account.user && canExposeBoundUser(account.user.privacy)
				? {
						username: account.user.username,
						displayName: account.user.displayName,
						avatarUrl: account.user.avatarUrl,
					}
				: null
		const mcid =
			summary.playerIdentity.playerId || summary.username || account.username

		return {
			id: account.id,
			mcid,
			username: summary.username,
			uuid: summary.uuid,
			isPrimary: summary.isPrimary,
			identityKind: account.identityKind,
			luckPermsPrimaryGroup: summary.luckPermsPrimaryGroup,
			authMeRegisteredAt:
				account.authMeAccount?.registeredAt?.toISOString() ?? null,
			authMeLastLoginAt:
				account.authMeAccount?.lastLoginAt?.toISOString() ?? null,
			playTimeTicks: playTimeSummary.playTimeTicks,
			hasStats: playTimeSummary.hasStats,
			linkedUser,
		}
	})

export const listPublicServerPlayers = async (input: {
	page: number
	pageSize: number
	search?: string
	linked?: string
	identity?: string
	group?: string
	sortField?: string
	sortDirection?: 'asc' | 'desc'
}) => {
	const linked =
		input.linked === 'linked'
			? true
			: input.linked === 'unlinked'
				? false
				: undefined
	const identity =
		input.identity === 'formal'
			? 'AUTHENTICATED'
			: input.identity === 'historical'
				? 'HISTORICAL'
				: undefined
	const groupMatchedNames = input.group
		? await findGroupMatchedNames(input.group)
		: undefined
	const where: Prisma.MinecraftAccountWhereInput = {
		unlinkedAt: null,
		...(identity === 'HISTORICAL'
			? {
					identityKind: 'HISTORICAL',
				}
			: identity === 'AUTHENTICATED'
				? {
						identityKind: 'AUTHENTICATED',
						authMeAccount: {
							isNot: null,
						},
					}
				: {
						OR: [
							{
								identityKind: 'AUTHENTICATED',
								authMeAccount: {
									isNot: null,
								},
							},
							{
								identityKind: 'HISTORICAL',
							},
						],
					}),
		...(linked === undefined
			? {}
			: linked
				? { userId: { not: null } }
				: { userId: null }),
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
						{
							username: {
								contains: input.search,
								mode: 'insensitive',
							},
						},
						{
							authmeName: {
								contains: input.search,
								mode: 'insensitive',
							},
						},
						{
							authMeAccount: {
								is: {
									OR: [
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
									],
								},
							},
						},
					],
				}
			: {}),
	}
	const sortDirection = input.sortDirection ?? 'desc'
	const [total, formalCount, historicalCount] = await Promise.all([
		prisma.minecraftAccount.count({
			where,
		}),
		prisma.minecraftAccount.count({
			where: {
				...where,
				identityKind: 'AUTHENTICATED',
				authMeAccount: {
					isNot: null,
				},
			},
		}),
		prisma.minecraftAccount.count({
			where: {
				...where,
				identityKind: 'HISTORICAL',
			},
		}),
	])

	if (input.sortField === 'playTimeTicks') {
		const accounts = await prisma.minecraftAccount.findMany({
			where,
			orderBy: buildPlayerOrderBy('username', 'asc'),
			include: publicPlayerInclude,
		})
		const players = await readDirectoryServerPlayers(accounts)
		const luckPermsResolver = createLuckPermsPrimaryGroupResolver(
			await readLuckPermsSnapshotBundle({
				uuids: players.map((player) => player.uuid),
				normalizedUsernames: accounts.map(
					(account) => account.normalizedUsername,
				),
			}),
		)
		const items = buildDirectoryPlayerItems(
			accounts,
			players,
			luckPermsResolver,
		)
			.sort((left, right) =>
				compareDirectoryPlayerPlayTime(left, right, sortDirection),
			)
			.slice((input.page - 1) * input.pageSize, input.page * input.pageSize)

		return {
			items,
			page: input.page,
			pageSize: input.pageSize,
			total,
			pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
			formalCount,
			historicalCount,
		}
	}

	const accounts = await prisma.minecraftAccount.findMany({
		where,
		orderBy: buildPlayerOrderBy(input.sortField, input.sortDirection),
		skip: (input.page - 1) * input.pageSize,
		take: input.pageSize,
		include: publicPlayerInclude,
	})
	const players = await readDirectoryServerPlayers(accounts)
	const luckPermsResolver = createLuckPermsPrimaryGroupResolver(
		await readLuckPermsSnapshotBundle({
			uuids: players.map((player) => player.uuid),
			normalizedUsernames: accounts.map(
				(account) => account.normalizedUsername,
			),
		}),
	)
	const items = buildDirectoryPlayerItems(accounts, players, luckPermsResolver)

	return {
		items,
		page: input.page,
		pageSize: input.pageSize,
		total,
		pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
		formalCount,
		historicalCount,
	}
}
