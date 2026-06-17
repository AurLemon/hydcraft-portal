import type { Prisma } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'

const SNAPSHOT_SORT_FIELDS = new Set([
	'observedAt',
	'lastScannedAt',
	'createdAt',
	'username',
])

const advancementsSnapshotInclude = {
	player: {
		include: {
			playerData: true,
		},
	},
} satisfies Prisma.MinecraftServerPlayerAdvancementsSnapshotInclude

type AdvancementsSnapshotEntity =
	Prisma.MinecraftServerPlayerAdvancementsSnapshotGetPayload<{
		include: typeof advancementsSnapshotInclude
	}>

interface ServerPlayerAuthMeEnrichment {
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
}

const isJsonObject = (value: unknown): value is Prisma.JsonObject =>
	typeof value === 'object' && value !== null && !Array.isArray(value)

interface AdvancementDetailRow {
	id: string
	snapshot: AdvancementsSnapshotEntity
	advancementKey: string
	done: boolean
	criteriaCount: number
	completedCriteriaCount: number
	completedCriteria: string[]
}

const readCriteria = (
	value: Prisma.JsonValue | undefined,
): Record<string, unknown> => {
	if (!isJsonObject(value)) {
		return {}
	}

	const criteria = value.criteria

	return isJsonObject(criteria) ? criteria : {}
}

const flattenAdvancementRows = (
	snapshots: AdvancementsSnapshotEntity[],
): AdvancementDetailRow[] =>
	snapshots.flatMap((snapshot) => {
		if (!isJsonObject(snapshot.advancements)) {
			return []
		}

		return Object.entries(snapshot.advancements).map(
			([advancementKey, value]) => {
				const criteria = readCriteria(value)
				const completedCriteria = Object.entries(criteria).flatMap(
					([key, completedAt]) => (completedAt ? [key] : []),
				)

				return {
					id: `${snapshot.id}:${advancementKey}`,
					snapshot,
					advancementKey,
					done: isJsonObject(value) && value.done === true,
					criteriaCount: Object.keys(criteria).length,
					completedCriteriaCount: completedCriteria.length,
					completedCriteria,
				}
			},
		)
	})

const serializeAdvancementDetailRow = (
	row: AdvancementDetailRow,
	enrichment: ServerPlayerAuthMeEnrichment = {},
) => ({
	id: row.id,
	snapshotId: row.snapshot.snapshotId,
	advancementKey: row.advancementKey,
	done: row.done,
	criteriaCount: row.criteriaCount,
	completedCriteriaCount: row.completedCriteriaCount,
	completedCriteria: row.completedCriteria,
	observedAt: row.snapshot.observedAt.toISOString(),
	lastScannedAt: row.snapshot.lastScannedAt?.toISOString() ?? null,
	createdAt: row.snapshot.createdAt.toISOString(),
	player: {
		id: row.snapshot.player.id,
		serverId: row.snapshot.player.serverId,
		uuid: row.snapshot.player.uuid,
		username: row.snapshot.player.username,
		normalizedUsername: row.snapshot.player.normalizedUsername,
		uuidSource: row.snapshot.player.uuidSource,
		firstSeenAt:
			row.snapshot.player.playerData?.firstPlayedAt?.toISOString() ??
			row.snapshot.player.firstSeenAt?.toISOString() ??
			null,
		lastSeenAt:
			row.snapshot.player.playerData?.lastPlayedAt?.toISOString() ??
			row.snapshot.player.lastSeenAt?.toISOString() ??
			null,
		conflictState: row.snapshot.player.conflictState,
	},
	authMe: {
		id: enrichment.authMe?.authmeId ?? null,
		username: enrichment.authMe?.username ?? null,
		realname: enrichment.authMe?.realname ?? null,
		email: enrichment.authMe?.email ?? null,
		registeredAt: enrichment.authMe?.registeredAt?.toISOString() ?? null,
		lastLoginAt: enrichment.authMe?.lastLoginAt?.toISOString() ?? null,
		registerIp: enrichment.authMe?.registerIp ?? null,
		lastIp: enrichment.authMe?.lastIp ?? null,
		hasTotp: enrichment.authMe?.hasTotp ?? false,
		syncedAt: enrichment.authMe?.syncedAt?.toISOString() ?? null,
	},
})

const readServerPlayerAuthMeEnrichment = async (
	players: AdvancementsSnapshotEntity[],
) => {
	const normalizedUsernames = [
		...new Set(
			players.flatMap((snapshot) => snapshot.player.normalizedUsername ?? []),
		),
	]

	const authMeAccounts = await prisma.authMeAccount.findMany({
		where: {
			normalizedUsername: {
				in: normalizedUsernames,
			},
		},
	})
	const authMeByName = new Map(
		authMeAccounts.map((account) => [account.normalizedUsername, account]),
	)

	return new Map(
		players.map((snapshot) => [
			snapshot.id,
			{
				authMe: snapshot.player.normalizedUsername
					? authMeByName.get(snapshot.player.normalizedUsername)
					: null,
			},
		]),
	)
}

const readSearchPlayerFilters = async (
	search: string | undefined,
): Promise<Prisma.MinecraftServerPlayerWhereInput[]> => {
	if (!search) {
		return []
	}

	const [authMeAccounts, luckPermsPlayers] = await Promise.all([
		prisma.authMeAccount.findMany({
			where: {
				OR: [
					{ username: { contains: search, mode: 'insensitive' } },
					{ realname: { contains: search, mode: 'insensitive' } },
					{ email: { contains: search, mode: 'insensitive' } },
					{
						normalizedUsername: {
							contains: search.toLowerCase(),
							mode: 'insensitive',
						},
					},
				],
			},
			select: {
				normalizedUsername: true,
			},
		}),
		prisma.luckPermsPlayer.findMany({
			where: {
				OR: [
					{ uuid: { contains: search, mode: 'insensitive' } },
					{ username: { contains: search, mode: 'insensitive' } },
					{
						normalizedUsername: {
							contains: search.toLowerCase(),
							mode: 'insensitive',
						},
					},
					{ primaryGroup: { contains: search, mode: 'insensitive' } },
				],
			},
			select: {
				uuid: true,
				normalizedUsername: true,
			},
		}),
	])
	const authMeNames = authMeAccounts.map(
		(account) => account.normalizedUsername,
	)
	const luckPermsUuids = luckPermsPlayers.map((player) => player.uuid)
	const luckPermsNames = luckPermsPlayers.flatMap((player) =>
		player.normalizedUsername ? [player.normalizedUsername] : [],
	)

	return [
		...(authMeNames.length
			? [{ normalizedUsername: { in: authMeNames } }]
			: []),
		...(luckPermsUuids.length ? [{ uuid: { in: luckPermsUuids } }] : []),
		...(luckPermsNames.length
			? [{ normalizedUsername: { in: luckPermsNames } }]
			: []),
	]
}

export const listServerPlayerAdvancementsSnapshots = async (input: {
	page: number
	pageSize: number
	search?: string
	serverId?: string
	sortField?: string
	sortDirection?: 'asc' | 'desc'
	player?: string
}) => {
	const normalizedPlayer = input.player?.toLowerCase()
	const searchPlayerFilters = await readSearchPlayerFilters(input.search)
	const where: Prisma.MinecraftServerPlayerAdvancementsSnapshotWhereInput = {
		player: {
			is: {
				...(input.serverId ? { serverId: input.serverId } : {}),
				...(normalizedPlayer ? { normalizedUsername: normalizedPlayer } : {}),
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
									normalizedUsername: {
										contains: input.search.toLowerCase(),
										mode: 'insensitive',
									},
								},
								{
									serverId: {
										contains: input.search,
										mode: 'insensitive',
									},
								},
								...searchPlayerFilters,
							],
						}
					: {}),
			},
		},
	}
	const sortField = input.sortField ?? 'observedAt'
	const sortDirection = input.sortDirection ?? 'desc'
	const orderBy: Prisma.MinecraftServerPlayerAdvancementsSnapshotOrderByWithRelationInput[] =
		sortField === 'username'
			? [{ player: { username: sortDirection } }, { observedAt: 'desc' }]
			: SNAPSHOT_SORT_FIELDS.has(sortField)
				? [{ [sortField]: sortDirection }, { observedAt: 'desc' }]
				: [{ observedAt: 'desc' }]

	const snapshots =
		await prisma.minecraftServerPlayerAdvancementsSnapshot.findMany({
			where,
			orderBy,
			include: advancementsSnapshotInclude,
		})
	const rows = flattenAdvancementRows(snapshots)
	const sortedRows =
		sortField === 'advancementKey'
			? [...rows].sort((left, right) => {
					const result = left.advancementKey.localeCompare(right.advancementKey)

					return sortDirection === 'asc' ? result : -result
				})
			: rows
	const pagedRows = sortedRows.slice(
		(input.page - 1) * input.pageSize,
		input.page * input.pageSize,
	)
	const enrichment = await readServerPlayerAuthMeEnrichment([
		...new Map(
			pagedRows.map((row) => [row.snapshot.id, row.snapshot]),
		).values(),
	])

	return {
		items: pagedRows.map((row) =>
			serializeAdvancementDetailRow(row, enrichment.get(row.snapshot.id)),
		),
		page: input.page,
		pageSize: input.pageSize,
		total: sortedRows.length,
		pageCount: Math.max(1, Math.ceil(sortedRows.length / input.pageSize)),
	}
}
