import { prisma } from '../utils/db/prisma'
import { onPostCommitEvent } from '../utils/events/post-commit'
import { upsertUserActivityEvent } from '../utils/profile/user-activity'

export default defineNitroPlugin(() => {
	onPostCommitEvent('user.registered', async ({ payload }) => {
		await upsertUserActivityEvent(prisma, {
			userId: payload.userId,
			type: 'REGISTERED',
			occurredAt: new Date(payload.occurredAt),
		})
	})
})
