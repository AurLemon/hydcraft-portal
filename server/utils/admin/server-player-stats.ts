import type { Prisma } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'

const SNAPSHOT_SORT_FIELDS = new Set([
	'observedAt',
	'lastScannedAt',
	'createdAt',
	'username',
])

const statsSnapshotInclude = {
	player: {
		include: {
			playerData: true,
		},
	},
} satisfies Prisma.MinecraftServerPlayerStatsSnapshotInclude

type StatsSnapshotEntity = Prisma.MinecraftServerPlayerStatsSnapshotGetPayload<{
	include: typeof statsSnapshotInclude
}>

interface SnapshotAuthMeEnrichment {
	authMe: {
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

interface StatsDetailRow {
	id: string
	snapshot: StatsSnapshotEntity
	category: string
	key: string
	value: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value)

const formatJsonValue = (value: unknown): string => {
	if (value === null || value === undefined) {
		return ''
	}

	if (typeof value === 'string') {
		return value
	}

	if (
		typeof value === 'number' ||
		typeof value === 'boolean' ||
		typeof value === 'bigint'
	) {
		return String(value)
	}

	return JSON.stringify(value)
}

const flattenStatsRows = (snapshots: StatsSnapshotEntity[]): StatsDetailRow[] =>
	snapshots.flatMap((snapshot) => {
		if (!isRecord(snapshot.stats)) {
			return []
		}

		return Object.entries(snapshot.stats).flatMap(([category, entry]) => {
			if (!isRecord(entry)) {
				return [
					{
						id: `${snapshot.id}:${category}`,
						snapshot,
						category: 'root',
						key: category,
						value: entry,
					},
				]
			}

			return Object.entries(entry).map(([key, value]) => ({
				id: `${snapshot.id}:${category}:${key}`,
				snapshot,
				category,
				key,
				value,
			}))
		})
	})

const readSnapshotAuthMeEnrichment = async (
	snapshots: StatsSnapshotEntity[],
) => {
	const normalizedUsernames = [
		...new Set(
			snapshots.flatMap((snapshot) => snapshot.player.normalizedUsername ?? []),
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

	return new Map<string, SnapshotAuthMeEnrichment>(
		snapshots.map((snapshot) => [
			snapshot.id,
			{
				authMe: snapshot.player.normalizedUsername
					? (authMeByName.get(snapshot.player.normalizedUsername) ?? null)
					: null,
			},
		]),
	)
}

const serializeStatsDetailRow = (
	row: StatsDetailRow,
	enrichment: SnapshotAuthMeEnrichment | undefined,
) => ({
	id: row.id,
	snapshotId: row.snapshot.snapshotId,
	category: row.category,
	key: row.key,
	value: row.value,
	valueText: formatJsonValue(row.value),
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
		id: enrichment?.authMe?.authmeId ?? null,
		username: enrichment?.authMe?.username ?? null,
		realname: enrichment?.authMe?.realname ?? null,
		email: enrichment?.authMe?.email ?? null,
		registeredAt: enrichment?.authMe?.registeredAt?.toISOString() ?? null,
		lastLoginAt: enrichment?.authMe?.lastLoginAt?.toISOString() ?? null,
		registerIp: enrichment?.authMe?.registerIp ?? null,
		lastIp: enrichment?.authMe?.lastIp ?? null,
		hasTotp: enrichment?.authMe?.hasTotp ?? false,
		syncedAt: enrichment?.authMe?.syncedAt?.toISOString() ?? null,
	},
})

export const listServerPlayerStatsSnapshots = async (input: {
	page: number
	pageSize: number
	search?: string
	serverId?: string
	player?: string
	sortField?: string
	sortDirection?: 'asc' | 'desc'
}) => {
	const normalizedPlayer = input.player?.toLowerCase()
	const where: Prisma.MinecraftServerPlayerStatsSnapshotWhereInput = {
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
							],
						}
					: {}),
			},
		},
	}
	const sortField = input.sortField ?? 'observedAt'
	const sortDirection = input.sortDirection ?? 'desc'
	const orderBy: Prisma.MinecraftServerPlayerStatsSnapshotOrderByWithRelationInput[] =
		sortField === 'username'
			? [{ player: { username: sortDirection } }, { observedAt: 'desc' }]
			: SNAPSHOT_SORT_FIELDS.has(sortField)
				? [{ [sortField]: sortDirection }, { observedAt: 'desc' }]
				: [{ observedAt: 'desc' }]

	const snapshots = await prisma.minecraftServerPlayerStatsSnapshot.findMany({
		where,
		orderBy,
		include: statsSnapshotInclude,
	})
	const rows = flattenStatsRows(snapshots)
	const sortedRows =
		sortField === 'category' || sortField === 'key'
			? [...rows].sort((left, right) => {
					const result = left[sortField].localeCompare(right[sortField])

					return sortDirection === 'asc' ? result : -result
				})
			: rows
	const pagedRows = sortedRows.slice(
		(input.page - 1) * input.pageSize,
		input.page * input.pageSize,
	)
	const enrichment = await readSnapshotAuthMeEnrichment([
		...new Map(
			pagedRows.map((row) => [row.snapshot.id, row.snapshot]),
		).values(),
	])

	return {
		items: pagedRows.map((row) =>
			serializeStatsDetailRow(row, enrichment.get(row.snapshot.id)),
		),
		page: input.page,
		pageSize: input.pageSize,
		total: sortedRows.length,
		pageCount: Math.max(1, Math.ceil(sortedRows.length / input.pageSize)),
	}
}
