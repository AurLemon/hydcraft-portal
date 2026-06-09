import { getRouterParam } from 'h3'
import { requireAdminUser } from '../../../../utils/auth/session'
import { getAttachmentService } from '../../../../utils/attachment/runtime'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)

	return await getAttachmentService().getAdminAttachment(
		getRouterParam(event, 'id') ?? '',
	)
})
