import { prisma } from '../utils/db/prisma'
import { onEvent } from '../utils/events/event-bus'
import { getAttachmentService } from '../utils/attachment/runtime'

export default defineNitroPlugin(() => {
	onEvent('admin.user.deleted', (payload) => {
		void (async () => {
			const attachments = await prisma.attachment.findMany({
				where: {
					OR: [
						{
							ownerType: 'user',
							ownerId: payload.userId,
						},
						...(payload.externalAccountIds.length
							? [
									{
										ownerType: 'external-account',
										ownerId: {
											in: payload.externalAccountIds,
										},
									},
								]
							: []),
					],
					status: {
						not: 'DELETED',
					},
				},
				select: {
					id: true,
				},
			})

			for (const attachment of attachments) {
				await getAttachmentService().deleteAdminAttachment(attachment.id)
			}
		})().catch((error) => {
			console.error('ADMIN_USER_DELETION_ATTACHMENT_CLEANUP_FAILED', error)
		})
	})
})
