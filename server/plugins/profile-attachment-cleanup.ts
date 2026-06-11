import { onEvent } from '../utils/events/event-bus'
import { getAttachmentService } from '../utils/attachment/runtime'

export default defineNitroPlugin(() => {
	onEvent('user.profile.attachment-replaced', (payload) => {
		void getAttachmentService()
			.deleteProfileAttachmentsExcept({
				userId: payload.userId,
				purpose: payload.purpose,
				activeAttachmentId: payload.activeAttachmentId,
			})
			.catch((error) => {
				console.error('PROFILE_ATTACHMENT_CLEANUP_FAILED', error)
			})
	})
})
