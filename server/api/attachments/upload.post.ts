import { readMultipartFormData } from 'h3'
import { requireAdminUser, requireCurrentUser } from '../../utils/auth/session'
import { getAttachmentService } from '../../utils/attachment/runtime'
import type {
	AttachmentOwnerType,
	AttachmentPurpose,
} from '../../utils/attachment/types'
import { createBadRequestError } from '../../utils/errors'
import { canEditPartner } from '../../utils/partners/permissions'

const badRequest = (code: string) => createBadRequestError(code)

const readField = (
	fields: Map<string, Buffer>,
	name: string,
): string | undefined => {
	const value = fields.get(name)?.toString('utf8').trim()
	return value || undefined
}

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const form = await readMultipartFormData(event)

	if (!form) {
		throw badRequest('INVALID_MULTIPART_BODY')
	}

	const fields = new Map<string, Buffer>()
	const file = form.find((item) => item.name === 'file' && item.filename)

	for (const item of form) {
		if (item.name && !item.filename) {
			fields.set(item.name, item.data)
		}
	}

	if (!file) {
		throw badRequest('FILE_REQUIRED')
	}

	const purpose = readField(fields, 'purpose') as AttachmentPurpose | undefined
	const ownerType = readField(fields, 'ownerType')
	const ownerId = readField(fields, 'ownerId')

	if (!purpose) {
		throw badRequest('INVALID_ATTACHMENT_INPUT')
	}

	if (ownerType === 'partner') {
		if (!ownerId || !(await canEditPartner(user, ownerId))) {
			await requireAdminUser(event)
		}
	} else if (ownerId && (ownerType !== 'user' || ownerId !== user.id)) {
		await requireAdminUser(event)
	}

	return await getAttachmentService().uploadAttachment(user, {
		purpose,
		contentType: file.type ?? '',
		buffer: file.data,
		ownerId,
		ownerType: ownerType as AttachmentOwnerType | undefined,
	})
})
