import type { PartnerKind, PartnerSection } from '~/generated/prisma/client'

export interface PartnerEditorSummary {
	id: string
	userId: string
	createdById: string | null
	createdAt: Date
	updatedAt: Date
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
	relationshipEstablishedAt: Date | null
	sortOrder: number
	canEdit: boolean
	createdAt: Date
	updatedAt: Date
	editors?: PartnerEditorSummary[]
	coreMembers: PartnerCoreMemberSummary[]
}

export interface PartnersPublicResponse {
	community: PartnerSummary[]
	supportAcknowledgements: PartnerSummary[]
}

export interface PartnerReorderInput {
	section: PartnerSection
	orderedIds: string[]
}
