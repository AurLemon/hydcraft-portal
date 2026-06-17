import { requireAdminUser } from '../../../../utils/auth/session'
import {
	getOptionalQueryString,
	getPaginationQuery,
	getSortDirection,
} from '../../../../utils/admin/pagination'
import { listServerPlayerStatsSnapshots } from '../../../../utils/admin/server-player-stats'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const { query, page, pageSize } = getPaginationQuery(event)

	return await listServerPlayerStatsSnapshots({
		page,
		pageSize,
		search: getOptionalQueryString(query.search),
		serverId: getOptionalQueryString(query.serverId),
		sortField: getOptionalQueryString(query.sortField),
		sortDirection: getSortDirection(query.sortDirection),
		player: getOptionalQueryString(query.player),
	})
})
