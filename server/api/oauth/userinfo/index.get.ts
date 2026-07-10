import { getHeader } from 'h3'
import { prisma } from '../../../utils/db/prisma'
import { createApiError } from '../../../utils/errors'
import { verifyOAuthAccessToken } from '../../../utils/oauth-provider/tokens'

export default defineEventHandler(async (event) => {
	const authorization = getHeader(event, 'authorization')
	if (!authorization?.startsWith('Bearer '))
		throw createApiError({
			statusCode: 401,
			code: 'OAUTH_ACCESS_TOKEN_INVALID',
		})
	const claims = verifyOAuthAccessToken(
		authorization.slice('Bearer '.length).trim(),
	)
	const user = await prisma.user.findUnique({ where: { id: claims.sub } })
	if (!user || user.status !== 'ACTIVE')
		throw createApiError({
			statusCode: 401,
			code: 'OAUTH_ACCESS_TOKEN_INVALID',
		})
	const scopes = new Set((claims.scope ?? '').split(' '))
	const result: Record<string, string | boolean | null> = {
		sub: user.id,
		hydroline_id: user.hydrolineId,
	}
	if (scopes.has('profile')) {
		result.preferred_username = user.username
		result.name = user.displayName ?? user.username
		result.picture = user.avatarUrl
	}
	if (scopes.has('email')) {
		result.email = user.email
		result.email_verified = Boolean(user.emailVerifiedAt)
	}
	return result
})
