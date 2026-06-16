import { requireAdminUser } from '../../../../../utils/auth/session'
import {
	getOptionalQueryString,
	getPaginationQuery,
	getSortDirection,
} from '../../../../../utils/admin/pagination'
import { listServerPlayers } from '../../../../../utils/admin/server-players'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const serverId = getRouterParam(event, 'serverId') ?? ''
	const { query, page, pageSize } = getPaginationQuery(event)

	return await listServerPlayers({
		serverId,
		page,
		pageSize,
		search: getOptionalQueryString(query.search),
		group: getOptionalQueryString(query.group),
		sortField: getOptionalQueryString(query.sortField),
		sortDirection: getSortDirection(query.sortDirection),
	})
})
