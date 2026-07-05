import type {
	FriendLinkApplicationStatus,
	FriendLinkCategory,
} from '~/generated/prisma/client'
import {
	normalizeBoolean,
	normalizeOptionalText,
	normalizeRequiredText,
} from '../profile/validation'
import { createBadRequestError } from '../errors'

export interface FriendLinkMutationInput {
	category?: FriendLinkCategory
	url?: string
	name?: string
	summary?: string | null
	avatarAttachmentId?: string | null
	enabled?: boolean
	archived?: boolean
	sortOrder?: number
}

export interface FriendLinkApplicationSubmitInput {
	category: FriendLinkCategory
	url: string
	name: string
	summary: string | null
	avatarAttachmentId: string
	applicantStatement: string
}

const FRIEND_LINK_CATEGORIES = new Set<FriendLinkCategory>([
	'BUSINESS',
	'PERSONAL',
	'ORGANIZATION',
])
const FRIEND_LINK_APPLICATION_CATEGORIES = new Set<FriendLinkCategory>([
	'PERSONAL',
	'ORGANIZATION',
])
const FRIEND_LINK_APPLICATION_STATUSES = new Set<FriendLinkApplicationStatus>([
	'DRAFT',
	'PENDING_REVIEW',
	'APPROVED',
	'REJECTED',
	'EXPIRED',
])

const badRequest = (code: string) => createBadRequestError(code)

const requireValue = <T>(value: T | null | undefined): T => {
	if (value === undefined || value === null) {
		throw badRequest('FIELD_REQUIRED')
	}

	return value
}

export const normalizeFriendLinkCategory = (
	value: unknown,
): FriendLinkCategory | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (
		typeof value !== 'string' ||
		!FRIEND_LINK_CATEGORIES.has(value as FriendLinkCategory)
	) {
		throw badRequest('INVALID_FRIEND_LINK_CATEGORY')
	}

	return value as FriendLinkCategory
}

const normalizeFriendLinkSortOrder = (value: unknown): number | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (!Number.isInteger(value)) {
		throw badRequest('INVALID_FRIEND_LINK_INPUT')
	}

	return value as number
}

export const normalizeFriendLinkApplicationCategory = (
	value: unknown,
): FriendLinkCategory | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (
		typeof value !== 'string' ||
		!FRIEND_LINK_APPLICATION_CATEGORIES.has(value as FriendLinkCategory)
	) {
		throw badRequest('INVALID_FRIEND_LINK_CATEGORY')
	}

	return value as FriendLinkCategory
}

export const normalizeFriendLinkApplicationStatus = (
	value: unknown,
): FriendLinkApplicationStatus | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (
		typeof value !== 'string' ||
		!FRIEND_LINK_APPLICATION_STATUSES.has(value as FriendLinkApplicationStatus)
	) {
		throw badRequest('INVALID_FRIEND_LINK_APPLICATION_STATUS')
	}

	return value as FriendLinkApplicationStatus
}

export const normalizeFriendLinkUrl = (
	value: unknown,
): string | null | undefined => {
	const normalized = normalizeOptionalText(value, 255, 'url')

	if (!normalized) {
		return normalized
	}

	const normalizedWithProtocol = /^[a-z][a-z0-9+.-]*:/i.test(normalized)
		? normalized
		: `https://${normalized}`

	let url: URL

	try {
		url = new URL(normalizedWithProtocol)
	} catch {
		throw badRequest('URL_INVALID')
	}

	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw badRequest('URL_INVALID')
	}

	return url.toString()
}

export const normalizeCreateFriendLinkInput = (
	body: Record<string, unknown>,
): Required<Pick<FriendLinkMutationInput, 'category' | 'url' | 'name'>> &
	Omit<FriendLinkMutationInput, 'category' | 'url' | 'name'> => ({
	category: requireValue(normalizeFriendLinkCategory(body.category)),
	url: requireValue(normalizeFriendLinkUrl(body.url)),
	name: requireValue(normalizeRequiredText(body.name, 120, 'name')),
	summary: normalizeOptionalText(body.summary, 240, 'summary'),
	avatarAttachmentId: normalizeOptionalText(
		body.avatarAttachmentId,
		64,
		'avatarAttachmentId',
	),
	enabled: normalizeBoolean(body.enabled, 'enabled') ?? true,
	archived: normalizeBoolean(body.archived, 'archived') ?? false,
	sortOrder: normalizeFriendLinkSortOrder(body.sortOrder),
})

export const normalizeUpdateFriendLinkInput = (
	body: Record<string, unknown>,
): FriendLinkMutationInput => ({
	...(body.category !== undefined
		? { category: normalizeFriendLinkCategory(body.category) }
		: {}),
	...(body.url !== undefined ? { url: normalizeFriendLinkUrl(body.url)! } : {}),
	...(body.name !== undefined
		? { name: normalizeRequiredText(body.name, 120, 'name')! }
		: {}),
	...(body.summary !== undefined
		? { summary: normalizeOptionalText(body.summary, 240, 'summary') }
		: {}),
	...(body.avatarAttachmentId !== undefined
		? {
				avatarAttachmentId: normalizeOptionalText(
					body.avatarAttachmentId,
					64,
					'avatarAttachmentId',
				),
			}
		: {}),
	...(body.enabled !== undefined
		? { enabled: normalizeBoolean(body.enabled, 'enabled') }
		: {}),
	...(body.archived !== undefined
		? { archived: normalizeBoolean(body.archived, 'archived') }
		: {}),
	...(body.sortOrder !== undefined
		? { sortOrder: normalizeFriendLinkSortOrder(body.sortOrder) }
		: {}),
})

export const normalizeFriendLinkReorderInput = (
	body: Record<string, unknown>,
): { category: FriendLinkCategory; orderedIds: string[] } => {
	const category = normalizeFriendLinkCategory(body.category)

	if (!category) {
		throw badRequest('INVALID_FRIEND_LINK_REORDER')
	}

	if (!Array.isArray(body.orderedIds) || body.orderedIds.length === 0) {
		throw badRequest('INVALID_FRIEND_LINK_REORDER')
	}

	const orderedIds = body.orderedIds.map((value) => {
		if (typeof value !== 'string' || !value.trim()) {
			throw badRequest('INVALID_FRIEND_LINK_REORDER')
		}

		return value
	})

	if (new Set(orderedIds).size !== orderedIds.length) {
		throw badRequest('INVALID_FRIEND_LINK_REORDER')
	}

	return { category, orderedIds }
}

export const normalizeSubmitFriendLinkApplicationInput = (
	body: Record<string, unknown>,
): FriendLinkApplicationSubmitInput => {
	const avatarAttachmentId = normalizeRequiredText(
		body.avatarAttachmentId,
		64,
		'avatarAttachmentId',
	)

	if (!avatarAttachmentId) {
		throw badRequest('FIELD_REQUIRED')
	}

	return {
		category: requireValue(
			normalizeFriendLinkApplicationCategory(body.category),
		),
		url: requireValue(normalizeFriendLinkUrl(body.url)),
		name: requireValue(normalizeRequiredText(body.name, 120, 'name')),
		summary: normalizeOptionalText(body.summary, 240, 'summary') ?? null,
		avatarAttachmentId,
		applicantStatement:
			normalizeRequiredText(
				body.applicantStatement,
				2000,
				'applicantStatement',
			) ?? '',
	}
}
