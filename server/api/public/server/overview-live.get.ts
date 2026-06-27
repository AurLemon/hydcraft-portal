import type { ServerOverviewLiveResponse } from '~/utils/server/overview'
import {
	countPublicOverviewPlayers,
	countPublicOverviewUsers,
	listPublicOverviewServers,
	resolvePublicOverviewDefaultServerId,
} from '~/server/utils/server/public-overview'

export default defineEventHandler(
	async (): Promise<ServerOverviewLiveResponse> => {
		const [servers, totalUsers, totalPlayers] = await Promise.all([
			listPublicOverviewServers(),
			countPublicOverviewUsers(),
			countPublicOverviewPlayers(),
		])

		return {
			servers,
			defaultServerId: resolvePublicOverviewDefaultServerId(servers),
			totalUsers,
			totalPlayers,
		}
	},
)
