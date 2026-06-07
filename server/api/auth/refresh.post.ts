import { rotateRefreshToken, toUserSummary } from '../../utils/auth/session'

export default defineEventHandler(async (event) => {
	const { token, user } = await rotateRefreshToken(event)

	return {
		token,
		user: toUserSummary(user),
	}
})
