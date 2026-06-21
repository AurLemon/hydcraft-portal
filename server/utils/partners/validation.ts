import type { PartnerKind, PartnerSection } from '~/generated/prisma/client'
import { createBadRequestError } from '../errors'

export interface PartnerMutationInput {
	name?: string
	section?: PartnerSection
	kind?: PartnerKind | null
	summary?: string | null
	websiteUrl?: string | null
	avatarAttachmentId?: string | null
	coverAttachmentId?: string | null
	linkedMinecraftServerId?: string | null
	enabled?: boolean
	archived?: boolean
	relationshipEstablishedAt?: Date | null
	sortOrder?: number
	coreMemberUserIds?: string[]
}

const PARTNER_KINDS = new Set<PartnerKind>(['SERVER', 'ORGANIZATION'])
const PARTNER_SECTIONS = new Set<PartnerSection>([
	'COMMUNITY',
	'SUPPORT_ACKNOWLEDGEMENTS',
])

const badRequest = (code: string) => createBadRequestError(code)

const normalizeOptionalText = (
	value: unknown,
	maxLength: number,
): string | null | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (value === null) {
		return null
	}

	if (typeof value !== 'string') {
		throw badRequest('INVALID_PARTNER_INPUT')
	}

	const normalized = value.trim()

	if (!normalized) {
		return null
	}

	if (normalized.length > maxLength) {
		throw badRequest('INVALID_PARTNER_INPUT')
	}

	return normalized
}

const normalizeRequiredText = (value: unknown, maxLength: number): string => {
	const normalized = normalizeOptionalText(value, maxLength)

	if (!normalized) {
		throw badRequest('INVALID_PARTNER_INPUT')
	}

	return normalized
}

const normalizeKind = (
	value: unknown,
	section: PartnerSection,
): PartnerKind | null => {
	if (section === 'SUPPORT_ACKNOWLEDGEMENTS') {
		return null
	}

	if (typeof value !== 'string' || !PARTNER_KINDS.has(value as PartnerKind)) {
		throw badRequest('INVALID_PARTNER_KIND')
	}

	return value as PartnerKind
}

const normalizeSection = (value: unknown): PartnerSection => {
	if (
		typeof value !== 'string' ||
		!PARTNER_SECTIONS.has(value as PartnerSection)
	) {
		throw badRequest('INVALID_PARTNER_SECTION')
	}

	return value as PartnerSection
}

const normalizeBoolean = (value: unknown): boolean | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (typeof value !== 'boolean') {
		throw badRequest('INVALID_PARTNER_INPUT')
	}

	return value
}

const normalizeSortOrder = (value: unknown): number | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (!Number.isInteger(value)) {
		throw badRequest('INVALID_PARTNER_INPUT')
	}

	return value as number
}

const normalizeDateOnly = (value: unknown): Date | null | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (value === null) {
		return null
	}

	if (typeof value !== 'string') {
		throw badRequest('INVALID_PARTNER_INPUT')
	}

	const normalized = value.trim()

	if (!normalized) {
		return null
	}

	const matched = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)

	if (!matched) {
		throw badRequest('INVALID_PARTNER_INPUT')
	}

	const [, yearText = '', monthText = '', dayText = ''] = matched
	const year = Number(yearText)
	const month = Number(monthText)
	const day = Number(dayText)

	if (
		!Number.isInteger(year) ||
		!Number.isInteger(month) ||
		!Number.isInteger(day)
	) {
		throw badRequest('INVALID_PARTNER_INPUT')
	}

	const resolved = new Date(Date.UTC(year, month - 1, day))

	if (
		Number.isNaN(resolved.getTime()) ||
		resolved.getUTCFullYear() !== year ||
		resolved.getUTCMonth() !== month - 1 ||
		resolved.getUTCDate() !== day
	) {
		throw badRequest('INVALID_PARTNER_INPUT')
	}

	return resolved
}

const normalizeCoreMemberUserIds = (value: unknown): string[] | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (!Array.isArray(value)) {
		throw badRequest('INVALID_PARTNER_INPUT')
	}

	const uniqueUserIds = new Set<string>()

	for (const entry of value) {
		const userId = normalizeRequiredText(entry, 64)
		uniqueUserIds.add(userId)
	}

	return [...uniqueUserIds]
}

export const normalizeCreatePartnerInput = (
	body: Record<string, unknown>,
): Required<Pick<PartnerMutationInput, 'name' | 'section'>> &
	Omit<PartnerMutationInput, 'name' | 'section'> => {
	const section = normalizeSection(body.section ?? 'COMMUNITY')

	return {
		name: normalizeRequiredText(body.name, 120),
		section,
		kind: normalizeKind(body.kind, section),
		summary: normalizeOptionalText(body.summary, 240),
		websiteUrl: normalizeOptionalText(body.websiteUrl, 500),
		avatarAttachmentId: normalizeOptionalText(body.avatarAttachmentId, 64),
		coverAttachmentId: normalizeOptionalText(body.coverAttachmentId, 64),
		linkedMinecraftServerId: normalizeOptionalText(
			body.linkedMinecraftServerId,
			80,
		),
		enabled: normalizeBoolean(body.enabled) ?? true,
		archived: normalizeBoolean(body.archived) ?? false,
		relationshipEstablishedAt: normalizeDateOnly(
			body.relationshipEstablishedAt,
		),
		sortOrder: normalizeSortOrder(body.sortOrder) ?? 0,
		coreMemberUserIds: normalizeCoreMemberUserIds(body.coreMemberUserIds) ?? [],
	}
}

export const normalizeUpdatePartnerInput = (
	body: Record<string, unknown>,
): PartnerMutationInput => {
	const section =
		body.section !== undefined ? normalizeSection(body.section) : undefined

	const kind =
		section === 'SUPPORT_ACKNOWLEDGEMENTS'
			? null
			: body.kind !== undefined
				? normalizeKind(body.kind, section ?? 'COMMUNITY')
				: undefined

	return {
		...(body.name !== undefined
			? { name: normalizeRequiredText(body.name, 120) }
			: {}),
		...(section !== undefined ? { section } : {}),
		...(kind !== undefined ? { kind } : {}),
		...(body.summary !== undefined
			? { summary: normalizeOptionalText(body.summary, 240) }
			: {}),
		...(body.websiteUrl !== undefined
			? { websiteUrl: normalizeOptionalText(body.websiteUrl, 500) }
			: {}),
		...(body.avatarAttachmentId !== undefined
			? {
					avatarAttachmentId: normalizeOptionalText(
						body.avatarAttachmentId,
						64,
					),
				}
			: {}),
		...(body.coverAttachmentId !== undefined
			? { coverAttachmentId: normalizeOptionalText(body.coverAttachmentId, 64) }
			: {}),
		...(body.linkedMinecraftServerId !== undefined
			? {
					linkedMinecraftServerId: normalizeOptionalText(
						body.linkedMinecraftServerId,
						80,
					),
				}
			: {}),
		...(body.enabled !== undefined
			? { enabled: normalizeBoolean(body.enabled) }
			: {}),
		...(body.archived !== undefined
			? { archived: normalizeBoolean(body.archived) }
			: {}),
		...(body.relationshipEstablishedAt !== undefined
			? {
					relationshipEstablishedAt: normalizeDateOnly(
						body.relationshipEstablishedAt,
					),
				}
			: {}),
		...(body.sortOrder !== undefined
			? { sortOrder: normalizeSortOrder(body.sortOrder) }
			: {}),
		...(body.coreMemberUserIds !== undefined
			? {
					coreMemberUserIds: normalizeCoreMemberUserIds(body.coreMemberUserIds),
				}
			: {}),
	}
}

export const normalizePartnerProfileInput = (
	body: Record<string, unknown>,
): Pick<
	PartnerMutationInput,
	'name' | 'summary' | 'websiteUrl' | 'avatarAttachmentId' | 'coverAttachmentId'
> => ({
	...(body.name !== undefined
		? { name: normalizeRequiredText(body.name, 120) }
		: {}),
	...(body.summary !== undefined
		? { summary: normalizeOptionalText(body.summary, 240) }
		: {}),
	...(body.websiteUrl !== undefined
		? { websiteUrl: normalizeOptionalText(body.websiteUrl, 500) }
		: {}),
	...(body.avatarAttachmentId !== undefined
		? { avatarAttachmentId: normalizeOptionalText(body.avatarAttachmentId, 64) }
		: {}),
	...(body.coverAttachmentId !== undefined
		? { coverAttachmentId: normalizeOptionalText(body.coverAttachmentId, 64) }
		: {}),
})

export const normalizePartnerEditorUserId = (value: unknown): string =>
	normalizeRequiredText(value, 64)

export const normalizePartnerReorderInput = (
	body: Record<string, unknown>,
): { section: PartnerSection; orderedIds: string[] } => {
	const section = normalizeSection(body.section)

	if (!Array.isArray(body.orderedIds) || body.orderedIds.length === 0) {
		throw badRequest('INVALID_PARTNER_REORDER')
	}

	const orderedIds = body.orderedIds.map((value) => {
		if (typeof value !== 'string' || !value.trim()) {
			throw badRequest('INVALID_PARTNER_REORDER')
		}

		return value
	})

	const unique = new Set(orderedIds)

	if (unique.size !== orderedIds.length) {
		throw badRequest('INVALID_PARTNER_REORDER')
	}

	return { section, orderedIds }
}
