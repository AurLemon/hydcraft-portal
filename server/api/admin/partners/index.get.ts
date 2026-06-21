import {
	getOptionalQueryString,
	getPaginationQuery,
} from '../../../utils/admin/pagination'
import { requireAdminUser } from '../../../utils/auth/session'
import { listAdminPartners } from '../../../utils/partners/service'

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
	const { query } = getPaginationQuery(event)

	return await listAdminPartners({
		search: getOptionalQueryString(query.search),
		section: getOptionalQueryString(query.section),
		kind: getOptionalQueryString(query.kind),
		enabled: normalizeEnabledQuery(query.enabled),
	})
})
