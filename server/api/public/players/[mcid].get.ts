import { getRouterParam } from 'h3'
import { prisma } from '../../../utils/db/prisma'
import { createApiError } from '../../../utils/errors'
import { requireCurrentUser } from '../../../utils/auth/session'
import {
	buildMinecraftAccountSummary,
	buildUnboundPlayerSummary,
	minecraftAccountSummaryPlayerInclude,
} from '../../../utils/minecraft/account-summary'
import {
	buildMinecraftAuthMeActivitySummary,
	type MinecraftAuthMeActivitySummary,
} from '../../../utils/minecraft/authme-activity'
import { createLuckPermsPrimaryGroupResolver } from '../../../utils/luckperms/primary-group'
import { readLuckPermsSnapshotBundle } from '../../../utils/luckperms/snapshot'
import { toPrivacySummary } from '../../../utils/profile/mapper'
import { findUserProfileById } from '../../../utils/profile/repository'
import { normalizeUsernameForComparison } from '../../../utils/profile/validation'

const PLAYER_INCLUDE = minecraftAccountSummaryPlayerInclude

export default defineEventHandler(async (event) => {
	const mcid = getRouterParam(event, 'mcid') ?? ''
	const normalizedUsername = normalizeUsernameForComparison(mcid)

	if (!normalizedUsername) {
		throw createApiError({
			statusCode: 404,
			code: 'PLAYER_NOT_FOUND',
		})
	}

	// 游戏数据源：按 minecraft 用户名查所有服的 serverPlayer。
	const players = await prisma.minecraftServerPlayer.findMany({
		where: {
			normalizedUsername,
		},
		include: PLAYER_INCLUDE,
		orderBy: [{ online: 'desc' }, { bridgeSyncedAt: 'desc' }],
	})

	// LuckPerms 主组：按 MC 玩家 ID（normalizedUsername）匹配，两条分支共用。
	const luckPermsResolver = createLuckPermsPrimaryGroupResolver(
		await readLuckPermsSnapshotBundle({
			uuids: players.map((player) => player.uuid),
			normalizedUsernames: [normalizedUsername],
		}),
	)

	// 绑定关系：可能存在也可能不存在（未绑定也可查）。
	const account = await prisma.minecraftAccount.findFirst({
		where: {
			normalizedUsername,
			unlinkedAt: null,
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

	// 命中 minecraftAccount：若已绑定 portal 账户，仅顶部“绑定到 Portal 用户”
	// 提示受 allowMinecraftProfileDiscovery 约束；玩家页本身仍可按游戏身份公开展示。
	// 若仅是 AuthMe/导入账号未绑定 portal，也允许按游戏身份公开展示。
	if (account) {
		let boundPortalUser: { username: string; avatarUrl: string | null } | null =
			null

		if (account.userId) {
			const user = await findUserProfileById(account.userId)

			if (!user) {
				throw createApiError({
					statusCode: 404,
					code: 'PLAYER_NOT_FOUND',
				})
			}

			const privacy = toPrivacySummary(user)

			if (privacy.allowMinecraftProfileDiscovery) {
				boundPortalUser = {
					username: user.username,
					avatarUrl: user.avatarUrl,
				}
			}
		}

		const histories = await prisma.minecraftAccountBindingHistory.findMany({
			where: {
				minecraftAccountId: account.id,
			},
			orderBy: {
				createdAt: 'desc',
			},
		})

		const summary = buildMinecraftAccountSummary(
			account,
			players,
			histories,
			luckPermsResolver,
		)
		const currentUser =
			account.identityKind === 'AUTHENTICATED' && account.userId
				? await requireCurrentUser(event).catch(() => null)
				: null
		const canViewAuthMeActivity =
			account.identityKind === 'AUTHENTICATED' &&
			Boolean(account.userId && account.userId === currentUser?.id)
		const authMeActivity: MinecraftAuthMeActivitySummary = canViewAuthMeActivity
			? await buildMinecraftAuthMeActivitySummary(account.authMeAccount)
			: { lastLogin: null, registration: null }

		// 公开页不暴露 AuthMe 账号标识与绑定历史；登录和注册摘要只在当前登录
		// 用户查看确实绑定给自己的正式档案时返回，不向访客或其他用户下发。
		return {
			account: {
				...summary,
				authmeId: null,
				authmeUsername: null,
				unlinkedAt: null,
				recentHistory: [],
				boundPortalUser,
				...authMeActivity,
			},
		}
	}

	// 未绑定：仅凭游戏数据展示，无 portal 账户故无隐私开关可约束。
	const unboundSummary = buildUnboundPlayerSummary(players, luckPermsResolver)

	if (!unboundSummary) {
		throw createApiError({
			statusCode: 404,
			code: 'PLAYER_NOT_FOUND',
		})
	}

	return {
		account: {
			...unboundSummary,
			boundPortalUser: null,
			lastLogin: null,
			registration: null,
		},
	}
})
