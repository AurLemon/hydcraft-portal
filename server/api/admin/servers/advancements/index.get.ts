import { requireAdminUser } from '../../../../utils/auth/session'
import {
	getOptionalQueryString,
	getPaginationQuery,
	getSortDirection,
} from '../../../../utils/admin/pagination'
import { listServerPlayerAdvancementsSnapshots } from '../../../../utils/admin/server-player-advancements'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const { query, page, pageSize } = getPaginationQuery(event)

	return await listServerPlayerAdvancementsSnapshots({
		page,
		pageSize,
		search: getOptionalQueryString(query.search),
		serverId: getOptionalQueryString(query.serverId),
		sortField: getOptionalQueryString(query.sortField),
		sortDirection: getSortDirection(query.sortDirection),
		player: getOptionalQueryString(query.player),
	})
})
