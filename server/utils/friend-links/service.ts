import type {
	FriendLink,
	FriendLinkApplication,
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
import type {
	AdminFriendLinksReorderResponse,
	AdminFriendLinkApplicationsResponse,
	AdminFriendLinksResponse,
	FriendLinkApplicationSummary,
	FriendLinksPublicResponse,
	FriendLinkSummary,
} from './types'
import {
	normalizeCreateFriendLinkInput,
	normalizeFriendLinkApplicationStatus,
	normalizeFriendLinkCategory,
	normalizeFriendLinkReorderInput,
	normalizeSubmitFriendLinkApplicationInput,
	normalizeUpdateFriendLinkInput,
	type FriendLinkMutationInput,
} from './validation'

const FRIEND_LINK_AVATAR_PURPOSE = 'friend-link-avatar'
const FRIEND_LINK_APPLICATION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const FRIEND_LINK_SORT_FIELDS = new Set([
	'createdAt',
	'updatedAt',
	'name',
	'sortOrder',
])
const FRIEND_LINK_APPLICATION_SORT_FIELDS = new Set([
	'createdAt',
	'updatedAt',
	'submittedAt',
	'reviewedAt',
])

const friendLinkInclude = {} satisfies Prisma.FriendLinkInclude

const friendLinkApplicationInclude = {
	applicantUser: {
		select: {
			id: true,
			username: true,
			displayName: true,
			avatarUrl: true,
		},
	},
	reviewedBy: {
		select: {
			id: true,
			username: true,
			displayName: true,
			avatarUrl: true,
		},
	},
} satisfies Prisma.FriendLinkApplicationInclude

type FriendLinkWithRelations = FriendLink
type FriendLinkApplicationWithRelations = FriendLinkApplication & {
	applicantUser: {
		id: string
		username: string
		displayName: string | null
		avatarUrl: string | null
	}
	reviewedBy: {
		id: string
		username: string
		displayName: string | null
		avatarUrl: string | null
	} | null
}

const getExpirationDate = (now = new Date()): Date =>
	new Date(now.getTime() + FRIEND_LINK_APPLICATION_TTL_MS)

const summarizeFriendLink = (
	link: FriendLinkWithRelations,
): FriendLinkSummary => ({
	id: link.id,
	category: link.category,
	url: link.url,
	name: link.name,
	summary: link.summary,
	avatarAttachmentId: link.avatarAttachmentId,
	avatarUrl: link.avatarUrl,
	enabled: link.enabled,
	archived: link.archived,
	sortOrder: link.sortOrder,
	createdAt: link.createdAt,
	updatedAt: link.updatedAt,
})

const getFriendLinkCategoryOrderBy =
	(): Prisma.FriendLinkOrderByWithRelationInput[] => [
		{ category: 'asc' },
		{ sortOrder: 'asc' },
		{ createdAt: 'asc' },
	]

const getFriendLinkSortOrderBy =
	(): Prisma.FriendLinkOrderByWithRelationInput[] => [
		{ sortOrder: 'asc' },
		{ createdAt: 'asc' },
	]

const getNextFriendLinkSortOrder = async (
	category: FriendLink['category'],
	db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<number> => {
	const last = await db.friendLink.findFirst({
		where: { category },
		orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }],
		select: { sortOrder: true },
	})

	return (last?.sortOrder ?? -1) + 1
}

const compactFriendLinkSortOrder = async (
	category: FriendLink['category'],
	db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> => {
	const links = await db.friendLink.findMany({
		where: { category },
		orderBy: getFriendLinkSortOrderBy(),
		select: { id: true, sortOrder: true },
	})

	for (const [index, link] of links.entries()) {
		if (link.sortOrder === index) {
			continue
		}

		await db.friendLink.update({
			where: { id: link.id },
			data: { sortOrder: index },
			select: { id: true },
		})
	}
}

const summarizeFriendLinkApplication = (
	application: FriendLinkApplicationWithRelations,
): FriendLinkApplicationSummary => ({
	id: application.id,
	category: application.category,
	url: application.url,
	name: application.name,
	summary: application.summary,
	avatarAttachmentId: application.avatarAttachmentId,
	avatarUrl: application.avatarUrl,
	applicantStatement: application.applicantStatement,
	status: application.status,
	submittedAt: application.submittedAt,
	reviewedAt: application.reviewedAt,
	approvedLinkId: application.approvedLinkId,
	expiresAt: application.expiresAt,
	createdAt: application.createdAt,
	updatedAt: application.updatedAt,
	applicant: application.applicantUser,
	reviewedBy: application.reviewedBy,
})

const assertFriendLinkExists = async (linkId: string): Promise<FriendLink> => {
	const link = await prisma.friendLink.findUnique({
		where: { id: linkId },
	})

	if (!link) {
		throw createApiError({
			statusCode: 404,
			code: 'FRIEND_LINK_NOT_FOUND',
		})
	}

	return link
}

const assertFriendLinkApplicationExists = async (
	applicationId: string,
): Promise<FriendLinkApplication> => {
	const application = await prisma.friendLinkApplication.findUnique({
		where: { id: applicationId },
	})

	if (!application) {
		throw createApiError({
			statusCode: 404,
			code: 'FRIEND_LINK_APPLICATION_NOT_FOUND',
		})
	}

	return application
}

const resolveReadyAvatarUrl = async (input: {
	attachmentId: string | null | undefined
	ownerType: 'friend-link' | 'friend-link-application'
	ownerId: string
}): Promise<string | null | undefined> => {
	if (input.attachmentId === undefined) {
		return undefined
	}

	if (input.attachmentId === null) {
		return null
	}

	const attachment = await prisma.attachment.findUnique({
		where: { id: input.attachmentId },
		include: { variants: true },
	})

	if (
		!attachment ||
		attachment.ownerType !== input.ownerType ||
		attachment.ownerId !== input.ownerId ||
		attachment.purpose !== FRIEND_LINK_AVATAR_PURPOSE ||
		attachment.status !== 'READY'
	) {
		throw createApiError({
			statusCode: 400,
			code: 'ATTACHMENT_NOT_FOUND',
		})
	}

	const primaryVariant =
		attachment.variants.find((variant) => variant.name === 'avatar_256') ??
		attachment.variants[0]

	if (!primaryVariant) {
		throw createApiError({
			statusCode: 400,
			code: 'ATTACHMENT_VARIANT_NOT_FOUND',
		})
	}

	return getPublicAttachmentUrl(primaryVariant.objectKey)
}

const buildFriendLinkUpdateData = async (
	linkId: string,
	input: FriendLinkMutationInput,
): Promise<Prisma.FriendLinkUpdateInput> => {
	const avatarUrl = await resolveReadyAvatarUrl({
		attachmentId: input.avatarAttachmentId,
		ownerType: 'friend-link',
		ownerId: linkId,
	})

	return {
		...(input.category !== undefined ? { category: input.category } : {}),
		...(input.url !== undefined ? { url: input.url } : {}),
		...(input.name !== undefined ? { name: input.name } : {}),
		...(input.summary !== undefined ? { summary: input.summary } : {}),
		...(input.avatarAttachmentId !== undefined
			? {
					avatarAttachmentId: input.avatarAttachmentId,
					avatarUrl,
				}
			: {}),
		...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
		...(input.archived !== undefined ? { archived: input.archived } : {}),
		...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
	}
}

const getFriendLinkChangedFields = (
	input: FriendLinkMutationInput,
	previous: FriendLink | null,
): string[] =>
	Object.entries(input)
		.filter(([, value]) => value !== undefined)
		.filter(([key, value]) => {
			if (!previous) {
				return true
			}

			return previous[key as keyof FriendLink] !== value
		})
		.map(([key]) => key)

const ensureFriendLinkApplicationOwner = async (
	userId: string,
	applicationId: string,
): Promise<FriendLinkApplication> => {
	const application = await assertFriendLinkApplicationExists(applicationId)

	if (application.applicantUserId !== userId) {
		throw createApiError({
			statusCode: 403,
			code: 'FRIEND_LINK_APPLICATION_PERMISSION_REQUIRED',
		})
	}

	return application
}

export const assertFriendLinkApplicationUploadAccess = async (
	userId: string,
	applicationId: string,
): Promise<void> => {
	const application = await ensureFriendLinkApplicationOwner(
		userId,
		applicationId,
	)

	if (application.status !== 'DRAFT') {
		throw createApiError({
			statusCode: 400,
			code: 'FRIEND_LINK_APPLICATION_NOT_DRAFT',
		})
	}
}

export const listPublicFriendLinks =
	async (): Promise<FriendLinksPublicResponse> => {
		const links = await prisma.friendLink.findMany({
			where: {
				enabled: true,
			},
			orderBy: getFriendLinkCategoryOrderBy(),
			include: friendLinkInclude,
		})

		const summaries = links.map((link) => summarizeFriendLink(link))

		return {
			business: summaries.filter((link) => link.category === 'BUSINESS'),
			personal: summaries.filter((link) => link.category === 'PERSONAL'),
			organization: summaries.filter(
				(link) => link.category === 'ORGANIZATION',
			),
		}
	}

export const listAdminFriendLinks = async (input: {
	page: number
	pageSize: number
	search?: string
	category?: string
	enabled?: boolean
	sortField?: string
	sortDirection?: 'asc' | 'desc'
}): Promise<AdminFriendLinksResponse> => {
	const category = normalizeFriendLinkCategory(input.category)
	const where: Prisma.FriendLinkWhereInput = {
		...(category ? { category } : {}),
		...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
		...(input.search
			? {
					OR: [
						{ name: { contains: input.search, mode: 'insensitive' } },
						{ summary: { contains: input.search, mode: 'insensitive' } },
						{ url: { contains: input.search, mode: 'insensitive' } },
					],
				}
			: {}),
	}
	const sortField = input.sortField
	const sortDirection = input.sortDirection ?? 'desc'
	const orderBy: Prisma.FriendLinkOrderByWithRelationInput[] =
		sortField && FRIEND_LINK_SORT_FIELDS.has(sortField)
			? sortField === 'sortOrder'
				? [
						{ category: 'asc' },
						{ sortOrder: sortDirection },
						{ createdAt: 'asc' },
					]
				: [
						{
							[sortField]: sortDirection,
						} as Prisma.FriendLinkOrderByWithRelationInput,
					]
			: getFriendLinkCategoryOrderBy()

	const [total, items] = await Promise.all([
		prisma.friendLink.count({ where }),
		prisma.friendLink.findMany({
			where,
			orderBy,
			skip: (input.page - 1) * input.pageSize,
			take: input.pageSize,
		}),
	])

	return {
		items: items.map((link) => summarizeFriendLink(link)),
		page: input.page,
		pageSize: input.pageSize,
		total,
		pageCount: Math.max(Math.ceil(total / input.pageSize), 1),
	}
}

export const listAdminFriendLinksForReorder =
	async (): Promise<AdminFriendLinksReorderResponse> => {
		const items = await prisma.friendLink.findMany({
			orderBy: getFriendLinkCategoryOrderBy(),
			include: friendLinkInclude,
		})

		return {
			items: items.map((link) => summarizeFriendLink(link)),
		}
	}

export const createFriendLink = async (
	actor: User,
	body: Record<string, unknown>,
): Promise<FriendLinkSummary> => {
	const input = normalizeCreateFriendLinkInput(body)
	const link = await prisma.$transaction(async (tx) => {
		const sortOrder =
			input.sortOrder ?? (await getNextFriendLinkSortOrder(input.category, tx))

		return await tx.friendLink.create({
			data: {
				category: input.category,
				url: input.url,
				name: input.name,
				summary: input.summary,
				enabled: input.enabled,
				archived: input.archived,
				sortOrder,
			},
		})
	})

	await emitEvent('friend-link.created', {
		linkId: link.id,
		actorUserId: actor.id,
		createdAt: link.createdAt,
	})

	if (
		input.avatarAttachmentId !== null &&
		input.avatarAttachmentId !== undefined
	) {
		return await updateFriendLink(actor, link.id, {
			avatarAttachmentId: input.avatarAttachmentId,
		})
	}

	return summarizeFriendLink(link)
}

export const updateFriendLink = async (
	actor: User,
	linkId: string,
	body: Record<string, unknown>,
): Promise<FriendLinkSummary> => {
	const previous = await assertFriendLinkExists(linkId)
	const input = normalizeUpdateFriendLinkInput(body)
	const categoryChanged =
		input.category !== undefined && input.category !== previous.category
	const effectiveInput: FriendLinkMutationInput = { ...input }

	if (
		categoryChanged &&
		effectiveInput.sortOrder === undefined &&
		input.category
	) {
		effectiveInput.sortOrder = await getNextFriendLinkSortOrder(input.category)
	}

	const changedFields = getFriendLinkChangedFields(effectiveInput, previous)

	if (!changedFields.length) {
		return summarizeFriendLink(previous)
	}

	const targetCategory = effectiveInput.category ?? previous.category
	const link = await prisma.$transaction(async (tx) => {
		const data = await buildFriendLinkUpdateData(linkId, effectiveInput)
		const updated = await tx.friendLink.update({
			where: { id: linkId },
			data,
		})

		if (categoryChanged || effectiveInput.sortOrder !== undefined) {
			await compactFriendLinkSortOrder(targetCategory, tx)

			if (previous.category !== targetCategory) {
				await compactFriendLinkSortOrder(previous.category, tx)
			}
		}

		return updated
	})

	await emitEvent('friend-link.updated', {
		linkId: link.id,
		actorUserId: actor.id,
		changedFields,
		updatedAt: link.updatedAt,
	})

	if (input.avatarAttachmentId !== undefined) {
		await getAttachmentService().deleteFriendLinkAttachmentsExcept({
			linkId: link.id,
			activeAttachmentId: input.avatarAttachmentId,
		})
	}

	return summarizeFriendLink(link)
}

export const deleteFriendLink = async (
	actor: User,
	linkId: string,
): Promise<void> => {
	await assertFriendLinkExists(linkId)
	await prisma.friendLink.delete({
		where: { id: linkId },
	})

	await emitEvent('friend-link.deleted', {
		linkId,
		actorUserId: actor.id,
		deletedAt: new Date(),
	})

	await getAttachmentService().expireAttachments({
		ownerType: 'friend-link',
		ownerId: linkId,
		purpose: FRIEND_LINK_AVATAR_PURPOSE,
	})
}

export const createFriendLinkApplicationDraft = async (
	applicant: Pick<User, 'id'>,
): Promise<FriendLinkApplicationSummary> => {
	const draft = await prisma.friendLinkApplication.create({
		data: {
			applicantUserId: applicant.id,
			status: 'DRAFT',
			expiresAt: getExpirationDate(),
		},
		include: friendLinkApplicationInclude,
	})

	await emitEvent('friend-link.application.draft-created', {
		applicationId: draft.id,
		applicantUserId: applicant.id,
		createdAt: draft.createdAt,
	})

	return summarizeFriendLinkApplication(draft)
}

export const submitFriendLinkApplication = async (
	applicant: Pick<User, 'id'>,
	applicationId: string,
	body: Record<string, unknown>,
): Promise<FriendLinkApplicationSummary> => {
	const previous = await ensureFriendLinkApplicationOwner(
		applicant.id,
		applicationId,
	)

	if (previous.status !== 'DRAFT') {
		throw createApiError({
			statusCode: 400,
			code: 'FRIEND_LINK_APPLICATION_NOT_DRAFT',
		})
	}

	const input = normalizeSubmitFriendLinkApplicationInput(body)
	const avatarUrl = await resolveReadyAvatarUrl({
		attachmentId: input.avatarAttachmentId,
		ownerType: 'friend-link-application',
		ownerId: applicationId,
	})
	const submittedAt = new Date()
	const application = await prisma.friendLinkApplication.update({
		where: { id: applicationId },
		data: {
			category: input.category,
			url: input.url,
			name: input.name,
			summary: input.summary,
			avatarAttachmentId: input.avatarAttachmentId,
			avatarUrl: avatarUrl ?? null,
			applicantStatement: input.applicantStatement,
			status: 'PENDING_REVIEW',
			submittedAt,
			expiresAt: getExpirationDate(submittedAt),
		},
		include: friendLinkApplicationInclude,
	})

	await emitEvent('friend-link.application.submitted', {
		applicationId: application.id,
		applicantUserId: applicant.id,
		submittedAt,
	})

	await getAttachmentService().deleteFriendLinkApplicationAttachmentsExcept({
		applicationId: application.id,
		activeAttachmentId: input.avatarAttachmentId,
	})

	return summarizeFriendLinkApplication(application)
}

export const listAdminFriendLinkApplications = async (input: {
	page: number
	pageSize: number
	search?: string
	category?: string
	status?: string
	sortField?: string
	sortDirection?: 'asc' | 'desc'
	includeDrafts?: boolean
}): Promise<AdminFriendLinkApplicationsResponse> => {
	const category = normalizeFriendLinkCategory(input.category)
	const status = normalizeFriendLinkApplicationStatus(input.status)
	const where: Prisma.FriendLinkApplicationWhereInput = {
		...(category ? { category } : {}),
		...(status
			? { status }
			: input.includeDrafts
				? {}
				: { status: { not: 'DRAFT' } }),
		...(input.search
			? {
					OR: [
						{ name: { contains: input.search, mode: 'insensitive' } },
						{ summary: { contains: input.search, mode: 'insensitive' } },
						{ url: { contains: input.search, mode: 'insensitive' } },
						{
							applicantUser: {
								username: {
									contains: input.search,
									mode: 'insensitive',
								},
							},
						},
						{
							applicantUser: {
								displayName: {
									contains: input.search,
									mode: 'insensitive',
								},
							},
						},
					],
				}
			: {}),
	}
	const sortField = input.sortField ?? 'submittedAt'
	const sortDirection = input.sortDirection ?? 'desc'
	const orderBy: Prisma.FriendLinkApplicationOrderByWithRelationInput =
		FRIEND_LINK_APPLICATION_SORT_FIELDS.has(sortField)
			? { [sortField]: sortDirection }
			: { submittedAt: 'desc' }

	const [total, items] = await Promise.all([
		prisma.friendLinkApplication.count({ where }),
		prisma.friendLinkApplication.findMany({
			where,
			orderBy,
			skip: (input.page - 1) * input.pageSize,
			take: input.pageSize,
			include: friendLinkApplicationInclude,
		}),
	])

	return {
		items: items.map((application) =>
			summarizeFriendLinkApplication(application),
		),
		page: input.page,
		pageSize: input.pageSize,
		total,
		pageCount: Math.max(Math.ceil(total / input.pageSize), 1),
	}
}

export const approveFriendLinkApplication = async (
	reviewer: User,
	applicationId: string,
): Promise<FriendLinkApplicationSummary> => {
	const previous = await assertFriendLinkApplicationExists(applicationId)

	if (previous.status !== 'PENDING_REVIEW') {
		throw createApiError({
			statusCode: 400,
			code: 'FRIEND_LINK_APPLICATION_NOT_PENDING',
		})
	}

	if (
		!previous.category ||
		!previous.url ||
		!previous.name ||
		!previous.avatarAttachmentId ||
		!previous.avatarUrl
	) {
		throw createApiError({
			statusCode: 400,
			code: 'INVALID_FRIEND_LINK_APPLICATION',
		})
	}

	const reviewedAt = new Date()
	const category = previous.category
	const url = previous.url
	const name = previous.name
	const avatarAttachmentId = previous.avatarAttachmentId
	const avatarUrl = previous.avatarUrl
	const result = await prisma.$transaction(async (tx) => {
		const link = await tx.friendLink.create({
			data: {
				category,
				url,
				name,
				summary: previous.summary,
				avatarAttachmentId,
				avatarUrl,
				enabled: true,
				archived: false,
				sortOrder: await getNextFriendLinkSortOrder(category, tx),
			},
		})
		const application = await tx.friendLinkApplication.update({
			where: { id: applicationId },
			data: {
				status: 'APPROVED',
				reviewedAt,
				reviewedById: reviewer.id,
				approvedLinkId: link.id,
				expiresAt: null,
			},
			include: friendLinkApplicationInclude,
		})

		return { link, application }
	})

	await getAttachmentService().reassignAttachmentOwner({
		attachmentId: avatarAttachmentId,
		ownerType: 'friend-link',
		ownerId: result.link.id,
		expiresAt: null,
	})
	await getAttachmentService().deleteFriendLinkAttachmentsExcept({
		linkId: result.link.id,
		activeAttachmentId: avatarAttachmentId,
	})

	await emitEvent('friend-link.created', {
		linkId: result.link.id,
		actorUserId: reviewer.id,
		createdAt: result.link.createdAt,
	})
	await emitEvent('friend-link.application.reviewed', {
		applicationId,
		reviewerUserId: reviewer.id,
		status: 'APPROVED',
		reviewedAt,
	})

	return summarizeFriendLinkApplication(result.application)
}

export const reorderFriendLinks = async (
	actor: User,
	body: Record<string, unknown>,
) => {
	const { category, orderedIds } = normalizeFriendLinkReorderInput(body)
	const existing = await prisma.friendLink.findMany({
		where: { category },
		select: { id: true },
	})

	const existingIds = new Set(existing.map((row) => row.id))

	if (existing.length !== orderedIds.length) {
		throw createApiError({
			statusCode: 400,
			code: 'INVALID_FRIEND_LINK_REORDER',
		})
	}

	for (const id of orderedIds) {
		if (!existingIds.has(id)) {
			throw createApiError({
				statusCode: 400,
				code: 'INVALID_FRIEND_LINK_REORDER',
			})
		}
	}

	await prisma.$transaction(
		orderedIds.map((id, index) =>
			prisma.friendLink.update({
				where: { id },
				data: { sortOrder: index },
				select: { id: true },
			}),
		),
	)

	await emitEvent('friend-link.reordered', {
		category,
		actorUserId: actor.id,
		orderedIds,
		occurredAt: new Date(),
	})

	return { category, orderedIds }
}

export const rejectFriendLinkApplication = async (
	reviewer: User,
	applicationId: string,
): Promise<FriendLinkApplicationSummary> => {
	const previous = await assertFriendLinkApplicationExists(applicationId)

	if (previous.status !== 'PENDING_REVIEW') {
		throw createApiError({
			statusCode: 400,
			code: 'FRIEND_LINK_APPLICATION_NOT_PENDING',
		})
	}

	const reviewedAt = new Date()
	const application = await prisma.friendLinkApplication.update({
		where: { id: applicationId },
		data: {
			status: 'REJECTED',
			reviewedAt,
			reviewedById: reviewer.id,
			avatarAttachmentId: null,
			avatarUrl: null,
		},
		include: friendLinkApplicationInclude,
	})

	await getAttachmentService().expireAttachments({
		ownerType: 'friend-link-application',
		ownerId: applicationId,
		purpose: FRIEND_LINK_AVATAR_PURPOSE,
	})

	await emitEvent('friend-link.application.reviewed', {
		applicationId,
		reviewerUserId: reviewer.id,
		status: 'REJECTED',
		reviewedAt,
	})

	return summarizeFriendLinkApplication(application)
}

export const expireStaleFriendLinkApplications = async (): Promise<number> => {
	const now = new Date()
	const staleApplications = await prisma.friendLinkApplication.findMany({
		where: {
			status: {
				in: ['DRAFT', 'PENDING_REVIEW'],
			},
			expiresAt: {
				lte: now,
			},
		},
		select: {
			id: true,
			status: true,
		},
	})

	if (!staleApplications.length) {
		return 0
	}

	for (const application of staleApplications) {
		await prisma.friendLinkApplication.update({
			where: { id: application.id },
			data: {
				status: 'EXPIRED',
				avatarAttachmentId: null,
				avatarUrl: null,
			},
		})
		await getAttachmentService().expireAttachments({
			ownerType: 'friend-link-application',
			ownerId: application.id,
			purpose: FRIEND_LINK_AVATAR_PURPOSE,
		})
		await emitEvent('friend-link.application.expired', {
			applicationId: application.id,
			previousStatus: application.status as 'DRAFT' | 'PENDING_REVIEW',
			expiredAt: now,
		})
	}

	return staleApplications.length
}
