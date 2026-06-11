import { requireCurrentUser } from '../../../utils/auth/session'
import { prisma } from '../../../utils/db/prisma'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const query = getQuery(event)
	const take = Math.min(Number(query.limit ?? 30) || 30, 100)
	const events = await prisma.securityEvent.findMany({
		where: {
			userId: user.id,
		},
		orderBy: {
			createdAt: 'desc',
		},
		take,
		select: {
			id: true,
			type: true,
			title: true,
			description: true,
			ipAddress: true,
			userAgent: true,
			metadata: true,
			createdAt: true,
		},
	})

	return {
		events,
	}
})
