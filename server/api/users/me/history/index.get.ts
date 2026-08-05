import { requireCurrentUser } from '../../../../utils/auth/session'
import { getHistoricalMinecraftAccountsForUser } from '../../../../utils/minecraft/historical-accounts'
import { getServerViewSelectionValueForSummary } from '~/utils/minecraft/accounts'
import { toMinecraftServerLocalizedName } from '~/utils/minecraft/server-name'
import { prisma } from '../../../../utils/db/prisma'

export default defineEventHandler(async (event) => {
	const currentUser = await requireCurrentUser(event)
	const accounts = await getHistoricalMinecraftAccountsForUser(currentUser.id)
	const orderedServers = await prisma.minecraftServer.findMany({
		select: {
			serverId: true,
			nameZhCn: true,
			nameZhTw: true,
			nameEnUs: true,
			nameJaJp: true,
		},
		orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
	})
	const serverOrder = new Map(
		orderedServers.map((server, index) => [server.serverId, index]),
	)
	const servers = accounts
		.flatMap((account) =>
			account.serverViews
				.filter((view) => view.serverId)
				.map((view) => ({
					serverId: view.serverId as string,
					serverNames: view.serverNames,
					account,
					serverViewId: getServerViewSelectionValueForSummary(account, view),
				})),
		)
		.reduce<
			Array<{
				serverId: string
				serverNames: (typeof accounts)[number]['serverViews'][number]['serverNames']
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
				serverNames: item.serverNames,
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
		serverOrder: orderedServers.map((server) => ({
			serverId: server.serverId,
			serverNames: toMinecraftServerLocalizedName(server),
		})),
	}
})
