import { prisma } from '../utils/db/prisma'
import { getAttachmentService } from '../utils/attachment/runtime'

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000

export default defineNitroPlugin(() => {
	if (import.meta.prerender) {
		return
	}

	const timer = setInterval(() => {
		void (async () => {
			const expiredTickets = await prisma.authRegistrationTicket.findMany({
				where: {
					kind: 'OAUTH',
					consumedAt: null,
					expiresAt: {
						lte: new Date(),
					},
				},
				select: {
					id: true,
				},
			})

			for (const ticket of expiredTickets) {
				await getAttachmentService().expireAttachments({
					ownerType: 'registration-ticket',
					ownerId: ticket.id,
					purpose: 'external-account-avatar',
				})
			}
		})().catch((error) => {
			console.error('OAUTH_REGISTRATION_TICKET_CLEANUP_FAILED', error)
		})
	}, CLEANUP_INTERVAL_MS)

	if (typeof timer.unref === 'function') {
		timer.unref()
	}
})
