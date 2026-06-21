import { requireAdminUser } from '../../../utils/auth/session'
import { reorderPartners } from '../../../utils/partners/service'

export default defineEventHandler(async (event) => {
	const actor = await requireAdminUser(event)
	const body = await readBody(event)

	return await reorderPartners(actor, body)
})
