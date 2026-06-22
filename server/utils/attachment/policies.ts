import { createBadRequestError } from '../errors'
import type { AttachmentPolicy, AttachmentPurpose } from './types'

const IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp']
// GIF is intentionally rejected in v1 instead of being silently converted to a
// single-frame image. Add an explicit animated-image branch before allowing it.

export const attachmentPolicies = {
	'user-avatar': {
		purpose: 'user-avatar',
		category: 'profile',
		visibility: 'PUBLIC',
		allowedContentTypes: IMAGE_CONTENT_TYPES,
		maxSizeBytes: 8 * 1024 * 1024,
		requiresCrop: true,
		aspectRatio: 1,
		outputFormat: 'webp',
		variants: [
			{ name: 'avatar_64', width: 64, height: 64, fit: 'cover' },
			{ name: 'avatar_128', width: 128, height: 128, fit: 'cover' },
			{ name: 'avatar_256', width: 256, height: 256, fit: 'cover' },
			{ name: 'avatar_512', width: 512, height: 512, fit: 'cover' },
		],
	},
	'user-cover': {
		purpose: 'user-cover',
		category: 'profile',
		visibility: 'PUBLIC',
		allowedContentTypes: IMAGE_CONTENT_TYPES,
		maxSizeBytes: 12 * 1024 * 1024,
		requiresCrop: true,
		outputFormat: 'webp',
		variants: [
			{ name: 'cover_480', width: 480, height: 120, fit: 'cover' },
			{ name: 'cover_960', width: 960, height: 240, fit: 'cover' },
			{ name: 'cover_1440', width: 1440, height: 360, fit: 'cover' },
		],
	},
	'external-account-avatar': {
		purpose: 'external-account-avatar',
		category: 'oauth',
		visibility: 'PUBLIC',
		allowedContentTypes: IMAGE_CONTENT_TYPES,
		maxSizeBytes: 8 * 1024 * 1024,
		requiresCrop: false,
		outputFormat: 'webp',
		variants: [
			{ name: 'avatar_64', width: 64, height: 64, fit: 'cover' },
			{ name: 'avatar_128', width: 128, height: 128, fit: 'cover' },
			{ name: 'avatar_256', width: 256, height: 256, fit: 'cover' },
			{ name: 'avatar_512', width: 512, height: 512, fit: 'cover' },
		],
	},
	'partner-avatar': {
		purpose: 'partner-avatar',
		category: 'partner',
		visibility: 'PUBLIC',
		allowedContentTypes: IMAGE_CONTENT_TYPES,
		maxSizeBytes: 8 * 1024 * 1024,
		requiresCrop: true,
		aspectRatio: 1,
		outputFormat: 'webp',
		variants: [
			{ name: 'avatar_64', width: 64, height: 64, fit: 'cover' },
			{ name: 'avatar_128', width: 128, height: 128, fit: 'cover' },
			{ name: 'avatar_256', width: 256, height: 256, fit: 'cover' },
			{ name: 'avatar_512', width: 512, height: 512, fit: 'cover' },
		],
	},
	'partner-cover': {
		purpose: 'partner-cover',
		category: 'partner',
		visibility: 'PUBLIC',
		allowedContentTypes: IMAGE_CONTENT_TYPES,
		maxSizeBytes: 12 * 1024 * 1024,
		requiresCrop: true,
		outputFormat: 'webp',
		variants: [
			{ name: 'cover_480', width: 480, height: 120, fit: 'cover' },
			{ name: 'cover_960', width: 960, height: 240, fit: 'cover' },
			{ name: 'cover_1440', width: 1440, height: 360, fit: 'cover' },
		],
	},
	'friend-link-avatar': {
		purpose: 'friend-link-avatar',
		category: 'link',
		visibility: 'PUBLIC',
		allowedContentTypes: IMAGE_CONTENT_TYPES,
		maxSizeBytes: 8 * 1024 * 1024,
		requiresCrop: true,
		aspectRatio: 1,
		outputFormat: 'webp',
		variants: [
			{ name: 'avatar_64', width: 64, height: 64, fit: 'cover' },
			{ name: 'avatar_128', width: 128, height: 128, fit: 'cover' },
			{ name: 'avatar_256', width: 256, height: 256, fit: 'cover' },
			{ name: 'avatar_512', width: 512, height: 512, fit: 'cover' },
		],
	},
} satisfies Record<AttachmentPurpose, AttachmentPolicy>

export const getAttachmentPolicy = (purpose: string): AttachmentPolicy => {
	const policy = attachmentPolicies[purpose as AttachmentPurpose]

	if (!policy) {
		throw createBadRequestError('INVALID_ATTACHMENT_PURPOSE')
	}

	return policy
}

export const getPublicAttachmentPolicies = () =>
	Object.values(attachmentPolicies).map((policy) => ({
		purpose: policy.purpose,
		allowedContentTypes: policy.allowedContentTypes,
		maxSizeBytes: policy.maxSizeBytes,
		requiresCrop: policy.requiresCrop,
		aspectRatio: 'aspectRatio' in policy ? policy.aspectRatio : undefined,
		category: policy.category,
		visibility: policy.visibility,
	}))
