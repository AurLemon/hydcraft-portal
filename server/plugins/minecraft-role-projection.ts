import { prisma } from '../utils/db/prisma'
import { onPostCommitEvent } from '../utils/events/post-commit'

export default defineNitroPlugin(() => {
	onPostCommitEvent('minecraft.account.bound', async ({ payload }) => {
		await prisma.$transaction([
			prisma.user.updateMany({
				where: {
					id: payload.userId,
					role: 'USER',
				},
				data: {
					role: 'MEMBER',
				},
			}),
			prisma.user.updateMany({
				where: {
					id: payload.userId,
					builderRank: null,
					builderRankManagedByAdmin: false,
				},
				data: {
					builderRank: 'APPRENTICE',
				},
			}),
		])
	})
})
