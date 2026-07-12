import { prisma } from '../utils/db/prisma'
import { getAttachmentService } from '../utils/attachment/runtime'
import { onPostCommitEvent } from '../utils/events/post-commit'

export default defineNitroPlugin(() => {
	onPostCommitEvent('admin.user.deleted', async ({ payload }) => {
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
	})
})
