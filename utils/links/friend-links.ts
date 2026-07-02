export type FriendLinkCategory = 'BUSINESS' | 'PERSONAL' | 'ORGANIZATION'
export type FriendLinkApplicationStatus =
	| 'DRAFT'
	| 'PENDING_REVIEW'
	| 'APPROVED'
	| 'REJECTED'
	| 'EXPIRED'

export interface FriendLinkSummary {
	id: string
	category: FriendLinkCategory
	url: string
	name: string
	summary: string | null
	avatarAttachmentId: string | null
	avatarUrl: string | null
	enabled: boolean
	archived: boolean
	createdAt: string
	updatedAt: string
}

export interface FriendLinkApplicationSummary {
	id: string
	category: FriendLinkCategory | null
	url: string | null
	name: string | null
	summary: string | null
	avatarAttachmentId: string | null
	avatarUrl: string | null
	applicantStatement: string | null
	status: FriendLinkApplicationStatus
	submittedAt: string | null
	reviewedAt: string | null
	approvedLinkId: string | null
	expiresAt: string | null
	createdAt: string
	updatedAt: string
	applicant: {
		id: string
		username: string
		displayName: string | null
		avatarUrl: string | null
	} | null
	reviewedBy: {
		id: string
		username: string
		displayName: string | null
		avatarUrl: string | null
	} | null
}

export interface FriendLinksPublicResponse {
	business: FriendLinkSummary[]
	personal: FriendLinkSummary[]
	organization: FriendLinkSummary[]
}

export interface AdminFriendLinksResponse {
	items: FriendLinkSummary[]
	page: number
	pageSize: number
	total: number
	pageCount: number
}

export interface AdminFriendLinkApplicationsResponse {
	items: FriendLinkApplicationSummary[]
	page: number
	pageSize: number
	total: number
	pageCount: number
}

export const friendLinkCategoryValues: FriendLinkCategory[] = [
	'BUSINESS',
	'PERSONAL',
	'ORGANIZATION',
]

export const friendLinkApplicationCategoryValues: FriendLinkCategory[] = [
	'PERSONAL',
	'ORGANIZATION',
]

export const friendLinkApplicationStatusValues: FriendLinkApplicationStatus[] =
	['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED']
