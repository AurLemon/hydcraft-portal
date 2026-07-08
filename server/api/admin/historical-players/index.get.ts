import {
	getOptionalQueryString,
	getPaginationQuery,
	getSortDirection,
} from '../../../utils/admin/pagination'
import { requireAdminUser } from '../../../utils/auth/session'
import { listAdminHistoricalMinecraftAccounts } from '../../../utils/minecraft/historical-accounts'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const { query, page, pageSize } = getPaginationQuery(event)

	return await listAdminHistoricalMinecraftAccounts({
		page,
		pageSize,
		search: getOptionalQueryString(query.search),
		assigned:
			query.assigned === 'assigned' || query.assigned === 'unassigned'
				? query.assigned
				: undefined,
		serverId: getOptionalQueryString(query.serverId),
		sortField: getOptionalQueryString(query.sortField),
		sortDirection: getSortDirection(query.sortDirection),
	})
})
