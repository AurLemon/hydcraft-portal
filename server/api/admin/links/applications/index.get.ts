import {
	getOptionalQueryString,
	getPaginationQuery,
} from '../../../../utils/admin/pagination'
import { requireAdminUser } from '../../../../utils/auth/session'
import { listAdminFriendLinkApplications } from '../../../../utils/friend-links/service'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const { query, page, pageSize } = getPaginationQuery(event)

	return await listAdminFriendLinkApplications({
		page,
		pageSize,
		search: getOptionalQueryString(query.search),
		category: getOptionalQueryString(query.category),
		status: getOptionalQueryString(query.status),
		sortField: getOptionalQueryString(query.sortField),
		sortDirection:
			query.sortDirection === 'asc' || query.sortDirection === 'desc'
				? query.sortDirection
				: undefined,
	})
})
