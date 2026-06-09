import { useRuntimeConfig } from '#imports'
import { createAttachmentService } from './attachment-service'
import { createCosStorageAdapter } from './cos-storage-adapter'
import type { StorageProfiles } from './types'

const PUBLIC_ATTACHMENTS_PREFIX = 'public'
const PRIVATE_ATTACHMENTS_PREFIX = 'private'

export const getStorageProfiles = (): StorageProfiles => {
	const config = useRuntimeConfig()
	const cos = config.cos

	return {
		publicAssets: {
			bucket: cos.attachmentsBucket,
			basePrefix: PUBLIC_ATTACHMENTS_PREFIX,
			publicBaseUrl: cos.publicBaseUrl,
		},
		privateUploads: {
			bucket: cos.attachmentsBucket,
			basePrefix: PRIVATE_ATTACHMENTS_PREFIX,
		},
	}
}

export const getAttachmentService = () => {
	const config = useRuntimeConfig()
	const storageProfiles = getStorageProfiles()
	const storage = createCosStorageAdapter({
		secretId: config.cos.secretId,
		secretKey: config.cos.secretKey,
		region: config.cos.region,
		profiles: storageProfiles,
	})

	return createAttachmentService(storage, storageProfiles)
}
