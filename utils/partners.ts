export type PartnerKind = 'SERVER' | 'ORGANIZATION'
export type PartnerSection = 'COMMUNITY' | 'SUPPORT_ACKNOWLEDGEMENTS'

export interface PartnerEditorSummary {
	id: string
	userId: string
	createdById: string | null
	createdAt: string
	updatedAt: string
	user: {
		id: string
		username: string
		displayName: string | null
		avatarUrl: string | null
		role: string
	}
	createdBy: {
		id: string
		username: string
		displayName: string | null
		avatarUrl: string | null
	} | null
}

export interface PartnerCoreMemberSummary {
	id: string
	username: string
	displayName: string | null
	avatarUrl: string | null
}

export interface PartnerSummary {
	id: string
	name: string
	section: PartnerSection
	kind: PartnerKind | null
	summary: string | null
	websiteUrl: string | null
	avatarUrl: string | null
	coverUrl: string | null
	avatarAttachmentId: string | null
	coverAttachmentId: string | null
	linkedMinecraftServerId: string | null
	linkedMinecraftServer: {
		serverId: string
		code: string
		name: string
		enabled: boolean
	} | null
	enabled: boolean
	archived: boolean
	relationshipEstablishedAt: string | null
	sortOrder: number
	canEdit: boolean
	createdAt: string
	updatedAt: string
	editors?: PartnerEditorSummary[]
	coreMembers: PartnerCoreMemberSummary[]
}

export interface PartnersPublicResponse {
	community: PartnerSummary[]
	supportAcknowledgements: PartnerSummary[]
}

export interface AdminPartnersResponse {
	items: PartnerSummary[]
}

export interface PartnerReorderResponse {
	section: PartnerSection
	orderedIds: string[]
}

export const partnerKindValues: PartnerKind[] = ['SERVER', 'ORGANIZATION']

export const partnerSectionValues: PartnerSection[] = [
	'COMMUNITY',
	'SUPPORT_ACKNOWLEDGEMENTS',
]
