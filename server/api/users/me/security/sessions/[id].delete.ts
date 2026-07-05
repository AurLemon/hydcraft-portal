import {
	requireCurrentUser,
	requireCurrentRefreshSession,
} from '~/server/utils/auth/session'
import { prisma } from '~/server/utils/db/prisma'
import { createApiError, createBadRequestError } from '~/server/utils/errors'
import { recordSecurityEvent } from '~/server/utils/security/security-events'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const currentSession = await requireCurrentRefreshSession(event)
	const id = getRouterParam(event, 'id')

	if (!id) {
		throw createBadRequestError('SESSION_ID_REQUIRED')
	}

	const session = await prisma.refreshToken.findFirst({
		where: {
			id,
			userId: user.id,
			revokedAt: null,
		},
	})

	if (!session) {
		throw createApiError({
			statusCode: 404,
			code: 'SESSION_NOT_FOUND',
		})
	}

	if (currentSession.id === id) {
		throw createApiError({
			statusCode: 400,
			code: 'CURRENT_SESSION_CANNOT_BE_REVOKED',
		})
	}

	await recordSecurityEvent({
		event,
		userId: user.id,
		type: 'SESSION_REVOKED',
		title: '登录设备已退出',
		description: session.userAgent,
		metadata: {
			sessionId: id,
		},
	})

	await prisma.refreshToken.update({
		where: {
			id,
		},
		data: {
			revokedAt: new Date(),
		},
	})

	return {
		ok: true,
		current: false,
	}
})
