import {
	clearAuthCookies,
	getRefreshTokenFromEvent,
	revokeRefreshToken,
	requireCurrentUser,
} from '../../utils/auth/session'
import { recordSecurityEvent } from '../../utils/security/security-events'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event).catch(() => null)

	await revokeRefreshToken(getRefreshTokenFromEvent(event))
	clearAuthCookies(event)

	if (user) {
		await recordSecurityEvent({
			event,
			userId: user.id,
			type: 'LOGOUT',
			title: '退出登录',
		})
	}

	return {
		ok: true,
	}
})
