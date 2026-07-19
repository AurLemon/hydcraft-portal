import { getHeader } from 'h3'
import { createApiError } from '../../../utils/errors'
import { resolveOAuthAccessToken } from '../../../utils/oauth-provider/tokens'

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
	const { user } = token
	const scopes = new Set(token.scopes)
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
	if (scopes.has('hydroline')) {
		result.role = user.role
		result.status = user.status
		result.locale =
			user.preferences?.language === 'ZH_TW'
				? 'zh-TW'
				: user.preferences?.language === 'JA_JP'
					? 'ja-JP'
					: user.preferences?.language === 'EN_US'
						? 'en-US'
						: 'zh-CN'
	}
	return result
})
