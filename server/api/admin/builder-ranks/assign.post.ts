import { requireAdminUser } from '../../../utils/auth/session'
import { assignAdminBuilderRanks } from '../../../utils/admin/builder-ranks'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)

	return await assignAdminBuilderRanks(await readBody(event))
})
