export const attachmentAppValues = ['portal'] as const

export const attachmentCategoryValues = [
	'profile',
	'oauth',
	'partner',
	'link',
] as const

export const attachmentPurposeValues = [
	'user-avatar',
	'user-cover',
	'external-account-avatar',
	'partner-avatar',
	'partner-cover',
	'friend-link-avatar',
] as const

export const attachmentOwnerTypeValues = [
	'user',
	'external-account',
	'registration-ticket',
	'partner',
	'friend-link',
	'friend-link-application',
] as const

export type AttachmentApp = (typeof attachmentAppValues)[number]
export type AttachmentCategory = (typeof attachmentCategoryValues)[number]
export type AttachmentPurpose = (typeof attachmentPurposeValues)[number]
export type AttachmentOwnerType = (typeof attachmentOwnerTypeValues)[number]
