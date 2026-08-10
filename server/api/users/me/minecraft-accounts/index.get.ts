import { prisma } from '../../../../utils/db/prisma'
import { createLuckPermsPrimaryGroupResolver } from '../../../../utils/luckperms/primary-group'
import { readLuckPermsSnapshotBundle } from '../../../../utils/luckperms/snapshot'
import { requireCurrentUser } from '../../../../utils/auth/session'
import {
	buildMinecraftAccountSummary,
	minecraftAccountSummaryPlayerInclude,
} from '../../../../utils/minecraft/account-summary'
import { buildMinecraftAuthMeActivitySummary } from '../../../../utils/minecraft/authme-activity'

export default defineEventHandler(async (event) => {
	const currentUser = await requireCurrentUser(event)
	const accounts = await prisma.minecraftAccount.findMany({
		where: {
			userId: currentUser.id,
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
	// LuckPerms 按 MC 玩家 ID（normalizedUsername）关联，uuid 因 offline/online 不一致不可靠。
	const luckPermsResolver = createLuckPermsPrimaryGroupResolver(
		await readLuckPermsSnapshotBundle({
			uuids: accounts.flatMap((account) => account.uuid ?? []),
			normalizedUsernames: accountNormalizedUsernames,
		}),
	)

	return {
		accounts: await Promise.all(
			accounts.map(async (account) => ({
				...buildMinecraftAccountSummary(
					account,
					players,
					historyByAccountId.get(account.id) ?? [],
					luckPermsResolver,
				),
				...(await buildMinecraftAuthMeActivitySummary(account.authMeAccount)),
			})),
		),
	}
})
