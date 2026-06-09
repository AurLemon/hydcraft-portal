import { getRouterParam } from 'h3'
import { getAuthTokenFromEvent } from '../../../utils/auth/session'
import { verifyAuthToken } from '../../../utils/auth/jwt'
import { getPublicUserProfile } from '../../../utils/profile/queries'

export default defineEventHandler(async (event) => {
	const username = getRouterParam(event, 'username') ?? ''
	const token = getAuthTokenFromEvent(event)
	let currentUserId: string | null = null

	if (token) {
		try {
			currentUserId = verifyAuthToken(token).sub
		} catch {
			currentUserId = null
		}
	}

	const profile = await getPublicUserProfile(username, currentUserId)

	return {
		profile,
	}
})
