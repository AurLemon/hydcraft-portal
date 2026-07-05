import { createApiError } from '../../../../utils/errors'
import { recordSecurityEvent } from '../../../../utils/security/security-events'
import {
	clearAuthCookies,
	requireCurrentUser,
	requireCurrentRefreshSession,
} from '../../../../utils/auth/session'
import { prisma } from '../../../../utils/db/prisma'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const currentSession = await requireCurrentRefreshSession(event)
	const sessionId = getRouterParam(event, 'id')

	if (!sessionId) {
		throw createApiError({ statusCode: 400, code: 'SESSION_ID_REQUIRED' })
	}

	const session = await prisma.refreshToken.findFirst({
		where: {
			id: sessionId,
			userId: user.id,
		},
	})

	if (!session) {
		throw createApiError({ statusCode: 404, code: 'SESSION_NOT_FOUND' })
	}

	if (!session.revokedAt) {
		await prisma.refreshToken.update({
			where: {
				id: session.id,
			},
			data: {
				revokedAt: new Date(),
			},
		})
	}

	if (session.id === currentSession.id) {
		clearAuthCookies(event)
	}

	await recordSecurityEvent({
		event,
		userId: user.id,
		type: 'SESSION_REVOKED',
		title: 'Revoked session',
		metadata: {
			sessionId: session.id,
			isCurrent: session.id === currentSession.id,
		},
	})

	return {
		ok: true,
	}
})
