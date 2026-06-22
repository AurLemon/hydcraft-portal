import { prisma } from '../utils/db/prisma'
import { onEvent } from '../utils/events/event-bus'

export default defineNitroPlugin(() => {
	onEvent('minecraft.account.bound', async (payload) => {
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
