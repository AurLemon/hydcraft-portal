import { prisma } from '../db/prisma'

export interface PortalBridgeRetentionConfig {
	// 消息回执保留天数。窗口需大于 bridge 端 retainAckedHours（默认 24h），
	// 保证重放窗口内消息仍在 portal 侧可去重；超期靠 hash 门控 + upsert 幂等兜底。
	receiptRetentionDays: number
	// 终态命令保留天数。
	commandRetentionDays: number
	// 每类服务器快照保留的最大条数（按 observedAt 倒序）。
	maxSnapshotsPerKind: number
}

const DEFAULT_RETENTION_CONFIG: PortalBridgeRetentionConfig = {
	receiptRetentionDays: 3,
	commandRetentionDays: 7,
	maxSnapshotsPerKind: 150,
}

const DAY_MS = 24 * 60 * 60 * 1000

const readEnvInt = (value: string | undefined, fallback: number): number => {
	if (!value) {
		return fallback
	}

	const parsed = Number.parseInt(value, 10)

	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const resolvePortalBridgeRetentionConfig =
	(): PortalBridgeRetentionConfig => ({
		receiptRetentionDays: readEnvInt(
			process.env.PORTAL_BRIDGE_RECEIPT_RETENTION_DAYS,
			DEFAULT_RETENTION_CONFIG.receiptRetentionDays,
		),
		commandRetentionDays: readEnvInt(
			process.env.PORTAL_BRIDGE_COMMAND_RETENTION_DAYS,
			DEFAULT_RETENTION_CONFIG.commandRetentionDays,
		),
		maxSnapshotsPerKind: readEnvInt(
			process.env.PORTAL_BRIDGE_MAX_SNAPSHOTS_PER_KIND,
			DEFAULT_RETENTION_CONFIG.maxSnapshotsPerKind,
		),
	})

export interface PortalBridgeRetentionResult {
	receiptsDeleted: number
	commandsDeleted: number
	snapshotsDeleted: number
	ranAt: Date
}

// 清理 portal-bridge 累积的 append-only 数据。bridge 端有 outbox retention，
// portal 端的 receipt / snapshot / 终态命令此前无清理，长期运行会单调膨胀。
export const runPortalBridgeRetention = async (
	config: PortalBridgeRetentionConfig = resolvePortalBridgeRetentionConfig(),
): Promise<PortalBridgeRetentionResult> => {
	const ranAt = new Date()
	const receiptsCutoff = new Date(
		ranAt.getTime() - config.receiptRetentionDays * DAY_MS,
	)
	const commandsCutoff = new Date(
		ranAt.getTime() - config.commandRetentionDays * DAY_MS,
	)

	// 1. 过期消息回执：按 receivedAt 索引删除。
	const receiptsDeleted = await prisma.portalBridgeMessageReceipt.deleteMany({
		where: {
			receivedAt: {
				lt: receiptsCutoff,
			},
		},
	})

	// 2. 过期终态命令：仅删已完成的（COMPLETED / FAILED / REJECTED）。
	const commandsDeleted = await prisma.portalBridgeCommand.deleteMany({
		where: {
			completedAt: {
				lt: commandsCutoff,
			},
			status: {
				in: ['COMPLETED', 'FAILED', 'REJECTED'],
			},
		},
	})

	// 3. 服务器快照：按 (serverId, kind) 分组保留最近 N 条，删更旧。
	// 用 distinct 取分组边界，再按 observedAt 删除每组超出保留量的旧记录。
	const snapshotsDeleted = await pruneMinecraftServerSnapshots(
		config.maxSnapshotsPerKind,
	)

	return {
		receiptsDeleted: receiptsDeleted.count,
		commandsDeleted: commandsDeleted.count,
		snapshotsDeleted,
		ranAt,
	}
}

const pruneMinecraftServerSnapshots = async (
	keepPerGroup: number,
): Promise<number> => {
	// 取所有 (serverId, kind) 分组及其第 N 新的 observedAt 作为保留截止线。
	const groups = (
		await prisma.minecraftServerSnapshot.groupBy({
			by: ['serverId', 'kind'],
			_count: { _all: true },
		})
	).filter((group) => group._count._all > keepPerGroup)

	if (groups.length === 0) {
		return 0
	}

	let totalDeleted = 0

	for (const group of groups) {
		// 该组按 observedAt 倒序的第 keepPerGroup 条作为截止线，删除早于它的记录。
		const cutoffRows = await prisma.minecraftServerSnapshot.findMany({
			where: {
				serverId: group.serverId,
				kind: group.kind,
			},
			orderBy: {
				observedAt: 'desc',
			},
			skip: keepPerGroup - 1,
			take: 1,
			select: {
				observedAt: true,
			},
		})

		const cutoff = cutoffRows[0]?.observedAt

		if (!cutoff) {
			continue
		}

		const deleted = await prisma.minecraftServerSnapshot.deleteMany({
			where: {
				serverId: group.serverId,
				kind: group.kind,
				observedAt: {
					lt: cutoff,
				},
			},
		})

		totalDeleted += deleted.count
	}

	return totalDeleted
}
