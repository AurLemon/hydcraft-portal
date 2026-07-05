import type {
	FriendLinkApplicationStatus,
	FriendLinkCategory,
} from '~/generated/prisma/client'

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
	sortOrder: number
	createdAt: Date
	updatedAt: Date
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
	submittedAt: Date | null
	reviewedAt: Date | null
	approvedLinkId: string | null
	expiresAt: Date | null
	createdAt: Date
	updatedAt: Date
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

export interface AdminFriendLinksReorderResponse {
	items: FriendLinkSummary[]
}

export interface AdminFriendLinkApplicationsResponse {
	items: FriendLinkApplicationSummary[]
	page: number
	pageSize: number
	total: number
	pageCount: number
}
