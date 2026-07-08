import { getQuery } from 'h3'
import { requireAdminUser } from '../../../../../utils/auth/session'
import { getOptionalQueryString } from '../../../../../utils/admin/pagination'
import { listAdminBindableMinecraftAccounts } from '../../../../../utils/admin/users'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const query = getQuery(event)

	return await listAdminBindableMinecraftAccounts({
		search: getOptionalQueryString(query.search),
		pageSize: 8,
	})
})
