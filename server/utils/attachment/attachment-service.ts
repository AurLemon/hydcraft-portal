import type {
	Attachment,
	AttachmentVariant,
	AttachmentVisibility,
	Prisma,
	User,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { createApiError, createBadRequestError } from '../errors'
import { buildFinalObjectKey } from './key-builder'
import { getAttachmentPolicy } from './policies'
import type { StorageAdapter } from './storage-adapter'
import type {
	AttachmentApp,
	AttachmentCategory,
	AttachmentOwnerType,
	AttachmentPublicSummary,
	AttachmentPurpose,
	AttachmentPublicVariant,
	StorageProfiles,
} from './types'
import { processImageAttachment } from './image-processor'

const ADMIN_ATTACHMENT_SORT_FIELDS = new Set([
	'id',
	'app',
	'category',
	'purpose',
	'ownerType',
	'ownerId',
	'visibility',
	'status',
	'sizeBytes',
	'createdAt',
	'updatedAt',
])

interface AttachmentVariantCreateInput {
	name: string
	objectKey: string
	width: number
	height: number
	contentType: string
	sizeBytes: number
}

interface UploadAttachmentInput {
	contentType: string
	buffer: Buffer
	purpose: AttachmentPurpose
	ownerId?: string
}

const badRequest = (code: string) => createBadRequestError(code)

const isString = (value: unknown): value is string =>
	typeof value === 'string' && value.trim().length > 0

const parseString = (value: unknown, fieldName: string): string => {
	if (!isString(value)) {
		throw badRequest('INVALID_ATTACHMENT_INPUT')
	}

	return value.trim()
}

const parseSizeBytes = (value: unknown): number => {
	if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
		throw badRequest('INVALID_FILE_SIZE')
	}

	return value
}

const normalizePurpose = (value: unknown): AttachmentPurpose =>
	parseString(value, 'purpose') as AttachmentPurpose

const requireOwnedAttachment = async (
	attachmentId: string,
	user: User,
): Promise<Attachment & { variants: AttachmentVariant[] }> => {
	const attachment = await prisma.attachment.findUnique({
		where: {
			id: attachmentId,
		},
		include: {
			variants: true,
		},
	})

	if (!attachment) {
		throw createApiError({
			statusCode: 404,
			code: 'ATTACHMENT_NOT_FOUND',
		})
	}

	if (attachment.createdById !== user.id) {
		throw createApiError({
			statusCode: 403,
			code: 'ATTACHMENT_NOT_OWNED',
		})
	}

	return attachment
}

const resolveUploadContext = (
	user: User,
	ownerId?: string,
): {
	app: AttachmentApp
	category: AttachmentCategory
	ownerType: AttachmentOwnerType
	ownerId: string | null
	visibility: AttachmentVisibility
} => ({
	app: 'portal',
	category: 'profile',
	ownerType: 'user',
	ownerId: ownerId ?? user.id,
	visibility: 'PUBLIC',
})

const toVariantSummary = (
	storage: StorageAdapter,
	attachment: Attachment,
	variant: AttachmentVariant,
): AttachmentPublicVariant => ({
	name: variant.name,
	url:
		attachment.visibility === 'PUBLIC'
			? storage.getPublicUrl({
					profile: 'publicAssets',
					objectKey: variant.objectKey,
				})
			: null,
	width: variant.width,
	height: variant.height,
	contentType: variant.contentType,
})

const toAttachmentSummary = (
	storage: StorageAdapter,
	attachment: Attachment & { variants: AttachmentVariant[] },
): AttachmentPublicSummary => ({
	id: attachment.id,
	status: attachment.status,
	objectKey: attachment.objectKey,
	variants: attachment.variants.map((variant) =>
		toVariantSummary(storage, attachment, variant),
	),
})

const serializeAttachment = (
	storage: StorageAdapter,
	attachment: Attachment & {
		variants: AttachmentVariant[]
		createdBy?: Pick<
			User,
			'id' | 'username' | 'displayName' | 'avatarUrl'
		> | null
	},
) => ({
	id: attachment.id,
	app: attachment.app,
	category: attachment.category,
	purpose: attachment.purpose,
	ownerType: attachment.ownerType,
	ownerId: attachment.ownerId,
	visibility: attachment.visibility,
	status: attachment.status,
	bucketProfile: attachment.bucketProfile,
	objectKey: attachment.objectKey,
	originalKey: attachment.originalKey,
	contentType: attachment.contentType,
	sizeBytes: attachment.sizeBytes,
	width: attachment.width,
	height: attachment.height,
	sha256: attachment.sha256,
	createdById: attachment.createdById,
	createdBy: attachment.createdBy ?? null,
	createdAt: attachment.createdAt,
	updatedAt: attachment.updatedAt,
	expiresAt: attachment.expiresAt,
	variants: attachment.variants.map((variant) => ({
		id: variant.id,
		name: variant.name,
		objectKey: variant.objectKey,
		url:
			attachment.visibility === 'PUBLIC'
				? storage.getPublicUrl({
						profile: 'publicAssets',
						objectKey: variant.objectKey,
					})
				: null,
		width: variant.width,
		height: variant.height,
		contentType: variant.contentType,
		sizeBytes: variant.sizeBytes,
		createdAt: variant.createdAt,
	})),
})

export class AttachmentService {
	constructor(
		private readonly storage: StorageAdapter,
		private readonly storageProfiles: StorageProfiles,
	) {}

	async uploadAttachment(
		user: User,
		input: UploadAttachmentInput,
	): Promise<AttachmentPublicSummary> {
		const purpose = normalizePurpose(input.purpose)
		const policy = getAttachmentPolicy(purpose)
		const uploadContext = resolveUploadContext(user, input.ownerId)
		const contentType = parseString(input.contentType, 'contentType')
		const sizeBytes = parseSizeBytes(input.buffer.byteLength)

		if (!policy.allowedContentTypes.includes(contentType)) {
			throw badRequest('INVALID_CONTENT_TYPE')
		}

		if (sizeBytes > policy.maxSizeBytes) {
			throw badRequest('FILE_TOO_LARGE')
		}

		const attachment = await prisma.attachment.create({
			data: {
				app: uploadContext.app,
				category: uploadContext.category,
				purpose,
				ownerType: uploadContext.ownerType,
				ownerId: uploadContext.ownerId,
				visibility: uploadContext.visibility,
				status: 'PENDING',
				bucketProfile: 'publicAssets',
				contentType,
				sizeBytes,
				createdById: user.id,
			},
		})

		await prisma.attachment.update({
			where: {
				id: attachment.id,
			},
			data: {
				status: 'PROCESSING',
			},
		})

		try {
			const processed = await processImageAttachment({
				originalBuffer: input.buffer,
				policy,
			})
			const variantCreates: AttachmentVariantCreateInput[] = []

			for (const variant of processed.variants) {
				const objectKey = buildFinalObjectKey({
					app: attachment.app,
					category:
						(attachment.category as AttachmentCategory | null) ??
						policy.category,
					purpose: attachment.purpose as AttachmentPurpose,
					ownerType: attachment.ownerType as AttachmentOwnerType,
					ownerId: attachment.ownerId,
					attachmentId: attachment.id,
					profile: 'publicAssets',
					basePrefix: this.storageProfiles.publicAssets.basePrefix,
					variantName: variant.name,
					ext: variant.ext,
				})

				await this.storage.putObject({
					profile: 'publicAssets',
					objectKey,
					body: variant.buffer,
					contentType: variant.contentType,
				})

				variantCreates.push({
					name: variant.name,
					objectKey,
					width: variant.width,
					height: variant.height,
					contentType: variant.contentType,
					sizeBytes: variant.buffer.byteLength,
				})
			}

			const primaryVariant =
				variantCreates.find((variant) =>
					['avatar_256', 'cover_1440', 'image_1440'].includes(variant.name),
				) ?? variantCreates[0]

			const readyAttachment = await prisma.$transaction(async (tx) => {
				await tx.attachmentVariant.deleteMany({
					where: {
						attachmentId: attachment.id,
					},
				})
				await tx.attachmentVariant.createMany({
					data: variantCreates.map((variant) => ({
						attachmentId: attachment.id,
						...variant,
					})),
				})

				return await tx.attachment.update({
					where: {
						id: attachment.id,
					},
					data: {
						status: 'READY',
						bucketProfile: 'publicAssets',
						objectKey: primaryVariant?.objectKey ?? null,
						originalKey: null,
						contentType,
						width: processed.width,
						height: processed.height,
						sha256: processed.sha256,
						sizeBytes,
					},
					include: {
						variants: true,
					},
				})
			})

			return toAttachmentSummary(this.storage, readyAttachment)
		} catch (error) {
			await prisma.attachment.update({
				where: {
					id: attachment.id,
				},
				data: {
					status: 'FAILED',
				},
			})

			console.error('IMAGE_PROCESSING_FAILED', error)
			throw error
		}
	}

	async getAttachment(
		user: User,
		attachmentId: string,
	): Promise<AttachmentPublicSummary> {
		const attachment = await requireOwnedAttachment(attachmentId, user)

		return toAttachmentSummary(this.storage, attachment)
	}

	async deleteAttachment(user: User, attachmentId: string): Promise<void> {
		const attachment = await requireOwnedAttachment(attachmentId, user)

		await prisma.attachment.update({
			where: {
				id: attachment.id,
			},
			data: {
				status: 'DELETED',
			},
		})

		for (const variant of attachment.variants) {
			void this.storage
				.deleteObject({
					profile: 'publicAssets',
					objectKey: variant.objectKey,
				})
				.catch((error) => {
					console.error('Failed to delete attachment variant object', error)
				})
		}
	}

	async deleteProfileAttachmentsExcept(input: {
		userId: string
		purpose: 'user-avatar' | 'user-cover'
		activeAttachmentId: string | null
	}): Promise<void> {
		const attachments = await prisma.attachment.findMany({
			where: {
				ownerType: 'user',
				ownerId: input.userId,
				purpose: input.purpose,
				status: {
					notIn: ['DELETED', 'EXPIRED'],
				},
				...(input.activeAttachmentId
					? {
							id: {
								not: input.activeAttachmentId,
							},
						}
					: {}),
			},
			include: {
				variants: true,
			},
		})

		if (!attachments.length) {
			return
		}

		await prisma.attachment.updateMany({
			where: {
				id: {
					in: attachments.map((attachment) => attachment.id),
				},
			},
			data: {
				status: 'DELETED',
			},
		})

		for (const attachment of attachments) {
			for (const variant of attachment.variants) {
				void this.storage
					.deleteObject({
						profile: 'publicAssets',
						objectKey: variant.objectKey,
					})
					.catch((error) => {
						console.error('Failed to delete replaced attachment object', error)
					})
			}
		}
	}

	async listAdminAttachments(input: {
		page: number
		pageSize: number
		search?: string
		app?: string
		status?: string
		purpose?: string
		category?: string
		visibility?: string
		sortField?: string
		sortDirection?: 'asc' | 'desc'
	}) {
		const where: Prisma.AttachmentWhereInput = {
			...(input.app ? { app: input.app } : {}),
			...(input.status ? { status: input.status as never } : {}),
			...(input.purpose ? { purpose: input.purpose } : {}),
			...(input.category ? { category: input.category } : {}),
			...(input.visibility ? { visibility: input.visibility as never } : {}),
			...(input.search
				? {
						OR: [
							{ id: { contains: input.search, mode: 'insensitive' } },
							{ ownerId: { contains: input.search, mode: 'insensitive' } },
							{ objectKey: { contains: input.search, mode: 'insensitive' } },
							{ originalKey: { contains: input.search, mode: 'insensitive' } },
						],
					}
				: {}),
		}
		const sortField = input.sortField ?? 'createdAt'
		const sortDirection = input.sortDirection ?? 'desc'
		const orderBy: Prisma.AttachmentOrderByWithRelationInput =
			ADMIN_ATTACHMENT_SORT_FIELDS.has(sortField)
				? { [sortField]: sortDirection }
				: { createdAt: 'desc' }

		const [total, items] = await Promise.all([
			prisma.attachment.count({ where }),
			prisma.attachment.findMany({
				where,
				orderBy,
				skip: (input.page - 1) * input.pageSize,
				take: input.pageSize,
				include: {
					variants: true,
					createdBy: {
						select: {
							id: true,
							username: true,
							displayName: true,
							avatarUrl: true,
						},
					},
				},
			}),
		])

		return {
			items: items.map((attachment) =>
				serializeAttachment(this.storage, attachment),
			),
			page: input.page,
			pageSize: input.pageSize,
			total,
			pageCount: Math.max(Math.ceil(total / input.pageSize), 1),
		}
	}

	async getAdminAttachment(attachmentId: string) {
		const attachment = await prisma.attachment.findUnique({
			where: {
				id: attachmentId,
			},
			include: {
				variants: true,
				createdBy: {
					select: {
						id: true,
						username: true,
						displayName: true,
						avatarUrl: true,
					},
				},
			},
		})

		if (!attachment) {
			throw createApiError({
				statusCode: 404,
				code: 'ATTACHMENT_NOT_FOUND',
			})
		}

		return serializeAttachment(this.storage, attachment)
	}

	async deleteAdminAttachment(attachmentId: string): Promise<void> {
		const attachment = await prisma.attachment.findUnique({
			where: {
				id: attachmentId,
			},
			include: {
				variants: true,
			},
		})

		if (!attachment) {
			throw createApiError({
				statusCode: 404,
				code: 'ATTACHMENT_NOT_FOUND',
			})
		}

		await prisma.attachment.update({
			where: {
				id: attachment.id,
			},
			data: {
				status: 'DELETED',
			},
		})

		for (const variant of attachment.variants) {
			void this.storage
				.deleteObject({
					profile: 'publicAssets',
					objectKey: variant.objectKey,
				})
				.catch((error) => {
					console.error('Failed to delete attachment variant object', error)
				})
		}
	}
}

export const createAttachmentService = (
	storage: StorageAdapter,
	storageProfiles: StorageProfiles,
): AttachmentService => new AttachmentService(storage, storageProfiles)
