import {
	getOptionalQueryString,
	getPaginationQuery,
} from '../../../utils/admin/pagination'
import { requireAdminUser } from '../../../utils/auth/session'
import { listAdminFriendLinks } from '../../../utils/friend-links/service'

const normalizeEnabledQuery = (value: unknown): boolean | undefined => {
	if (value === 'true') {
		return true
	}

	if (value === 'false') {
		return false
	}

	return undefined
}

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const { query, page, pageSize } = getPaginationQuery(event)

	return await listAdminFriendLinks({
		page,
		pageSize,
		search: getOptionalQueryString(query.search),
		category: getOptionalQueryString(query.category),
		enabled: normalizeEnabledQuery(query.enabled),
		sortField: getOptionalQueryString(query.sortField),
		sortDirection:
			query.sortDirection === 'asc' || query.sortDirection === 'desc'
				? query.sortDirection
				: undefined,
	})
})
