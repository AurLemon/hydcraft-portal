import { getQuery } from 'h3'
import { requireCurrentUser } from '../../utils/auth/session'
import { checkUsernameAvailability } from '../../utils/profile/queries'

export default defineEventHandler(async (event) => {
	const currentUser = await requireCurrentUser(event).catch(() => null)
	const query = getQuery(event)

	return await checkUsernameAvailability(query.username, currentUser?.id)
})
