export type AttachmentPurpose =
	| 'user-avatar'
	| 'user-cover'
	| 'partner-avatar'
	| 'partner-cover'
export type AttachmentOwnerType = 'user' | 'partner'

export interface AttachmentUploadVariant {
	name: string
	url: string | null
	width: number
	height: number
	contentType: string
}

export interface AttachmentUploadResult {
	id: string
	status: string
	objectKey: string | null
	variants: AttachmentUploadVariant[]
}

interface UploadImageInput {
	file: File
	purpose: AttachmentPurpose
	ownerType: AttachmentOwnerType
	ownerId?: string
}

export const useAttachmentUploader = () => {
	const uploadImage = async (
		input: UploadImageInput,
	): Promise<AttachmentUploadResult> => {
		const formData = new FormData()
		formData.append('file', input.file, input.file.name)
		formData.append('purpose', input.purpose)
		formData.append('ownerType', input.ownerType)

		if (input.ownerId) {
			formData.append('ownerId', input.ownerId)
		}

		return await $fetch<AttachmentUploadResult>('/api/attachments/upload', {
			method: 'POST',
			body: formData,
		})
	}

	return {
		uploadImage,
	}
}
