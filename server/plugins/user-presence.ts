import { prisma } from '../utils/db/prisma'
import { onEvent } from '../utils/events/event-bus'

const AUTH_ACTIVITY_THROTTLE_MS =
	Math.max(
		Number.parseInt(
			process.env.USER_AUTH_ACTIVITY_THROTTLE_SECONDS ?? '',
			10,
		) || 300,
		0,
	) * 1000

export default defineNitroPlugin(() => {
	onEvent('user.auth-activity.observed', async (payload) => {
		const threshold = new Date(
			payload.observedAt.getTime() - AUTH_ACTIVITY_THROTTLE_MS,
		)

		await prisma.user.updateMany({
			where: {
				id: payload.userId,
				OR: [
					{
						lastAuthActivityAt: null,
					},
					{
						lastAuthActivityAt: {
							lt: threshold,
						},
					},
				],
			},
			data: {
				lastAuthActivityAt: payload.observedAt,
				lastAuthActivitySource: payload.source,
			},
		})
	})
})
