import { getAttachmentService } from '../utils/attachment/runtime'
import { onPostCommitEvent } from '../utils/events/post-commit'

export default defineNitroPlugin(() => {
	onPostCommitEvent('partner.attachments.cleanup', async ({ payload }) => {
		await getAttachmentService().deletePartnerAttachmentsExcept({
			partnerId: payload.partnerId,
			purpose: payload.purpose,
			activeAttachmentId: payload.activeAttachmentId,
		})
	})
})
