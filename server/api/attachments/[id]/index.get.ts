import { getRouterParam } from 'h3'
import { requireCurrentUser } from '../../../utils/auth/session'
import { getAttachmentService } from '../../../utils/attachment/runtime'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const attachmentId = getRouterParam(event, 'id') ?? ''

	return await getAttachmentService().getAttachment(user, attachmentId)
})
