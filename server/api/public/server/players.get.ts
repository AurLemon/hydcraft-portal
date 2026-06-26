import {
	getOptionalQueryString,
	getPaginationQuery,
	getSortDirection,
} from '../../../utils/admin/pagination'
import { requireDirectorySearchAccess } from '../../../utils/security/directory-search-access'
import { listPublicServerPlayers } from '../../../utils/server/directories'

export default defineEventHandler(async (event) => {
	const { query, page, pageSize } = getPaginationQuery(event)
	const search = getOptionalQueryString(query.search)

	if (search) {
		requireDirectorySearchAccess(event)
	}

	return await listPublicServerPlayers({
		page,
		pageSize,
		search,
		linked: getOptionalQueryString(query.linked),
		group: getOptionalQueryString(query.group),
		sortField: getOptionalQueryString(query.sortField),
		sortDirection: getSortDirection(query.sortDirection),
	})
})
