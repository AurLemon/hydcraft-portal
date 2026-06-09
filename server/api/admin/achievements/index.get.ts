import { getQuery } from 'h3'
import { requireAdminUser } from '../../../utils/auth/session'
import { listAdminAchievements } from '../../../utils/admin/achievements'
import {
	getOptionalQueryString,
	getSortDirection,
} from '../../../utils/admin/pagination'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const query = getQuery(event)

	return await listAdminAchievements({
		sortField: getOptionalQueryString(query.sortField),
		sortDirection: getSortDirection(query.sortDirection),
	})
})
