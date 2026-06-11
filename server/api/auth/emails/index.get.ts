import { requireCurrentUser } from '../../../utils/auth/session'
import { prisma } from '../../../utils/db/prisma'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const emails = await prisma.userEmail.findMany({
		where: {
			userId: user.id,
		},
		orderBy: [
			{
				kind: 'asc',
			},
			{
				createdAt: 'asc',
			},
		],
		select: {
			id: true,
			email: true,
			kind: true,
			verifiedAt: true,
			createdAt: true,
			updatedAt: true,
		},
	})

	return {
		primaryEmail: user.email,
		emailVerifiedAt: user.emailVerifiedAt,
		emails,
	}
})
