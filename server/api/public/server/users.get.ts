import {
	getOptionalQueryString,
	getPaginationQuery,
	getSortDirection,
} from '../../../utils/admin/pagination'
import type { BuilderRank } from '~/generated/prisma/client'
import { requireDirectorySearchAccess } from '../../../utils/security/directory-search-access'
import { listPublicServerUsers } from '../../../utils/server/directories'

export default defineEventHandler(async (event) => {
	const { query, page, pageSize } = getPaginationQuery(event)
	const search = getOptionalQueryString(query.search)
	const builderRankQuery = getOptionalQueryString(query.builderRank)
	const builderRank = isBuilderRankFilter(builderRankQuery)
		? builderRankQuery
		: undefined

	if (search) {
		requireDirectorySearchAccess(event)
	}

	return await listPublicServerUsers({
		page,
		pageSize,
		search,
		builderRank,
		sortField: getOptionalQueryString(query.sortField),
		sortDirection: getSortDirection(query.sortDirection),
	})
})

const isBuilderRankFilter = (
	value: string | undefined,
): value is BuilderRank | 'UNASSIGNED' =>
	value === 'UNASSIGNED' ||
	value === 'CHIEF' ||
	value === 'SENIOR' ||
	value === 'PRACTICING' ||
	value === 'APPRENTICE'
