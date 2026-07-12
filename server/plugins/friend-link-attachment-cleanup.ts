import { getAttachmentService } from '../utils/attachment/runtime'
import { onPostCommitEvent } from '../utils/events/post-commit'

export default defineNitroPlugin(() => {
	onPostCommitEvent('friend-link.attachments.cleanup', async ({ payload }) => {
		await getAttachmentService().deleteFriendLinkAttachmentsExcept({
			linkId: payload.linkId,
			activeAttachmentId: payload.activeAttachmentId,
		})
	})

	onPostCommitEvent('friend-link.attachments.expire', async ({ payload }) => {
		await getAttachmentService().expireAttachments({
			ownerType: 'friend-link',
			ownerId: payload.linkId,
			purpose: 'friend-link-avatar',
		})
	})

	onPostCommitEvent(
		'friend-link-application.attachments.cleanup',
		async ({ payload }) => {
			await getAttachmentService().deleteFriendLinkApplicationAttachmentsExcept(
				{
					applicationId: payload.applicationId,
					activeAttachmentId: payload.activeAttachmentId,
				},
			)
		},
	)

	onPostCommitEvent(
		'friend-link-application.attachments.expire',
		async ({ payload }) => {
			await getAttachmentService().expireAttachments({
				ownerType: 'friend-link-application',
				ownerId: payload.applicationId,
				purpose: 'friend-link-avatar',
			})
		},
	)
})
