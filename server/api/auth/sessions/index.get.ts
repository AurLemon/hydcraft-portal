import { prisma } from '../../../utils/db/prisma'
import {
	getRefreshTokenHashFromEvent,
	requireCurrentUser,
} from '../../../utils/auth/session'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const currentTokenHash = getRefreshTokenHashFromEvent(event)
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
		sessions: sessions.map((session) => ({
			id: session.id,
			userAgent: session.userAgent,
			ipAddress: session.ipAddress,
			expiresAt: session.expiresAt,
			revokedAt: session.revokedAt,
			createdAt: session.createdAt,
			updatedAt: session.updatedAt,
			isCurrent: session.tokenHash === currentTokenHash,
			isActive: !session.revokedAt && session.expiresAt > now,
		})),
	}
})
