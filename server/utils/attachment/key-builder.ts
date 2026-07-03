import type { AttachmentCategory, AttachmentPurpose } from './types'

interface BaseKeyInput {
	app: string
	category: AttachmentCategory
	purpose: AttachmentPurpose
	attachmentId: string
}

interface FinalObjectKeyInput extends BaseKeyInput {
	basePrefix: string
	variantName: string
	ext: string
}

const sanitizeKeyPart = (value: string): string =>
	value
		.trim()
		.replace(/[^a-zA-Z0-9_-]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'unknown'

// Shared bucket profile mode: prefix is a namespace layout, not a permission system.
export const buildFinalObjectKey = (input: FinalObjectKeyInput): string =>
	[
		input.basePrefix,
		sanitizeKeyPart(input.app),
		sanitizeKeyPart(input.category),
		sanitizeKeyPart(input.purpose),
		sanitizeKeyPart(input.attachmentId),
		`${sanitizeKeyPart(input.variantName)}.${input.ext}`,
	].join('/')
