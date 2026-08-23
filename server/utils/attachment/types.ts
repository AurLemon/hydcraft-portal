import type {
	AttachmentStatus,
	AttachmentVisibility,
} from '~/generated/prisma/client'
import type {
	AttachmentApp,
	AttachmentCategory,
	AttachmentOwnerType,
	AttachmentPurpose,
} from '~/utils/attachment/catalog'

export type {
	AttachmentApp,
	AttachmentCategory,
	AttachmentOwnerType,
	AttachmentPurpose,
} from '~/utils/attachment/catalog'
export type StorageProfileName = 'publicAssets' | 'privateUploads'
export type AttachmentOutputFormat = 'webp' | 'original'

export interface AttachmentResizeVariantPolicy {
	name: string
	mode?: 'resize'
	width: number
	height?: number
	fit: 'cover' | 'inside'
}

export interface AttachmentSourceVariantPolicy {
	name: string
	mode: 'source'
}

export type AttachmentVariantPolicy =
	| AttachmentResizeVariantPolicy
	| AttachmentSourceVariantPolicy

export interface AttachmentPolicy {
	purpose: AttachmentPurpose
	category: AttachmentCategory
	visibility: AttachmentVisibility
	allowedContentTypes: string[]
	maxSizeBytes: number
	requiresCrop: boolean
	directUploadContentTypes: string[]
	aspectRatio?: number
	outputFormat: AttachmentOutputFormat
	variants: AttachmentVariantPolicy[]
}

export interface AttachmentPublicVariant {
	name: string
	url: string | null
	width: number
	height: number
	contentType: string
}

export interface AttachmentPublicSummary {
	id: string
	status: AttachmentStatus
	objectKey: string | null
	variants: AttachmentPublicVariant[]
}

export interface StorageProfile {
	bucket: string
	basePrefix: string
	publicBaseUrl?: string
}

export interface StorageProfiles {
	publicAssets: StorageProfile
	privateUploads: StorageProfile
}
