import { prisma } from '../utils/db/prisma'
import { onPostCommitEvent } from '../utils/events/post-commit'

export default defineNitroPlugin(() => {
	onPostCommitEvent('minecraft.account.bound', async ({ payload }) => {
		await prisma.user.updateMany({
			where: {
				id: payload.userId,
				role: 'USER',
			},
			data: {
				role: 'MEMBER',
			},
		})
	})
})
