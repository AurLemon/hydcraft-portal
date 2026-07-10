import { getHeader } from 'h3'
import { createApiError } from '../../../utils/errors'
import {
	authenticateOAuthClient,
	consumeAuthorizationCode,
} from '../../../utils/oauth-provider/service'
import { issueOAuthTokens } from '../../../utils/oauth-provider/tokens'

interface TokenBody {
	grant_type?: string
	code?: string
	redirect_uri?: string
	code_verifier?: string
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
	if (body.grant_type !== 'authorization_code')
		throw createApiError({ statusCode: 400, code: 'OAUTH_GRANT_TYPE_INVALID' })
	if (!body.code || !body.redirect_uri || !body.code_verifier)
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
	await authenticateOAuthClient({ clientId, clientSecret })
	const { user, scopes, nonce } = await consumeAuthorizationCode({
		code: body.code,
		clientId,
		redirectUri: body.redirect_uri,
		codeVerifier: body.code_verifier,
	})
	const tokens = issueOAuthTokens({ user, clientId, scopes, nonce })
	return {
		access_token: tokens.accessToken,
		token_type: 'Bearer',
		expires_in: tokens.expiresIn,
		scope: scopes.join(' '),
		id_token: tokens.idToken,
	}
})
