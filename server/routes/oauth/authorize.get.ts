import { getRequestURL, sendRedirect, setCookie } from 'h3'
import { randomBytes } from 'node:crypto'
import { getOptionalCurrentUserWithRefresh } from '../../utils/auth/session'
import {
	createAuthorizationCode,
	createAuthorizationRedirect,
	hasOAuthGrant,
	parseAuthorizationRequest,
} from '../../utils/oauth-provider/service'
import { getPublicSiteOrigin } from '../../utils/runtime/site-url'

export default defineEventHandler(async (event) => {
	const { client, request } = await parseAuthorizationRequest(getQuery(event))
	const user = await getOptionalCurrentUserWithRefresh(event)

	if (!user) {
		const redirect = `${getRequestURL(event).pathname}${getRequestURL(event).search}`
		return sendRedirect(
			event,
			`/login?redirect=${encodeURIComponent(redirect)}`,
			302,
		)
	}

	if (!(await hasOAuthGrant(user.id, client.id, request.scopes))) {
		const consentNonce = randomBytes(32).toString('base64url')
		setCookie(event, 'portal_oauth_consent', consentNonce, {
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			path: '/api/oauth/authorize/approve',
			maxAge: 10 * 60,
		})
		const consentUrl = new URL('/oauth/consent', getPublicSiteOrigin())
		consentUrl.searchParams.set('client_id', request.clientId)
		consentUrl.searchParams.set('client_name', client.name)
		consentUrl.searchParams.set('redirect_uri', request.redirectUri)
		consentUrl.searchParams.set('scope', request.scopes.join(' '))
		consentUrl.searchParams.set('code_challenge', request.codeChallenge)
		consentUrl.searchParams.set('code_challenge_method', 'S256')
		consentUrl.searchParams.set('consent_nonce', consentNonce)
		if (request.state) consentUrl.searchParams.set('state', request.state)
		return sendRedirect(event, consentUrl.toString(), 302)
	}

	const code = await createAuthorizationCode({
		userId: user.id,
		clientId: client.id,
		redirectUri: request.redirectUri,
		scopes: request.scopes,
		codeChallenge: request.codeChallenge,
	})

	return sendRedirect(
		event,
		createAuthorizationRedirect({ ...request, code }),
		302,
	)
})
