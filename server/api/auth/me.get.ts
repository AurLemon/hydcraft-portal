import { requireCurrentUser, toUserSummary } from '../../utils/auth/session'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)

	return {
		user: toUserSummary(user),
	}
})
