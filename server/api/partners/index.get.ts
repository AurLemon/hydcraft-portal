import { getOptionalCurrentUser } from '../../utils/auth/session'
import { listPublicPartners } from '../../utils/partners/service'

export default defineEventHandler(async (event) => {
	const actor = await getOptionalCurrentUser(event)

	return await listPublicPartners(actor)
})
