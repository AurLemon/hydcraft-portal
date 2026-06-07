import {
	clearAuthCookies,
	getRefreshTokenFromEvent,
	revokeRefreshToken,
} from '../../utils/auth/session'

export default defineEventHandler(async (event) => {
	await revokeRefreshToken(getRefreshTokenFromEvent(event))
	clearAuthCookies(event)

	return {
		ok: true,
	}
})
