import { prisma } from '../utils/db/prisma'
import { getAttachmentService } from '../utils/attachment/runtime'

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000

export default defineNitroPlugin(() => {
	if (import.meta.prerender) {
		return
	}

	const timer = setInterval(() => {
		void (async () => {
			const now = new Date()
			const expiredTickets = await prisma.authRegistrationTicket.findMany({
				where: {
					expiresAt: {
						lte: now,
					},
				},
				select: {
					id: true,
				},
			})

			for (const ticket of expiredTickets) {
				for (const purpose of [
					'external-account-avatar',
					'user-avatar',
				] as const) {
					await getAttachmentService().expireAttachments({
						ownerType: 'registration-ticket',
						ownerId: ticket.id,
						purpose,
					})
				}
			}

			if (expiredTickets.length > 0) {
				await prisma.authRegistrationTicket.deleteMany({
					where: {
						id: {
							in: expiredTickets.map((ticket) => ticket.id),
						},
					},
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
