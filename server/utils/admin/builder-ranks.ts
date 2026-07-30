import type { BuilderRank } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { createBadRequestError } from '../errors'

const builderRanks = new Set<BuilderRank>([
	'CHIEF',
	'SENIOR',
	'PRACTICING',
	'APPRENTICE',
])

const badRequest = (code: string) => createBadRequestError(code)

const normalizeRank = (value: unknown): BuilderRank | null => {
	if (value === null) {
		return null
	}

	if (typeof value !== 'string' || !builderRanks.has(value as BuilderRank)) {
		throw badRequest('BUILDER_RANK_INVALID')
	}

	return value as BuilderRank
}

const normalizeUserIds = (value: unknown): string[] => {
	if (!Array.isArray(value)) {
		throw badRequest('BUILDER_RANK_USER_IDS_INVALID')
	}

	const userIds = [
		...new Set(
			value
				.filter((item): item is string => typeof item === 'string')
				.map((item) => item.trim())
				.filter(Boolean),
		),
	]

	if (!userIds.length) {
		throw badRequest('BUILDER_RANK_USER_IDS_INVALID')
	}

	return userIds
}

export const assignAdminBuilderRanks = async (body: unknown) => {
	if (!body || typeof body !== 'object') {
		throw badRequest('BUILDER_RANK_ASSIGNMENT_INVALID')
	}

	const input = body as { userIds?: unknown; rank?: unknown }
	const userIds = normalizeUserIds(input.userIds)
	const rank = normalizeRank(input.rank)
	const result = await prisma.user.updateMany({
		where: {
			id: {
				in: userIds,
			},
		},
		data: {
			builderRank: rank,
			builderRankManagedByAdmin: true,
		},
	})

	return {
		updatedUserCount: result.count,
	}
}
