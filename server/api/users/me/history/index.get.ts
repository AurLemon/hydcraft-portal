import { requireCurrentUser } from '../../../../utils/auth/session'
import { getHistoricalMinecraftAccountsForUser } from '../../../../utils/minecraft/historical-accounts'
import { getServerViewSelectionValueForSummary } from '~/utils/minecraft/accounts'
import { prisma } from '../../../../utils/db/prisma'

export default defineEventHandler(async (event) => {
	const currentUser = await requireCurrentUser(event)
	const accounts = await getHistoricalMinecraftAccountsForUser(currentUser.id)
	const serverOrder = new Map(
		(
			await prisma.minecraftServer.findMany({
				select: {
					serverId: true,
				},
				orderBy: [
					{ isDefault: 'desc' },
					{ sortOrder: 'asc' },
					{ createdAt: 'asc' },
				],
			})
		).map((server, index) => [server.serverId, index]),
	)
	const servers = accounts
		.flatMap((account) =>
			account.serverViews
				.filter((view) => view.serverId)
				.map((view) => ({
					serverId: view.serverId as string,
					serverName: view.serverName || view.label,
					account,
					serverViewId: getServerViewSelectionValueForSummary(account, view),
				})),
		)
		.reduce<
			Array<{
				serverId: string
				serverName: string
				accounts: Array<{
					account: (typeof accounts)[number]
					serverViewId: string
				}>
			}>
		>((groups, item) => {
			const existing = groups.find((group) => group.serverId === item.serverId)

			if (existing) {
				existing.accounts.push({
					account: item.account,
					serverViewId: item.serverViewId,
				})
				return groups
			}

			groups.push({
				serverId: item.serverId,
				serverName: item.serverName,
				accounts: [
					{
						account: item.account,
						serverViewId: item.serverViewId,
					},
				],
			})
			return groups
		}, [])
		.sort(
			(left, right) =>
				(serverOrder.get(left.serverId) ?? Number.MAX_SAFE_INTEGER) -
				(serverOrder.get(right.serverId) ?? Number.MAX_SAFE_INTEGER),
		)

	return {
		accounts,
		servers,
	}
})
