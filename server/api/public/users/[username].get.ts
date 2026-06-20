import { getRouterParam } from 'h3'
import { requireCurrentUser } from '../../../utils/auth/session'
import { getPublicUserProfile } from '../../../utils/profile/queries'

export default defineEventHandler(async (event) => {
	const username = getRouterParam(event, 'username') ?? ''
	const currentUser = await requireCurrentUser(event).catch(() => null)

	const profile = await getPublicUserProfile(username, currentUser?.id ?? null)

	return {
		profile,
	}
})
