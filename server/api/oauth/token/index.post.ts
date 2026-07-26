import { getHeader } from 'h3'
import { createApiError } from '../../../utils/errors'
import { prisma } from '../../../utils/db/prisma'
import {
	authenticateOAuthClient,
	consumeAuthorizationCode,
} from '../../../utils/oauth-provider/service'
import {
	exchangeOAuthRefreshToken,
	issueOAuthTokenPair,
} from '../../../utils/oauth-provider/tokens'

interface TokenBody {
	grant_type?: string
	code?: string
	redirect_uri?: string
	code_verifier?: string
	refresh_token?: string
	client_id?: string
	client_secret?: string
}

const readClientCredentials = (
	event: Parameters<typeof getHeader>[0],
	body: TokenBody,
) => {
	const authorization = getHeader(event, 'authorization')
	if (authorization?.startsWith('Basic ')) {
		const value = Buffer.from(authorization.slice(6), 'base64').toString('utf8')
		const separator = value.indexOf(':')
		if (separator > 0)
			return {
				clientId: value.slice(0, separator),
				clientSecret: value.slice(separator + 1),
			}
	}
	return {
		clientId: body.client_id ?? '',
		clientSecret: body.client_secret ?? '',
	}
}

export default defineEventHandler(async (event) => {
	const body = await readBody<TokenBody>(event)
	if (
		body.grant_type !== 'authorization_code' &&
		body.grant_type !== 'refresh_token'
	)
		throw createApiError({ statusCode: 400, code: 'OAUTH_GRANT_TYPE_INVALID' })
	if (
		body.grant_type === 'authorization_code' &&
		(!body.code || !body.redirect_uri || !body.code_verifier)
	)
		throw createApiError({
			statusCode: 400,
			code: 'OAUTH_TOKEN_REQUEST_INVALID',
		})
	if (body.grant_type === 'refresh_token' && !body.refresh_token)
		throw createApiError({
			statusCode: 400,
			code: 'OAUTH_TOKEN_REQUEST_INVALID',
		})
	const { clientId, clientSecret } = readClientCredentials(event, body)
	if (!clientId || !clientSecret)
		throw createApiError({
			statusCode: 401,
			code: 'OAUTH_CLIENT_AUTHENTICATION_FAILED',
		})
	const client = await authenticateOAuthClient({ clientId, clientSecret })
	const tokenPair =
		body.grant_type === 'refresh_token'
			? await exchangeOAuthRefreshToken({
					refreshToken: body.refresh_token ?? '',
					clientId: client.id,
				})
			: await prisma.$transaction(async (tx) => {
					const { user, scopes } = await consumeAuthorizationCode({
						code: body.code ?? '',
						clientId,
						redirectUri: body.redirect_uri ?? '',
						codeVerifier: body.code_verifier ?? '',
						db: tx,
					})

					return issueOAuthTokenPair({
						db: tx,
						userId: user.id,
						clientId: client.id,
						scopes,
					})
				})
	return {
		access_token: tokenPair.accessToken,
		token_type: 'Bearer',
		expires_in: tokenPair.accessTokenExpiresIn,
		scope: tokenPair.scopes.join(' '),
		refresh_token: tokenPair.refreshToken,
		refresh_token_expires_in: tokenPair.refreshTokenExpiresIn,
	}
})
