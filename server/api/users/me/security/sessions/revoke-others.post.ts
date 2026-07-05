import { prisma } from '../../../../../utils/db/prisma'
import {
	requireCurrentUser,
	requireCurrentRefreshSession,
} from '../../../../../utils/auth/session'
import { recordSecurityEvent } from '../../../../../utils/security/security-events'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const currentSession = await requireCurrentRefreshSession(event)
	const result = await prisma.refreshToken.updateMany({
		where: {
			userId: user.id,
			revokedAt: null,
			id: currentSession
				? {
						not: currentSession.id,
					}
				: undefined,
		},
		data: {
			revokedAt: new Date(),
		},
	})

	await recordSecurityEvent({
		event,
		userId: user.id,
		type: 'SESSIONS_REVOKED',
		title: '其他登录设备已退出',
		description: `共退出 ${result.count} 个设备`,
		metadata: {
			count: result.count,
		},
	})

	return {
		ok: true,
		count: result.count,
	}
})
