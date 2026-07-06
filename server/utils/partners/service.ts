import type {
	PartnerEntry,
	PartnerCoreMember,
	PartnerEditor,
	PartnerSection,
	Prisma,
	User,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { createApiError } from '../errors'
import { emitEvent } from '../events/event-bus'
import {
	getAttachmentService,
	getPublicAttachmentUrl,
} from '../attachment/runtime'
import { findPrimaryVariant } from '../attachment/variants'
import type { PartnerSummary, PartnersPublicResponse } from './types'
import {
	normalizeCreatePartnerInput,
	normalizePartnerEditorUserId,
	normalizePartnerProfileInput,
	normalizePartnerReorderInput,
	normalizeUpdatePartnerInput,
	type PartnerMutationInput,
} from './validation'
import { canEditPartner, isPartnerAdmin } from './permissions'

const partnerInclude = {
	linkedMinecraftServer: {
		select: {
			serverId: true,
			code: true,
			name: true,
			enabled: true,
		},
	},
	coreMembers: {
		orderBy: {
			createdAt: 'asc',
		},
		where: {
			user: {
				privacy: {
					is: {
						publicProfile: true,
					},
				},
			},
		},
		include: {
			user: {
				select: {
					id: true,
					username: true,
					displayName: true,
					avatarUrl: true,
				},
			},
		},
	},
} satisfies Prisma.PartnerEntryInclude

const adminPartnerInclude = {
	...partnerInclude,
	editors: {
		orderBy: {
			createdAt: 'asc',
		},
		include: {
			user: {
				select: {
					id: true,
					username: true,
					displayName: true,
					avatarUrl: true,
					role: true,
				},
			},
			createdBy: {
				select: {
					id: true,
					username: true,
					displayName: true,
					avatarUrl: true,
				},
			},
		},
	},
	coreMembers: {
		orderBy: {
			createdAt: 'asc',
		},
		include: {
			user: {
				select: {
					id: true,
					username: true,
					displayName: true,
					avatarUrl: true,
				},
			},
		},
	},
} satisfies Prisma.PartnerEntryInclude

type PartnerWithRelations = PartnerEntry & {
	linkedMinecraftServer: {
		serverId: string
		code: string
		name: string
		enabled: boolean
	} | null
	editors?: (PartnerEditor & {
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
	})[]
	coreMembers?: (PartnerCoreMember & {
		user: {
			id: string
			username: string
			displayName: string | null
			avatarUrl: string | null
		}
	})[]
}

type PartnerActor = Pick<User, 'id' | 'role'> | null

const summarizePartner = (
	partner: PartnerWithRelations,
	canEdit: boolean,
): PartnerSummary => ({
	id: partner.id,
	name: partner.name,
	section: partner.section,
	kind: partner.kind,
	summary: partner.summary,
	websiteUrl: partner.websiteUrl,
	avatarUrl: partner.avatarUrl,
	coverUrl: partner.coverUrl,
	avatarAttachmentId: partner.avatarAttachmentId,
	coverAttachmentId: partner.coverAttachmentId,
	linkedMinecraftServerId: partner.linkedMinecraftServerId,
	linkedMinecraftServer: partner.linkedMinecraftServer,
	enabled: partner.enabled,
	archived: partner.archived,
	relationshipEstablishedAt: partner.relationshipEstablishedAt,
	sortOrder: partner.sortOrder,
	canEdit,
	createdAt: partner.createdAt,
	updatedAt: partner.updatedAt,
	...(partner.editors
		? {
				editors: partner.editors.map((editor) => ({
					id: editor.id,
					userId: editor.userId,
					createdById: editor.createdById,
					createdAt: editor.createdAt,
					updatedAt: editor.updatedAt,
					user: editor.user,
					createdBy: editor.createdBy,
				})),
			}
		: {}),
	coreMembers: (partner.coreMembers ?? []).map((member) => ({
		id: member.user.id,
		username: member.user.username,
		displayName: member.user.displayName,
		avatarUrl: member.user.avatarUrl,
	})),
})

const getChangedFields = (
	input: PartnerMutationInput,
	previous: PartnerEntry | null,
): string[] =>
	Object.entries(input)
		.filter(([key]) => key !== 'coreMemberUserIds')
		.filter(([key, value]) => {
			if (!previous) {
				return true
			}

			const previousValue = previous[key as keyof PartnerEntry]

			if (previousValue instanceof Date && value instanceof Date) {
				return previousValue.getTime() !== value.getTime()
			}

			return previousValue !== value
		})
		.map(([key]) => key)

const assertPartnerExists = async (
	partnerId: string,
): Promise<PartnerEntry> => {
	const partner = await prisma.partnerEntry.findUnique({
		where: {
			id: partnerId,
		},
	})

	if (!partner) {
		throw createApiError({
			statusCode: 404,
			code: 'PARTNER_NOT_FOUND',
		})
	}

	return partner
}

const resolveReadyPartnerAttachmentUrl = async (
	partnerId: string,
	attachmentId: string | null | undefined,
	purpose: 'partner-avatar' | 'partner-cover',
): Promise<string | null | undefined> => {
	if (attachmentId === undefined) {
		return undefined
	}

	if (attachmentId === null) {
		return null
	}

	const attachment = await prisma.attachment.findUnique({
		where: {
			id: attachmentId,
		},
		include: {
			variants: true,
		},
	})

	if (
		!attachment ||
		attachment.ownerType !== 'partner' ||
		attachment.ownerId !== partnerId ||
		attachment.purpose !== purpose ||
		attachment.status !== 'READY'
	) {
		throw createApiError({
			statusCode: 400,
			code: 'ATTACHMENT_NOT_FOUND',
		})
	}

	const primaryVariant = findPrimaryVariant(purpose, attachment.variants)

	if (!primaryVariant) {
		throw createApiError({
			statusCode: 400,
			code: 'ATTACHMENT_VARIANT_NOT_FOUND',
		})
	}

	return getPublicAttachmentUrl(primaryVariant.objectKey)
}

const buildPartnerUpdateData = async (
	partnerId: string,
	input: PartnerMutationInput,
): Promise<Prisma.PartnerEntryUpdateInput> => {
	const avatarUrl = await resolveReadyPartnerAttachmentUrl(
		partnerId,
		input.avatarAttachmentId,
		'partner-avatar',
	)
	const coverUrl = await resolveReadyPartnerAttachmentUrl(
		partnerId,
		input.coverAttachmentId,
		'partner-cover',
	)

	return {
		...(input.name !== undefined ? { name: input.name } : {}),
		...(input.section !== undefined ? { section: input.section } : {}),
		...(input.kind !== undefined ? { kind: input.kind } : {}),
		...(input.summary !== undefined ? { summary: input.summary } : {}),
		...(input.websiteUrl !== undefined ? { websiteUrl: input.websiteUrl } : {}),
		...(input.avatarAttachmentId !== undefined
			? { avatarAttachmentId: input.avatarAttachmentId, avatarUrl }
			: {}),
		...(input.coverAttachmentId !== undefined
			? { coverAttachmentId: input.coverAttachmentId, coverUrl }
			: {}),
		...(input.linkedMinecraftServerId !== undefined
			? { linkedMinecraftServerId: input.linkedMinecraftServerId }
			: {}),
		...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
		...(input.archived !== undefined ? { archived: input.archived } : {}),
		...(input.relationshipEstablishedAt !== undefined
			? { relationshipEstablishedAt: input.relationshipEstablishedAt }
			: {}),
		...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
	}
}

const assertCoreMemberUsersArePublic = async (
	userIds: string[],
): Promise<void> => {
	if (!userIds.length) {
		return
	}

	const users = await prisma.user.findMany({
		where: {
			id: {
				in: userIds,
			},
		},
		select: {
			id: true,
			privacy: {
				select: {
					publicProfile: true,
				},
			},
		},
	})

	if (users.length !== userIds.length) {
		throw createApiError({
			statusCode: 404,
			code: 'USER_NOT_FOUND',
		})
	}

	const privateUser = users.find((user) => !user.privacy?.publicProfile)

	if (privateUser) {
		throw createApiError({
			statusCode: 400,
			code: 'PARTNER_CORE_MEMBER_PUBLIC_PROFILE_REQUIRED',
		})
	}
}

const syncPartnerCoreMembers = async (
	actorUserId: string,
	partnerId: string,
	userIds: string[],
): Promise<void> => {
	const uniqueUserIds = [...new Set(userIds)]
	await assertCoreMemberUsersArePublic(uniqueUserIds)

	await prisma.$transaction(async (tx) => {
		if (!uniqueUserIds.length) {
			await tx.partnerCoreMember.deleteMany({
				where: {
					partnerId,
				},
			})

			return
		}

		await tx.partnerCoreMember.deleteMany({
			where: {
				partnerId,
				userId: {
					notIn: uniqueUserIds,
				},
			},
		})

		const existingMembers = await tx.partnerCoreMember.findMany({
			where: {
				partnerId,
				userId: {
					in: uniqueUserIds,
				},
			},
			select: {
				userId: true,
			},
		})
		const existingUserIds = new Set(
			existingMembers.map((member) => member.userId),
		)
		const newMembers = uniqueUserIds
			.filter((userId) => !existingUserIds.has(userId))
			.map((userId) => ({
				partnerId,
				userId,
				createdById: actorUserId,
			}))

		if (newMembers.length) {
			await tx.partnerCoreMember.createMany({
				data: newMembers,
			})
		}
	})

	await emitEvent('partner.core-members-synced', {
		partnerId,
		userIds: uniqueUserIds,
		actorUserId,
		occurredAt: new Date(),
	})
}

const handlePartnerAttachmentReplacements = async (
	partner: Pick<PartnerEntry, 'id' | 'updatedAt'>,
	input: PartnerMutationInput,
): Promise<void> => {
	if (input.avatarAttachmentId !== undefined) {
		await emitEvent('partner.attachment-replaced', {
			partnerId: partner.id,
			purpose: 'partner-avatar',
			activeAttachmentId: input.avatarAttachmentId,
			updatedAt: partner.updatedAt,
		})
		await getAttachmentService().deletePartnerAttachmentsExcept({
			partnerId: partner.id,
			purpose: 'partner-avatar',
			activeAttachmentId: input.avatarAttachmentId,
		})
	}

	if (input.coverAttachmentId !== undefined) {
		await emitEvent('partner.attachment-replaced', {
			partnerId: partner.id,
			purpose: 'partner-cover',
			activeAttachmentId: input.coverAttachmentId,
			updatedAt: partner.updatedAt,
		})
		await getAttachmentService().deletePartnerAttachmentsExcept({
			partnerId: partner.id,
			purpose: 'partner-cover',
			activeAttachmentId: input.coverAttachmentId,
		})
	}
}

export const listPublicPartners = async (
	actor: PartnerActor,
): Promise<PartnersPublicResponse> => {
	const partners = await prisma.partnerEntry.findMany({
		where: {
			enabled: true,
		},
		orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
		include: partnerInclude,
	})

	const isAdmin = actor ? isPartnerAdmin(actor) : false
	const editorPartnerIds =
		actor && !isAdmin
			? (
					await prisma.partnerEditor.findMany({
						where: { userId: actor.id },
						select: { partnerId: true },
					})
				).map((row) => row.partnerId)
			: []

	const summaries = partners.map((partner) =>
		summarizePartner(
			partner as PartnerWithRelations,
			isAdmin || editorPartnerIds.includes(partner.id),
		),
	)

	return {
		community: summaries.filter((partner) => partner.section === 'COMMUNITY'),
		supportAcknowledgements: summaries.filter(
			(partner) => partner.section === 'SUPPORT_ACKNOWLEDGEMENTS',
		),
	}
}

export const listAdminPartners = async (input: {
	search?: string
	section?: string
	kind?: string
	enabled?: boolean
}) => {
	const where: Prisma.PartnerEntryWhereInput = {
		...(input.section ? { section: input.section as never } : {}),
		...(input.kind ? { kind: input.kind as never } : {}),
		...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
		...(input.search
			? {
					OR: [
						{ name: { contains: input.search, mode: 'insensitive' } },
						{ summary: { contains: input.search, mode: 'insensitive' } },
					],
				}
			: {}),
	}

	const items = await prisma.partnerEntry.findMany({
		where,
		orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
		include: adminPartnerInclude,
	})

	return {
		items: items.map((partner) =>
			summarizePartner(partner as PartnerWithRelations, true),
		),
	}
}

export const getAdminPartner = async (partnerId: string) => {
	const partner = await prisma.partnerEntry.findUnique({
		where: {
			id: partnerId,
		},
		include: adminPartnerInclude,
	})

	if (!partner) {
		throw createApiError({
			statusCode: 404,
			code: 'PARTNER_NOT_FOUND',
		})
	}

	return summarizePartner(partner as PartnerWithRelations, true)
}

export const createPartner = async (
	actor: User,
	body: Record<string, unknown>,
) => {
	const input = normalizeCreatePartnerInput(body)
	const partner = await prisma.partnerEntry.create({
		data: {
			name: input.name,
			section: input.section,
			kind: input.kind,
			summary: input.summary,
			websiteUrl: input.websiteUrl,
			linkedMinecraftServerId: input.linkedMinecraftServerId,
			enabled: input.enabled,
			archived: input.archived,
			relationshipEstablishedAt: input.relationshipEstablishedAt,
			sortOrder: input.sortOrder,
		},
		include: adminPartnerInclude,
	})

	if (input.coreMemberUserIds?.length) {
		await syncPartnerCoreMembers(actor.id, partner.id, input.coreMemberUserIds)
	}

	await emitEvent('partner.created', {
		partnerId: partner.id,
		actorUserId: actor.id,
		createdAt: partner.createdAt,
	})

	return await getAdminPartner(partner.id)
}

export const updatePartner = async (
	actor: User,
	partnerId: string,
	body: Record<string, unknown>,
) => {
	const previous = await assertPartnerExists(partnerId)
	const input = normalizeUpdatePartnerInput(body)
	const changedFields = getChangedFields(input, previous)
	const shouldSyncCoreMembers = input.coreMemberUserIds !== undefined

	if (!changedFields.length && !shouldSyncCoreMembers) {
		return await getAdminPartner(partnerId)
	}

	if (changedFields.length) {
		const data = await buildPartnerUpdateData(partnerId, input)
		const partner = await prisma.partnerEntry.update({
			where: {
				id: partnerId,
			},
			data,
			include: adminPartnerInclude,
		})

		await emitEvent('partner.updated', {
			partnerId: partner.id,
			actorUserId: actor.id,
			changedFields,
			updatedAt: partner.updatedAt,
		})

		await handlePartnerAttachmentReplacements(partner, input)
	}

	if (shouldSyncCoreMembers) {
		await syncPartnerCoreMembers(
			actor.id,
			partnerId,
			input.coreMemberUserIds ?? [],
		)
	}

	return await getAdminPartner(partnerId)
}

export const updatePartnerProfile = async (
	actor: User,
	partnerId: string,
	body: Record<string, unknown>,
) => {
	const allowed = await canEditPartner(actor, partnerId)

	if (!allowed) {
		throw createApiError({
			statusCode: 403,
			code: 'PARTNER_EDIT_PERMISSION_REQUIRED',
		})
	}

	const previous = await assertPartnerExists(partnerId)
	const input = normalizePartnerProfileInput(body)
	const changedFields = getChangedFields(input, previous)

	if (!changedFields.length) {
		return await getAdminPartner(partnerId)
	}

	const data = await buildPartnerUpdateData(partnerId, input)
	const partner = await prisma.partnerEntry.update({
		where: {
			id: partnerId,
		},
		data,
		include: adminPartnerInclude,
	})

	await emitEvent('partner.updated', {
		partnerId: partner.id,
		actorUserId: actor.id,
		changedFields,
		updatedAt: partner.updatedAt,
	})

	await handlePartnerAttachmentReplacements(partner, input)

	return await getAdminPartner(partnerId)
}

export const reorderPartners = async (
	actor: User,
	body: Record<string, unknown>,
) => {
	if (!isPartnerAdmin(actor)) {
		throw createApiError({
			statusCode: 403,
			code: 'ADMIN_ROLE_REQUIRED',
		})
	}

	const { section, orderedIds } = normalizePartnerReorderInput(body)

	const existing = await prisma.partnerEntry.findMany({
		where: {
			section: section as PartnerSection,
		},
		select: {
			id: true,
		},
	})

	const existingIds = new Set(existing.map((row) => row.id))

	for (const id of orderedIds) {
		if (!existingIds.has(id)) {
			throw createApiError({
				statusCode: 400,
				code: 'INVALID_PARTNER_REORDER',
			})
		}
	}

	await prisma.$transaction(
		orderedIds.map((id, index) =>
			prisma.partnerEntry.update({
				where: {
					id,
				},
				data: {
					sortOrder: index,
				},
				select: {
					id: true,
				},
			}),
		),
	)

	await emitEvent('partner.reordered', {
		section: section as 'COMMUNITY' | 'SUPPORT_ACKNOWLEDGEMENTS',
		actorUserId: actor.id,
		orderedIds,
		occurredAt: new Date(),
	})

	return { section, orderedIds }
}

export const disablePartner = async (actor: User, partnerId: string) => {
	await assertPartnerExists(partnerId)
	const partner = await prisma.partnerEntry.update({
		where: {
			id: partnerId,
		},
		data: {
			enabled: false,
		},
		include: adminPartnerInclude,
	})

	await emitEvent('partner.updated', {
		partnerId: partner.id,
		actorUserId: actor.id,
		changedFields: ['enabled'],
		updatedAt: partner.updatedAt,
	})

	return summarizePartner(partner as PartnerWithRelations, true)
}

export const assignPartnerEditor = async (
	actor: User,
	partnerId: string,
	body: Record<string, unknown>,
) => {
	await assertPartnerExists(partnerId)
	const userId = normalizePartnerEditorUserId(body.userId)
	const user = await prisma.user.findUnique({
		where: {
			id: userId,
		},
	})

	if (!user) {
		throw createApiError({
			statusCode: 404,
			code: 'USER_NOT_FOUND',
		})
	}

	await prisma.partnerEditor.upsert({
		where: {
			partnerId_userId: {
				partnerId,
				userId,
			},
		},
		create: {
			partnerId,
			userId,
			createdById: actor.id,
		},
		update: {},
	})

	await emitEvent('partner.editor-assigned', {
		partnerId,
		userId,
		actorUserId: actor.id,
		createdAt: new Date(),
	})

	return await getAdminPartner(partnerId)
}

export const revokePartnerEditor = async (
	actor: User,
	partnerId: string,
	body: Record<string, unknown>,
) => {
	await assertPartnerExists(partnerId)
	const userId = normalizePartnerEditorUserId(body.userId)

	await prisma.partnerEditor.deleteMany({
		where: {
			partnerId,
			userId,
		},
	})

	await emitEvent('partner.editor-revoked', {
		partnerId,
		userId,
		actorUserId: actor.id,
		revokedAt: new Date(),
	})

	return await getAdminPartner(partnerId)
}
