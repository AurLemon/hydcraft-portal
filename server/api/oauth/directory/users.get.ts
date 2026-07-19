import { getHeader, getQuery } from 'h3'
import { prisma } from '../../../utils/db/prisma'
import { createApiError } from '../../../utils/errors'
import { resolveOAuthAccessToken } from '../../../utils/oauth-provider/tokens'

const positiveInteger = (value: unknown, fallback: number, maximum: number) => {
	const parsed = Number(value)
	return Number.isInteger(parsed) && parsed > 0
		? Math.min(parsed, maximum)
		: fallback
}

export default defineEventHandler(async (event) => {
	const authorization = getHeader(event, 'authorization')
	if (!authorization?.startsWith('Bearer '))
		throw createApiError({
			statusCode: 401,
			code: 'OAUTH_ACCESS_TOKEN_INVALID',
		})
	const token = await resolveOAuthAccessToken(
		authorization.slice('Bearer '.length).trim(),
	)
	if (!new Set(token.scopes).has('directory.read'))
		throw createApiError({ statusCode: 403, code: 'ADMIN_ROLE_REQUIRED' })
	const actor = token.user
	if (
		!actor ||
		actor.status !== 'ACTIVE' ||
		!['ADMIN', 'OWNER'].includes(actor.role)
	)
		throw createApiError({ statusCode: 403, code: 'ADMIN_ROLE_REQUIRED' })
	const query = getQuery(event)
	const keyword =
		typeof query.q === 'string' ? query.q.trim().slice(0, 100) : ''
	const page = positiveInteger(query.page, 1, 100_000)
	const pageSize = positiveInteger(query.pageSize, 20, 50)
	const where = keyword
		? {
				status: 'ACTIVE' as const,
				OR: [
					{ hydrolineId: { contains: keyword, mode: 'insensitive' as const } },
					{ username: { contains: keyword, mode: 'insensitive' as const } },
					{ handle: { contains: keyword, mode: 'insensitive' as const } },
				],
			}
		: { status: 'ACTIVE' as const }
	const [total, items] = await prisma.$transaction([
		prisma.user.count({ where }),
		prisma.user.findMany({
			where,
			orderBy: [{ username: 'asc' }, { id: 'asc' }],
			skip: (page - 1) * pageSize,
			take: pageSize,
			select: {
				id: true,
				hydrolineId: true,
				username: true,
				displayName: true,
				avatarUrl: true,
				role: true,
			},
		}),
	])
	return { items, page, pageSize, total }
})
