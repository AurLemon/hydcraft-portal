import {
	clearAuthCookies,
	getRefreshTokenHashFromEvent,
	requireCurrentUser,
} from '../../../utils/auth/session'
import { recordSecurityEvent } from '../../../utils/security/security-events'
import { prisma } from '../../../utils/db/prisma'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const query = getQuery(event)
	const includeCurrent = query.includeCurrent === 'true'
	const revokedAt = new Date()
	const currentTokenHash = getRefreshTokenHashFromEvent(event)
	const result = await prisma.refreshToken.updateMany({
		where: {
			userId: user.id,
			revokedAt: null,
			...(includeCurrent
				? {}
				: currentTokenHash
					? {
							tokenHash: {
								not: currentTokenHash,
							},
						}
					: {}),
		},
		data: {
			revokedAt,
		},
	})

	if (includeCurrent) {
		clearAuthCookies(event)
	}

	await recordSecurityEvent({
		event,
		userId: user.id,
		type: 'SESSIONS_REVOKED',
		title: includeCurrent ? 'Revoked all sessions' : 'Revoked other sessions',
		metadata: {
			count: result.count,
			includeCurrent,
		},
	})

	return {
		ok: true,
		revokedCount: result.count,
	}
})
