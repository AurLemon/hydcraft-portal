import { requireAdminUser } from '../../../utils/auth/session'
import { getAttachmentService } from '../../../utils/attachment/runtime'
import {
	getOptionalQueryString,
	getPaginationQuery,
	getSortDirection,
} from '../../../utils/admin/pagination'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)

	const { query, page, pageSize } = getPaginationQuery(event)

	return await getAttachmentService().listAdminAttachments({
		page,
		pageSize,
		search: getOptionalQueryString(query.search),
		app: getOptionalQueryString(query.app),
		status: getOptionalQueryString(query.status),
		purpose: getOptionalQueryString(query.purpose),
		category: getOptionalQueryString(query.category),
		visibility: getOptionalQueryString(query.visibility),
		sortField: getOptionalQueryString(query.sortField),
		sortDirection: getSortDirection(query.sortDirection),
	})
})
