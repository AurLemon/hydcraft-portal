import { prisma } from '../db/prisma'
import { createApiError } from '../errors'
import { createLuckPermsPrimaryGroupResolver } from '../luckperms/primary-group'
import { readLuckPermsSnapshotBundle } from '../luckperms/snapshot'
import {
	buildMinecraftAccountSummary,
	minecraftAccountSummaryPlayerInclude,
} from './account-summary'
import { findUserProfileByUsername } from '../profile/repository'
import { toPrivacySummary } from '../profile/mapper'
import {
	assignHistoricalMinecraftAccountToUser,
	unassignHistoricalMinecraftAccountFromUser,
} from './account-binding'
import type { User } from '~/generated/prisma/client'

const buildHistoricalAccountSummaries = async (input: {
	userId?: string
	accountIds?: string[]
}) => {
	const accounts = await prisma.minecraftAccount.findMany({
		where: {
			unlinkedAt: null,
			identityKind: 'HISTORICAL',
			authmeId: null,
			...(input.userId ? { userId: input.userId } : {}),
			...(input.accountIds ? { id: { in: input.accountIds } } : {}),
		},
		include: {
			authMeAccount: true,
			user: {
				select: {
					username: true,
					avatarUrl: true,
				},
			},
		},
		orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
	})

	if (!accounts.length) {
		return []
	}

	const players = await prisma.minecraftServerPlayer.findMany({
		where: {
			OR: [
				{
					uuid: {
						in: accounts.flatMap((account) => account.uuid ?? []),
					},
				},
				{
					normalizedUsername: {
						in: accounts.map((account) => account.normalizedUsername),
					},
				},
			],
		},
		include: minecraftAccountSummaryPlayerInclude,
		orderBy: [{ online: 'desc' }, { bridgeSyncedAt: 'desc' }],
	})
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

	const accountNormalizedUsernames = [
		...new Set(accounts.map((account) => account.normalizedUsername)),
	]
	const luckPermsResolver = createLuckPermsPrimaryGroupResolver(
		await readLuckPermsSnapshotBundle({
			uuids: accounts.flatMap((account) => account.uuid ?? []),
			normalizedUsernames: accountNormalizedUsernames,
		}),
	)

	return accounts.map((account) => ({
		...buildMinecraftAccountSummary(
			account,
			players,
			historyByAccountId.get(account.id) ?? [],
			luckPermsResolver,
		),
		boundPortalUser: account.user
			? {
					username: account.user.username,
					avatarUrl: account.user.avatarUrl,
				}
			: null,
	}))
}

export const getHistoricalMinecraftAccountsForUser = async (userId: string) =>
	await buildHistoricalAccountSummaries({
		userId,
	})

export const getPublicHistoricalMinecraftAccounts = async (
	username: string,
) => {
	const user = await findUserProfileByUsername(username)

	if (!user) {
		throw createApiError({
			statusCode: 404,
			code: 'PROFILE_NOT_FOUND',
		})
	}

	const privacy = toPrivacySummary(user)

	if (!privacy.publicProfile || !privacy.showMinecraftProfileLink) {
		throw createApiError({
			statusCode: 404,
			code: 'MINECRAFT_PROFILE_NOT_PUBLIC',
		})
	}

	return await getHistoricalMinecraftAccountsForUser(user.id)
}

const compareNullableStrings = (
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

	const result = left.localeCompare(right, undefined, {
		sensitivity: 'base',
	})

	return direction === 'asc' ? result : -result
}

const compareNullableDates = (
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

	const result = new Date(left).getTime() - new Date(right).getTime()

	return direction === 'asc' ? result : -result
}

export const listAdminHistoricalMinecraftAccounts = async (input: {
	page: number
	pageSize: number
	search?: string
	assigned?: 'assigned' | 'unassigned'
	serverId?: string
	sortField?: string
	sortDirection?: 'asc' | 'desc'
}) => {
	const summaries = await buildHistoricalAccountSummaries({})
	const filtered = summaries.filter((summary) => {
		if (input.assigned === 'assigned' && !summary.boundPortalUser) {
			return false
		}
		if (input.assigned === 'unassigned' && summary.boundPortalUser) {
			return false
		}
		if (
			input.serverId &&
			!summary.serverViews.some((view) => view.serverId === input.serverId)
		) {
			return false
		}
		if (!input.search) {
			return true
		}

		const needle = input.search.toLowerCase()
		return (
			summary.username.toLowerCase().includes(needle) ||
			summary.normalizedUsername.toLowerCase().includes(needle) ||
			(summary.playerIdentity.playerId ?? '').toLowerCase().includes(needle) ||
			(summary.boundPortalUser?.username ?? '').toLowerCase().includes(needle)
		)
	})
	const sortField = input.sortField ?? 'username'
	const sortDirection = input.sortDirection ?? 'asc'
	const sorted = [...filtered].sort((left, right) => {
		if (sortField === 'user') {
			const result = compareNullableStrings(
				left.boundPortalUser?.username,
				right.boundPortalUser?.username,
				sortDirection,
			)

			return (
				result ||
				compareNullableStrings(left.username, right.username, 'asc') ||
				left.id.localeCompare(right.id)
			)
		}

		if (sortField === 'servers') {
			const leftServers = left.serverViews
				.filter((view) => view.serverId)
				.map((view) => view.serverNames?.nameZhCn || view.label)
				.join('\n')
			const rightServers = right.serverViews
				.filter((view) => view.serverId)
				.map((view) => view.serverNames?.nameZhCn || view.label)
				.join('\n')
			const result = compareNullableStrings(
				leftServers,
				rightServers,
				sortDirection,
			)

			return (
				result ||
				compareNullableStrings(left.username, right.username, 'asc') ||
				left.id.localeCompare(right.id)
			)
		}

		if (sortField === 'firstJoinedAt' || sortField === 'lastSeenAt') {
			const result = compareNullableDates(
				left[sortField],
				right[sortField],
				sortDirection,
			)

			return (
				result ||
				compareNullableStrings(left.username, right.username, 'asc') ||
				left.id.localeCompare(right.id)
			)
		}

		const result = compareNullableStrings(
			left.username,
			right.username,
			sortDirection,
		)

		return result || left.id.localeCompare(right.id)
	})
	const total = sorted.length
	const pageCount = Math.max(Math.ceil(total / input.pageSize), 1)
	const page = Math.min(input.page, pageCount)
	const start = (page - 1) * input.pageSize
	const items = sorted.slice(start, start + input.pageSize).map((summary) => ({
		...summary,
		serverCount: summary.serverViews.filter((view) => view.serverId).length,
		serverNames: summary.serverViews
			.filter((view) => view.serverId)
			.map((view) => view.serverNames?.nameZhCn || view.label),
	}))

	return {
		items,
		page,
		pageSize: input.pageSize,
		total,
		pageCount,
	}
}

export const adminAssignHistoricalAccountByUsername = async (input: {
	actingUser: User
	minecraftAccountId: string
	username: string
}) => {
	const targetUser = await prisma.user.findFirst({
		where: {
			username: {
				equals: input.username.trim(),
				mode: 'insensitive',
			},
		},
		select: {
			id: true,
		},
	})

	if (!targetUser) {
		throw createApiError({
			statusCode: 404,
			code: 'USER_NOT_FOUND',
		})
	}

	return await assignHistoricalMinecraftAccountToUser({
		minecraftAccountId: input.minecraftAccountId,
		userId: targetUser.id,
		actorUserId: input.actingUser.id,
		reason: 'admin-history-assign',
	})
}

export const adminUnassignHistoricalAccount = async (input: {
	actingUser: User
	minecraftAccountId: string
}) =>
	await unassignHistoricalMinecraftAccountFromUser({
		minecraftAccountId: input.minecraftAccountId,
		actorUserId: input.actingUser.id,
		reason: 'admin-history-unassign',
	})
