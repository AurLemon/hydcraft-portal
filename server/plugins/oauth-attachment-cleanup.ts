import { prisma } from '../utils/db/prisma'
import { onEvent } from '../utils/events/event-bus'
import { getAttachmentService } from '../utils/attachment/runtime'

export default defineNitroPlugin(() => {
	onEvent('user.oauth.attachment-replaced', (payload) => {
		void getAttachmentService()
			.deleteExternalAccountAvatarAttachmentsExcept({
				externalAccountId: payload.externalAccountId,
				activeAttachmentId: payload.activeAttachmentId,
			})
			.catch((error) => {
				console.error('OAUTH_ATTACHMENT_REPLACEMENT_CLEANUP_FAILED', error)
			})
	})

	onEvent('user.oauth.unlinked', (payload) => {
		void getAttachmentService()
			.deleteExternalAccountAvatarAttachmentsExcept({
				externalAccountId: payload.externalAccountId,
				activeAttachmentId: null,
			})
			.catch((error) => {
				console.error('OAUTH_ATTACHMENT_UNLINK_CLEANUP_FAILED', error)
			})

		if (!payload.avatarUrl) {
			return
		}

		void prisma.user
			.updateMany({
				where: {
					id: payload.userId,
					avatarAttachmentId: null,
					avatarUrl: payload.avatarUrl,
				},
				data: {
					avatarUrl: null,
				},
			})
			.catch((error) => {
				console.error('OAUTH_ATTACHMENT_USER_AVATAR_RESET_FAILED', error)
			})
	})
})
