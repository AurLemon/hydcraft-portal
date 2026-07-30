import { requireAdminUser } from '../../../utils/auth/session'
import {
	getOptionalQueryString,
	getPaginationQuery,
	getSortDirection,
} from '../../../utils/admin/pagination'
import { listAdminUsers } from '../../../utils/admin/users'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const { query, page, pageSize } = getPaginationQuery(event)

	return await listAdminUsers({
		page,
		pageSize,
		search: getOptionalQueryString(query.search),
		role: getOptionalQueryString(query.role),
		status: getOptionalQueryString(query.status),
		builderRank: getOptionalQueryString(query.builderRank),
		sortField: getOptionalQueryString(query.sortField),
		sortDirection: getSortDirection(query.sortDirection),
	})
})
