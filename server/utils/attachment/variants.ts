import type { AttachmentPurpose, AttachmentVariantPolicy } from './types'

export const ATTACHMENT_VARIANT_NAMES = {
	avatarPrimary: 'avatar_256',
	coverPrimary: 'cover_source',
	legacyCoverPrimary: 'cover_1440',
} as const

const COVER_PURPOSES: AttachmentPurpose[] = ['user-cover', 'partner-cover']

export const isCoverPurpose = (purpose: AttachmentPurpose): boolean =>
	COVER_PURPOSES.includes(purpose)

export const getPrimaryVariantNames = (
	purpose: AttachmentPurpose,
): readonly string[] =>
	isCoverPurpose(purpose)
		? [
				ATTACHMENT_VARIANT_NAMES.coverPrimary,
				ATTACHMENT_VARIANT_NAMES.legacyCoverPrimary,
			]
		: [ATTACHMENT_VARIANT_NAMES.avatarPrimary]

export const findPrimaryVariant = <TVariant extends { name: string }>(
	purpose: AttachmentPurpose,
	variants: TVariant[],
): TVariant | undefined => {
	for (const name of getPrimaryVariantNames(purpose)) {
		const matched = variants.find((variant) => variant.name === name)

		if (matched) {
			return matched
		}
	}

	return variants[0]
}

export const buildSourceVariantPolicy = (
	name: string,
): AttachmentVariantPolicy => ({
	name,
	mode: 'source',
})
