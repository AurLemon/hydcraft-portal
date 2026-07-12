import { prisma } from '../utils/db/prisma'
import { getAttachmentService } from '../utils/attachment/runtime'
import { onPostCommitEvent } from '../utils/events/post-commit'

export default defineNitroPlugin(() => {
	onPostCommitEvent('user.oauth.attachment-replaced', async ({ payload }) => {
		await getAttachmentService().deleteExternalAccountAvatarAttachmentsExcept({
			externalAccountId: payload.externalAccountId,
			activeAttachmentId: payload.activeAttachmentId,
		})
	})

	onPostCommitEvent('user.oauth.unlinked', async ({ payload }) => {
		await getAttachmentService().deleteExternalAccountAvatarAttachmentsExcept({
			externalAccountId: payload.externalAccountId,
			activeAttachmentId: null,
		})

		if (!payload.avatarUrl) {
			return
		}

		await prisma.user.updateMany({
			where: {
				id: payload.userId,
				avatarAttachmentId: null,
				avatarUrl: payload.avatarUrl,
			},
			data: {
				avatarUrl: null,
			},
		})
	})
})
