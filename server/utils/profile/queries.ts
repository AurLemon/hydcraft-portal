import { prisma } from '../db/prisma'
import { createApiError, createBadRequestError } from '../errors'
import { createLuckPermsPrimaryGroupResolver } from '../luckperms/primary-group'
import { readLuckPermsSnapshotBundle } from '../luckperms/snapshot'
import {
	buildMinecraftAccountSummary,
	minecraftAccountSummaryPlayerInclude,
} from '../minecraft/account-summary'
import { getHistoricalMinecraftAccountsForUser } from '../minecraft/historical-accounts'
import { ensureUserProfileDefaults } from './defaults'
import {
	toEditableProfile,
	toMinecraftSummary,
	toPrivacySummary,
	toPublicProfile,
} from './mapper'
import { toMinecraftServerLocalizedName } from '~/utils/minecraft/server-name'
import { findUserProfileById, findUserProfileByUsername } from './repository'
import type {
	EditableUserProfile,
	MinecraftProfileSummary,
	PublicUserProfile,
} from './types'
import { normalizeUsername, normalizeUsernameForComparison } from './validation'

const readMinecraftPresence = async (uuid: string | null | undefined) => {
	if (!uuid) {
		return null
	}

	const player = await prisma.minecraftServerPlayer.findFirst({
		where: {
			uuid,
		},
		orderBy: [{ online: 'desc' }, { bridgeSyncedAt: 'desc' }],
		include: {
			playerData: true,
		},
	})

	if (!player) {
		return null
	}

	return {
		online: player.online,
		lastOnlineAt: player.lastOnlineAt,
		lastOnlineWorldName: player.lastOnlineWorldName,
		lastOnlineDimension: player.lastOnlineDimension,
		lastOnlineX: player.lastOnlineX,
		lastOnlineY: player.lastOnlineY,
		lastOnlineZ: player.lastOnlineZ,
		lastSavedWorldName: player.playerData?.lastWorldName ?? null,
		lastSavedDimension: player.playerData?.lastDimension ?? null,
		lastSavedX: player.playerData?.lastX ?? null,
		lastSavedY: player.playerData?.lastY ?? null,
		lastSavedZ: player.playerData?.lastZ ?? null,
		lastSavedYaw: player.playerData?.lastYaw ?? null,
		lastSavedPitch: player.playerData?.lastPitch ?? null,
		lastSavedObservedAt: player.playerData?.syncedAt ?? null,
	}
}

export const getEditableUserProfile = async (
	userId: string,
): Promise<EditableUserProfile> => {
	await ensureUserProfileDefaults(userId)

	const user = await findUserProfileById(userId)

	if (!user) {
		throw createApiError({
			statusCode: 404,
			code: 'USER_NOT_FOUND',
		})
	}
	const presence = await readMinecraftPresence(user.minecraftAccounts[0]?.uuid)

	return toEditableProfile(user, presence)
}

export const getPublicUserProfile = async (
	username: string,
	currentUserId?: string | null,
): Promise<PublicUserProfile> => {
	const user = await findUserProfileByUsername(username)

	if (!user) {
		throw createApiError({
			statusCode: 404,
			code: 'PROFILE_NOT_FOUND',
		})
	}

	const privacy = toPrivacySummary(user)

	if (!privacy.publicProfile) {
		throw createApiError({
			statusCode: 404,
			code: 'PROFILE_NOT_PUBLIC',
		})
	}

	const presence = await readMinecraftPresence(user.minecraftAccounts[0]?.uuid)
	const [publicAccounts, historicalAccounts, servers] = await Promise.all([
		getPublicMinecraftAccounts(username),
		getHistoricalMinecraftAccountsForUser(user.id),
		prisma.minecraftServer.findMany({
			where: { status: 'ONLINE' },
			orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
			select: {
				serverId: true,
				code: true,
				shortCode: true,
				nameZhCn: true,
				nameZhTw: true,
				nameEnUs: true,
				nameJaJp: true,
			},
		}),
	])

	const allAccounts = [...publicAccounts.accounts, ...historicalAccounts]
	const totalPlayTimeTicks = allAccounts.reduce(
		(total, account) => total + account.playerProfile.playTimeTicks,
		0,
	)
	const totalDeaths = allAccounts.reduce(
		(total, account) => total + account.playerProfile.deaths,
		0,
	)
	const totalLeaveCount = allAccounts.reduce(
		(total, account) => total + account.playerProfile.leaveCount,
		0,
	)
	const totalDistanceTraveledCm = allAccounts.reduce(
		(total, account) => total + account.playerProfile.distanceTraveledCm,
		0,
	)
	const totalSeconds = Math.floor(totalPlayTimeTicks / 20)
	const totalDays = Math.floor(totalSeconds / 86400)
	const detailedDuration = {
		years: Math.floor(totalDays / 365),
		months: Math.floor((totalDays % 365) / 30),
		days: (totalDays % 365) % 30,
		hours: Math.floor((totalSeconds % 86400) / 3600),
		minutes: Math.floor((totalSeconds % 3600) / 60),
		seconds: totalSeconds % 60,
	}
	const minecraftArchiveSummary =
		allAccounts.length > 0
			? {
					totalAccounts: allAccounts.length,
					totalPlayTimeTicks,
					totalDeaths,
					totalLeaveCount,
					totalDistanceTraveledCm,
					detailedDuration,
				}
			: null
	const firstPlayerIdByServerId = new Map<string, string | null>()
	const earliestFirstJoinedAtByServerId = new Map<string, Date | null>()

	for (const account of allAccounts) {
		for (const view of account.serverViews) {
			if (!view.serverId) {
				continue
			}

			if (!firstPlayerIdByServerId.has(view.serverId)) {
				firstPlayerIdByServerId.set(
					view.serverId,
					account.playerIdentity.playerId ?? account.username,
				)
			}

			const candidateFirstJoinedAt = view.firstJoinedAt
				? new Date(view.firstJoinedAt)
				: account.firstJoinedAt
					? new Date(account.firstJoinedAt)
					: null
			const currentEarliestFirstJoinedAt =
				earliestFirstJoinedAtByServerId.get(view.serverId) ?? null

			if (
				!candidateFirstJoinedAt ||
				Number.isNaN(candidateFirstJoinedAt.getTime())
			) {
				continue
			}

			if (
				!currentEarliestFirstJoinedAt ||
				candidateFirstJoinedAt < currentEarliestFirstJoinedAt
			) {
				earliestFirstJoinedAtByServerId.set(
					view.serverId,
					candidateFirstJoinedAt,
				)
			}
		}
	}

	const minecraftServerTimeline = servers.map((server) => ({
		serverId: server.serverId,
		serverNames: toMinecraftServerLocalizedName(server),
		serverShortCode: server.shortCode,
		highlighted: firstPlayerIdByServerId.has(server.serverId),
		playerId: firstPlayerIdByServerId.get(server.serverId) ?? null,
		earliestFirstJoinedAt:
			earliestFirstJoinedAtByServerId.get(server.serverId) ?? null,
	}))

	return toPublicProfile(user, currentUserId, presence, {
		minecraftArchiveSummary,
		minecraftServerTimeline,
	})
}

export const getPublicMinecraftSummary = async (
	username: string,
): Promise<MinecraftProfileSummary> => {
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

	const summary = toMinecraftSummary(
		user,
		await readMinecraftPresence(user.minecraftAccounts[0]?.uuid),
	)

	if (!summary) {
		throw createApiError({
			statusCode: 404,
			code: 'MINECRAFT_PROFILE_NOT_FOUND',
		})
	}

	return summary
}

/**
 * 按 portal 用户名查其绑定的全部 Minecraft 账号（组装为 MinecraftAccountSummary[]），
 * 供公开主页 /u/[username] 的 Minecraft 档案卡片复用 MinecraftAccountsContent 组件。
 *
 * 与私有 /api/users/me/minecraft-accounts 共享 buildMinecraftAccountSummary 组装逻辑，
 * 区别：1) 按 username 查 user（带公开隐私门控）；2) 脱敏清空 authmeId/authmeUsername/
 * unlinkedAt/recentHistory（绑定历史含 actor/reason，不对外）。
 */
export const getPublicMinecraftAccounts = async (
	username: string,
): Promise<{ accounts: ReturnType<typeof buildMinecraftAccountSummary>[] }> => {
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

	const accounts = await prisma.minecraftAccount.findMany({
		where: {
			userId: user.id,
			unlinkedAt: null,
			identityKind: 'AUTHENTICATED',
		},
		include: {
			authMeAccount: true,
		},
		orderBy: [
			{
				isPrimary: 'desc',
			},
			{
				updatedAt: 'desc',
			},
		],
	})

	if (accounts.length === 0) {
		return { accounts: [] }
	}

	const players = await prisma.minecraftServerPlayer.findMany({
		where: {
			OR: [
				{
					uuid: {
						in: accounts
							.map((account) => account.uuid)
							.filter((uuid): uuid is string => Boolean(uuid)),
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

	const summaries = accounts.map((account) =>
		buildMinecraftAccountSummary(
			account,
			players,
			historyByAccountId.get(account.id) ?? [],
			luckPermsResolver,
		),
	)

	const sanitized = summaries.map((summary) => ({
		...summary,
		authmeId: null,
		authmeUsername: null,
		unlinkedAt: null,
		recentHistory: [],
	}))

	return { accounts: sanitized }
}

export const checkUsernameAvailability = async (
	usernameInput: unknown,
	currentUserId?: string,
): Promise<{ username: string; available: boolean }> => {
	const username = normalizeUsername(usernameInput)
	const normalizedUsername = normalizeUsernameForComparison(username ?? '')

	if (!username) {
		throw createBadRequestError('USERNAME_REQUIRED')
	}

	const user = await prisma.user.findFirst({
		where: {
			OR: [
				{
					username: {
						equals: normalizedUsername,
						mode: 'insensitive',
					},
				},
				{
					handle: normalizedUsername,
				},
			],
		},
		select: {
			id: true,
		},
	})

	return {
		username,
		available: !user || user.id === currentUserId,
	}
}
