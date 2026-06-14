import type {
	AttachmentStatus,
	AttachmentVisibility,
} from '~/generated/prisma/client'

export type AttachmentApp = 'portal'
export type AttachmentCategory = 'profile' | 'oauth'
export type AttachmentPurpose =
	| 'user-avatar'
	| 'user-cover'
	| 'external-account-avatar'
export type AttachmentOwnerType = 'user' | 'external-account'
export type StorageProfileName = 'publicAssets' | 'privateUploads'
export type AttachmentOutputFormat = 'webp' | 'original'

export interface AttachmentVariantPolicy {
	name: string
	width: number
	height?: number
	fit: 'cover' | 'inside'
}

export interface AttachmentPolicy {
	purpose: AttachmentPurpose
	category: AttachmentCategory
	visibility: AttachmentVisibility
	allowedContentTypes: string[]
	maxSizeBytes: number
	requiresCrop: boolean
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
