import type {
	MinecraftAccountBindingAction,
	Prisma,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { createApiError } from '../errors'
import { toPrivacySummary } from '../profile/mapper'
import { findUserProfileByUsername } from '../profile/repository'
import {
	toMinecraftServerLocalizedName,
	type MinecraftServerLocalizedName,
} from '~/utils/minecraft/server-name'

/**
 * 公开主页「最近活动」卡片的事件类型与统一结构。
 *
 * 三类 MC 游戏内活动合并为同构事件流，按时间倒序返回：
 * - SESSION_OPENED / SESSION_CLOSED：上下线服务器（ServerPlayerSession）
 * - ADVANCEMENT_UNLOCKED：成就解锁（PlayerAdvancementUnlockEvent，差分持久化）
 * - BINDING_CHANGED：账号绑定变更（MinecraftAccountBindingHistory，仅展示可公开的 action）
 *
 * 角色变更（LuckPermsAction）按 actedUuid 关联，但 LuckPerms 同步未必启用且含 actor 信息，
 * 暂不纳入；后续如需可在此扩展。
 */
export interface PublicPlayerActivityEvent {
	id: string
	type:
		| 'SESSION_OPENED'
		| 'SESSION_CLOSED'
		| 'ADVANCEMENT_UNLOCKED'
		| 'USER_REGISTERED'
		| 'BINDING_CHANGED'
	/** 子类型明细，如绑定动作枚举值、成就 key。前端据 i18n 映射展示。 */
	detail: string | null
	serverNames: MinecraftServerLocalizedName | null
	/** ISO 字符串，统一排序键。 */
	occurredAt: string
}

const ACTIVITY_EVENT_LIMIT = 6

const BINDING_ACTION_PUBLIC_LABEL_KEY: Record<string, string> = {
	VERIFICATION_PASSED: 'binding.verificationPassed',
	BIND_CREATED: 'binding.bindCreated',
	PRIMARY_SET: 'binding.primarySet',
	UNBOUND: 'binding.unbound',
	TRANSFERRED: 'binding.transferred',
}

/**
 * 按 portal 用户名聚合其全部 Minecraft 账号的游戏内活动事件。
 *
 * user → minecraftAccounts[] → uuid 集合，再分别查 sessions / 成就解锁事件 / 绑定历史，
 * 合并排序取最近 N 条。隐私门控复用 showActivityStatus（活动状态/最近活动同语义）。
 */
export const getPublicPlayerActivity = async (
	username: string,
): Promise<{ events: PublicPlayerActivityEvent[] }> => {
	const user = await findUserProfileByUsername(username)

	if (!user) {
		throw createApiError({
			statusCode: 404,
			code: 'PROFILE_NOT_FOUND',
		})
	}

	const privacy = toPrivacySummary(user)

	if (!privacy.publicProfile || !privacy.showActivityStatus) {
		throw createApiError({
			statusCode: 404,
			code: 'ACTIVITY_NOT_PUBLIC',
		})
	}

	const accounts = await prisma.minecraftAccount.findMany({
		where: {
			userId: user.id,
			unlinkedAt: null,
		},
		select: {
			id: true,
			uuid: true,
		},
	})

	const uuids = accounts
		.map((account) => account.uuid)
		.filter((uuid): uuid is string => Boolean(uuid))
	const accountIds = accounts.map((account) => account.id)
	const userActivityEvents = await prisma.userActivityEvent.findMany({
		where: {
			userId: user.id,
		},
		orderBy: {
			occurredAt: 'desc',
		},
		take: ACTIVITY_EVENT_LIMIT,
	})

	if (
		uuids.length === 0 &&
		accountIds.length === 0 &&
		userActivityEvents.length === 0
	) {
		return { events: [] }
	}

	// 上下线会话：按 uuid 取最近若干条。
	const sessions = await prisma.serverPlayerSession.findMany({
		where: uuids.length ? { uuid: { in: uuids } } : { id: { in: [] } },
		orderBy: {
			openedAt: 'desc',
		},
		take: ACTIVITY_EVENT_LIMIT,
		include: {
			server: {
				select: {
					nameZhCn: true,
					nameZhTw: true,
					nameEnUs: true,
					nameJaJp: true,
				},
			},
		},
	})

	// 成就解锁事件：按 uuid 取最近若干条。
	const unlocks = await prisma.playerAdvancementUnlockEvent.findMany({
		where: uuids.length ? { uuid: { in: uuids } } : { id: { in: [] } },
		orderBy: {
			unlockedAt: 'desc',
		},
		take: ACTIVITY_EVENT_LIMIT,
		include: {
			player: {
				select: {
					server: {
						select: {
							nameZhCn: true,
							nameZhTw: true,
							nameEnUs: true,
							nameJaJp: true,
						},
					},
				},
			},
		},
	})

	// 绑定历史：仅取可公开的 action，按账号 id。
	const bindingWhere: Prisma.MinecraftAccountBindingHistoryWhereInput = {
		minecraftAccountId: {
			in: accountIds,
		},
		action: {
			in: Object.keys(
				BINDING_ACTION_PUBLIC_LABEL_KEY,
			) as MinecraftAccountBindingAction[],
		},
	}
	const bindings = await prisma.minecraftAccountBindingHistory.findMany({
		where: accountIds.length ? bindingWhere : { id: { in: [] } },
		orderBy: {
			createdAt: 'desc',
		},
		take: ACTIVITY_EVENT_LIMIT,
	})

	const events: PublicPlayerActivityEvent[] = []

	for (const session of sessions) {
		events.push({
			id: `session:${session.id}:opened`,
			type: 'SESSION_OPENED',
			detail: null,
			serverNames: session.server
				? toMinecraftServerLocalizedName(session.server)
				: null,
			occurredAt: session.openedAt.toISOString(),
		})

		if (session.closedAt) {
			events.push({
				id: `session:${session.id}:closed`,
				type: 'SESSION_CLOSED',
				detail: session.closeReason ?? null,
				serverNames: session.server
					? toMinecraftServerLocalizedName(session.server)
					: null,
				occurredAt: session.closedAt.toISOString(),
			})
		}
	}

	for (const unlock of unlocks) {
		events.push({
			id: `advancement:${unlock.id}`,
			type: 'ADVANCEMENT_UNLOCKED',
			detail: unlock.advancementKey,
			serverNames: unlock.player?.server
				? toMinecraftServerLocalizedName(unlock.player.server)
				: null,
			occurredAt: unlock.unlockedAt.toISOString(),
		})
	}

	for (const binding of bindings) {
		events.push({
			id: `binding:${binding.id}`,
			type: 'BINDING_CHANGED',
			detail: binding.action,
			serverNames: null,
			occurredAt: binding.createdAt.toISOString(),
		})
	}

	for (const activity of userActivityEvents) {
		if (activity.type === 'REGISTERED') {
			events.push({
				id: `user-activity:${activity.id}`,
				type: 'USER_REGISTERED',
				detail: null,
				serverNames: null,
				occurredAt: activity.occurredAt.toISOString(),
			})
		}
	}

	events.sort((left, right) => {
		return right.occurredAt.localeCompare(left.occurredAt)
	})

	return {
		events: events.slice(0, ACTIVITY_EVENT_LIMIT),
	}
}
