import { createError } from 'h3'
import type { Prisma } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { normalizeBoolean, normalizeOptionalText } from '../profile/validation'

const badRequest = (message: string) =>
	createError({
		statusCode: 400,
		statusMessage: message,
	})

const BADGE_SORT_FIELDS = new Set([
	'key',
	'labelZhCn',
	'labelZhTw',
	'labelEnUs',
	'labelJaJp',
	'color',
	'enabled',
	'sortOrder',
	'createdAt',
	'updatedAt',
])

const normalizeRequiredText = (
	value: unknown,
	maxLength: number,
	field: string,
): string => {
	const normalized = normalizeOptionalText(value, maxLength, field)

	if (!normalized) {
		throw badRequest(`${field} is required`)
	}

	return normalized
}

const normalizeBadgeKey = (value: unknown): string => {
	const key = normalizeRequiredText(value, 64, 'key')

	if (!/^[a-z0-9][a-z0-9-]*$/.test(key)) {
		throw badRequest('key is invalid')
	}

	return key
}

const normalizeColor = (value: unknown): string =>
	normalizeRequiredText(value, 32, 'color')

const normalizeSortOrder = (value: unknown): number | undefined => {
	if (value === undefined) {
		return undefined
	}

	const numberValue = Number(value)

	if (!Number.isInteger(numberValue)) {
		throw badRequest('sortOrder is invalid')
	}

	return numberValue
}

const normalizeStringArray = (value: unknown, field: string): string[] => {
	if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
		throw badRequest(`${field} is invalid`)
	}

	return [...new Set(value.map((item) => item.trim()).filter(Boolean))]
}

export const listAdminAchievements = async (
	input: {
		sortField?: string
		sortDirection?: 'asc' | 'desc'
	} = {},
) => {
	const sortField = input.sortField ?? 'sortOrder'
	const sortDirection = input.sortDirection ?? 'asc'
	const orderBy: Prisma.ProfileBadgeOrderByWithRelationInput[] =
		BADGE_SORT_FIELDS.has(sortField)
			? [{ [sortField]: sortDirection }, { createdAt: 'asc' as const }]
			: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }]
	const [badges, verifiedUsers] = await Promise.all([
		prisma.profileBadge.findMany({
			orderBy,
			include: {
				_count: {
					select: {
						assignments: true,
					},
				},
			},
		}),
		prisma.user.findMany({
			where: {
				verified: true,
			},
			orderBy: {
				updatedAt: 'desc',
			},
			select: {
				id: true,
				username: true,
				displayName: true,
				avatarUrl: true,
				verifiedTextZhCn: true,
				verifiedTextZhTw: true,
				verifiedTextEnUs: true,
				verifiedTextJaJp: true,
			},
			take: 50,
		}),
	])

	return {
		badges: badges.map((badge) => ({
			id: badge.id,
			key: badge.key,
			labelZhCn: badge.labelZhCn,
			labelZhTw: badge.labelZhTw,
			labelEnUs: badge.labelEnUs,
			labelJaJp: badge.labelJaJp,
			color: badge.color,
			icon: badge.icon,
			description: badge.description,
			enabled: badge.enabled,
			sortOrder: badge.sortOrder,
			assignmentCount: badge._count.assignments,
			createdAt: badge.createdAt,
			updatedAt: badge.updatedAt,
		})),
		verifiedUsers,
	}
}

export const createAdminBadge = async (body: Record<string, unknown>) =>
	await prisma.profileBadge.create({
		data: {
			key: normalizeBadgeKey(body.key),
			labelZhCn: normalizeRequiredText(body.labelZhCn, 48, 'labelZhCn'),
			labelZhTw: normalizeRequiredText(body.labelZhTw, 48, 'labelZhTw'),
			labelEnUs: normalizeRequiredText(body.labelEnUs, 48, 'labelEnUs'),
			labelJaJp: normalizeRequiredText(body.labelJaJp, 48, 'labelJaJp'),
			color: normalizeColor(body.color),
			icon: normalizeOptionalText(body.icon, 80, 'icon'),
			description: normalizeOptionalText(body.description, 200, 'description'),
			enabled: normalizeBoolean(body.enabled, 'enabled') ?? true,
			sortOrder: normalizeSortOrder(body.sortOrder) ?? 0,
		},
	})

export const updateAdminBadge = async (
	badgeId: string,
	body: Record<string, unknown>,
) => {
	const data = {
		...(body.key !== undefined ? { key: normalizeBadgeKey(body.key) } : {}),
		...(body.labelZhCn !== undefined
			? {
					labelZhCn: normalizeRequiredText(body.labelZhCn, 48, 'labelZhCn'),
				}
			: {}),
		...(body.labelZhTw !== undefined
			? {
					labelZhTw: normalizeRequiredText(body.labelZhTw, 48, 'labelZhTw'),
				}
			: {}),
		...(body.labelEnUs !== undefined
			? {
					labelEnUs: normalizeRequiredText(body.labelEnUs, 48, 'labelEnUs'),
				}
			: {}),
		...(body.labelJaJp !== undefined
			? {
					labelJaJp: normalizeRequiredText(body.labelJaJp, 48, 'labelJaJp'),
				}
			: {}),
		...(body.color !== undefined ? { color: normalizeColor(body.color) } : {}),
		...(body.icon !== undefined
			? { icon: normalizeOptionalText(body.icon, 80, 'icon') }
			: {}),
		...(body.description !== undefined
			? {
					description: normalizeOptionalText(
						body.description,
						200,
						'description',
					),
				}
			: {}),
		...(body.enabled !== undefined
			? { enabled: normalizeBoolean(body.enabled, 'enabled') ?? true }
			: {}),
		...(body.sortOrder !== undefined
			? { sortOrder: normalizeSortOrder(body.sortOrder) ?? 0 }
			: {}),
	}

	if (!Object.keys(data).length) {
		throw badRequest('badge update payload is empty')
	}

	return await prisma.profileBadge.update({
		where: {
			id: badgeId,
		},
		data,
	})
}

export const assignAdminBadges = async (body: Record<string, unknown>) => {
	const userIds = normalizeStringArray(body.userIds, 'userIds')
	const badgeIds = normalizeStringArray(body.badgeIds, 'badgeIds')

	await prisma.$transaction(async (tx) => {
		for (const userId of userIds) {
			await tx.userProfileBadge.deleteMany({
				where: {
					userId,
				},
			})

			if (badgeIds.length) {
				await tx.userProfileBadge.createMany({
					data: badgeIds.map((badgeId, index) => ({
						userId,
						badgeId,
						sortOrder: index,
					})),
				})
			}
		}
	})

	return {
		assignedUserCount: userIds.length,
		badgeCount: badgeIds.length,
	}
}

export const configureAdminVerified = async (body: Record<string, unknown>) => {
	const userIds = normalizeStringArray(body.userIds, 'userIds')
	const verified = normalizeBoolean(body.verified, 'verified') ?? true

	await prisma.user.updateMany({
		where: {
			id: {
				in: userIds,
			},
		},
		data: {
			verified,
			verifiedTextZhCn: normalizeOptionalText(
				body.verifiedTextZhCn,
				120,
				'verifiedTextZhCn',
			),
			verifiedTextZhTw: normalizeOptionalText(
				body.verifiedTextZhTw,
				120,
				'verifiedTextZhTw',
			),
			verifiedTextEnUs: normalizeOptionalText(
				body.verifiedTextEnUs,
				120,
				'verifiedTextEnUs',
			),
			verifiedTextJaJp: normalizeOptionalText(
				body.verifiedTextJaJp,
				120,
				'verifiedTextJaJp',
			),
		},
	})

	return {
		updatedUserCount: userIds.length,
	}
}
