import { onEvent } from '../utils/events/event-bus'
import { prisma } from '../utils/db/prisma'
import { createUserActivityEvent } from '../utils/profile/user-activity'

export default defineNitroPlugin(() => {
	onEvent('user.registered', async (payload) => {
		await createUserActivityEvent(prisma, {
			userId: payload.userId,
			type: 'REGISTERED',
			occurredAt: payload.occurredAt,
		})
	})
})
