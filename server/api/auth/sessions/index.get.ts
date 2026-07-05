import { prisma } from '../../../utils/db/prisma'
import {
	requireCurrentUser,
	requireCurrentRefreshSession,
} from '../../../utils/auth/session'
import {
	lookupIpLocation,
	normalizeIpAddressForDisplay,
} from '../../../utils/ip-location/ip-location'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const currentSession = await requireCurrentRefreshSession(event)
	const now = new Date()
	const sessions = await prisma.refreshToken.findMany({
		where: {
			userId: user.id,
		},
		orderBy: {
			createdAt: 'desc',
		},
		select: {
			id: true,
			tokenHash: true,
			userAgent: true,
			ipAddress: true,
			expiresAt: true,
			revokedAt: true,
			createdAt: true,
			updatedAt: true,
		},
	})

	return {
		sessions: await Promise.all(
			sessions.map(async (session) => ({
				id: session.id,
				userAgent: session.userAgent,
				ipAddress:
					normalizeIpAddressForDisplay(session.ipAddress) ?? session.ipAddress,
				ipLocation: await lookupIpLocation(session.ipAddress),
				expiresAt: session.expiresAt,
				revokedAt: session.revokedAt,
				createdAt: session.createdAt,
				updatedAt: session.updatedAt,
				isCurrent: session.id === currentSession.id,
				isActive: !session.revokedAt && session.expiresAt > now,
			})),
		),
	}
})
