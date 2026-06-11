import { createHash, randomBytes } from 'node:crypto'
import { sendRedirect } from 'h3'
import { normalizeMailLocale } from '../../../../utils/auth/locale'
import { requireCurrentUser } from '../../../../utils/auth/session'
import { prisma } from '../../../../utils/db/prisma'
import { createApiError, createBadRequestError } from '../../../../utils/errors'
import {
	getOAuthProviderConfig,
	getOAuthRedirectUri,
	parseOAuthProvider,
} from '../../../../utils/oauth/providers'

const hashState = (state: string): string =>
	createHash('sha256').update(state).digest('hex')

export default defineEventHandler(async (event) => {
	const provider = parseOAuthProvider(getRouterParam(event, 'provider'))

	if (!provider) {
		throw createBadRequestError('OAUTH_PROVIDER_INVALID')
	}

	const config = getOAuthProviderConfig(provider)

	if (!config) {
		throw createApiError({
			statusCode: 503,
			code: 'OAUTH_PROVIDER_NOT_CONFIGURED',
		})
	}

	const user = await requireCurrentUser(event)
	const query = getQuery(event)
	const state = randomBytes(32).toString('base64url')

	await prisma.oAuthStateToken.create({
		data: {
			userId: user.id,
			provider,
			stateHash: hashState(state),
			redirectTo:
				typeof query.redirectTo === 'string' ? query.redirectTo : null,
			locale: normalizeMailLocale(
				typeof query.locale === 'string' ? query.locale : null,
				user.preferences?.language ?? 'ZH_CN',
			),
			expiresAt: new Date(Date.now() + 10 * 60 * 1000),
		},
	})

	const url = new URL(config.authorizeUrl)
	url.searchParams.set('client_id', config.clientId)
	url.searchParams.set('redirect_uri', getOAuthRedirectUri(provider))
	url.searchParams.set('response_type', 'code')
	url.searchParams.set('state', state)
	url.searchParams.set('scope', config.scopes.join(' '))

	return sendRedirect(event, url.toString(), 302)
})
