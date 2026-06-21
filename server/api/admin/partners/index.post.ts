import { requireAdminUser } from '../../../utils/auth/session'
import { createPartner } from '../../../utils/partners/service'

export default defineEventHandler(async (event) => {
	const actor = await requireAdminUser(event)
	const body = await readBody(event)

	return await createPartner(actor, body)
})
