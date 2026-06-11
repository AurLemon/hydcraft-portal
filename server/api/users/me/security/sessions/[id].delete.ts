import {
	findCurrentRefreshSession,
	requireCurrentUser,
} from '~/server/utils/auth/session'
import { prisma } from '~/server/utils/db/prisma'
import { createApiError, createBadRequestError } from '~/server/utils/errors'
import { recordSecurityEvent } from '~/server/utils/security/security-events'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
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

	await prisma.refreshToken.update({
		where: {
			id,
		},
		data: {
			revokedAt: new Date(),
		},
	})

	const currentSession = await findCurrentRefreshSession(event)
	await recordSecurityEvent({
		event,
		userId: user.id,
		type: 'SESSION_REVOKED',
		title: currentSession?.id === id ? '当前设备已退出' : '登录设备已退出',
		description: session.userAgent,
		metadata: {
			sessionId: id,
		},
	})

	return {
		ok: true,
		current: currentSession?.id === id,
	}
})
