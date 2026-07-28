import { deleteCookie, getCookie } from 'h3'
import { createHash } from 'node:crypto'
import { getOptionalCurrentUserWithRefresh } from '../../../utils/auth/session'
import { createApiError } from '../../../utils/errors'
import {
	createAuthorizationCode,
	createAuthorizationRedirect,
	grantOAuthClientAccess,
	parseAuthorizationRequest,
} from '../../../utils/oauth-provider/service'

interface ApproveBody {
	client_id?: string
	redirect_uri?: string
	scope?: string
	state?: string
	code_challenge?: string
	code_challenge_method?: string
	consent_nonce?: string
	approved?: boolean
}

const hasValidConsentNonce = (
	event: Parameters<typeof getCookie>[0],
	nonce: unknown,
): boolean => {
	if (typeof nonce !== 'string') return false
	const expected = getCookie(event, 'portal_oauth_consent')
	if (!expected || expected.length !== nonce.length) return false
	return (
		createHash('sha256').update(expected).digest('base64url') ===
		createHash('sha256').update(nonce).digest('base64url')
	)
}

export default defineEventHandler(async (event) => {
	const user = await getOptionalCurrentUserWithRefresh(event)
	if (!user)
		throw createApiError({ statusCode: 401, code: 'AUTHENTICATION_REQUIRED' })
	const body = await readBody<ApproveBody>(event)
	if (!hasValidConsentNonce(event, body.consent_nonce)) {
		throw createApiError({ statusCode: 403, code: 'OAUTH_CONSENT_INVALID' })
	}
	deleteCookie(event, 'portal_oauth_consent', {
		path: '/api/oauth/authorize/approve',
	})
	const { client, request } = await parseAuthorizationRequest({
		response_type: 'code',
		client_id: body.client_id,
		redirect_uri: body.redirect_uri,
		scope: body.scope,
		state: body.state,
		code_challenge: body.code_challenge,
		code_challenge_method: body.code_challenge_method,
	})

	if (body.approved !== true) {
		const rejected = new URL(request.redirectUri)
		rejected.searchParams.set('error', 'access_denied')
		if (request.state) rejected.searchParams.set('state', request.state)
		return { redirectUri: rejected.toString() }
	}

	await grantOAuthClientAccess(user.id, client.id, request.scopes)
	const code = await createAuthorizationCode({
		userId: user.id,
		clientId: client.id,
		redirectUri: request.redirectUri,
		scopes: request.scopes,
		codeChallenge: request.codeChallenge,
	})

	return { redirectUri: createAuthorizationRedirect({ ...request, code }) }
})
