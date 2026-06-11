import { prisma } from '../../../../utils/db/prisma'
import {
	findCurrentRefreshSession,
	requireCurrentUser,
} from '../../../../utils/auth/session'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const currentSession = await findCurrentRefreshSession(event)

	if (user.email) {
		await prisma.userEmail.upsert({
			where: {
				email: user.email,
			},
			create: {
				userId: user.id,
				email: user.email,
				kind: 'PRIMARY',
				verifiedAt: user.emailVerifiedAt,
			},
			update: {
				userId: user.id,
				kind: 'PRIMARY',
				verifiedAt: user.emailVerifiedAt,
			},
		})
	}

	const [emails, sessions, events] = await Promise.all([
		prisma.userEmail.findMany({
			where: {
				userId: user.id,
			},
			orderBy: [{ kind: 'asc' }, { createdAt: 'asc' }],
		}),
		prisma.refreshToken.findMany({
			where: {
				userId: user.id,
				revokedAt: null,
				expiresAt: {
					gt: new Date(),
				},
			},
			orderBy: {
				updatedAt: 'desc',
			},
			select: {
				id: true,
				userAgent: true,
				ipAddress: true,
				expiresAt: true,
				createdAt: true,
				updatedAt: true,
			},
		}),
		prisma.securityEvent.findMany({
			where: {
				userId: user.id,
			},
			orderBy: {
				createdAt: 'desc',
			},
			take: 20,
		}),
	])

	return {
		security: {
			user: {
				id: user.id,
				email: user.email,
				emailVerifiedAt: user.emailVerifiedAt,
				hasPassword: Boolean(
					await prisma.userCredential.findUnique({
						where: {
							userId: user.id,
						},
						select: {
							id: true,
						},
					}),
				),
			},
			emails,
			sessions: sessions.map((session) => ({
				...session,
				current: session.id === currentSession?.id,
			})),
			events,
		},
	}
})
