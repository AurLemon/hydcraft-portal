import { createHash } from 'node:crypto'
import { sendRedirect } from 'h3'
import type { Prisma } from '~/generated/prisma/client'
import { issueAuthCookies } from '../../../../utils/auth/session'
import { prisma } from '../../../../utils/db/prisma'
import { createApiError, createBadRequestError } from '../../../../utils/errors'
import { emitEvent } from '../../../../utils/events/event-bus'
import {
	getOAuthProviderConfig,
	getOAuthRedirectUri,
	parseOAuthProvider,
} from '../../../../utils/oauth/providers'
import { recordSecurityEvent } from '../../../../utils/security/security-events'

interface TokenResponse {
	access_token?: string
	scope?: string
	openid?: string
}

const hashState = (state: string): string =>
	createHash('sha256').update(state).digest('hex')

const parseTokenResponse = (value: unknown): TokenResponse => {
	if (typeof value === 'string') {
		const params = new URLSearchParams(value)
		return Object.fromEntries(params.entries()) as TokenResponse
	}

	return value as TokenResponse
}

const fetchOAuthToken = async (
	provider: NonNullable<ReturnType<typeof parseOAuthProvider>>,
	code: string,
): Promise<TokenResponse> => {
	const config = getOAuthProviderConfig(provider)

	if (!config) {
		throw createApiError({
			statusCode: 503,
			code: 'OAUTH_PROVIDER_NOT_CONFIGURED',
		})
	}

	const body = new URLSearchParams({
		client_id: config.clientId,
		client_secret: config.clientSecret,
		code,
		redirect_uri: getOAuthRedirectUri(provider),
		grant_type: 'authorization_code',
	})
	const response = await $fetch<unknown>(config.tokenUrl, {
		method: 'POST',
		body,
		headers: {
			accept: 'application/json',
		},
	})

	return parseTokenResponse(response)
}

const fetchQQOpenId = async (accessToken: string): Promise<string> => {
	const response = await $fetch<string>('https://graph.qq.com/oauth2.0/me', {
		query: {
			access_token: accessToken,
			fmt: 'json',
		},
	})
	const parsed = JSON.parse(response) as { openid?: string }

	if (!parsed.openid) {
		throw createApiError({
			statusCode: 502,
			code: 'OAUTH_PROFILE_INVALID',
		})
	}

	return parsed.openid
}

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

	const query = getQuery(event)
	const code = typeof query.code === 'string' ? query.code : null
	const state = typeof query.state === 'string' ? query.state : null

	if (!code || !state) {
		throw createBadRequestError('OAUTH_CALLBACK_INVALID')
	}

	const stateToken = await prisma.oAuthStateToken.findUnique({
		where: {
			stateHash: hashState(state),
		},
		include: {
			user: true,
		},
	})

	if (
		!stateToken ||
		stateToken.provider !== provider ||
		stateToken.consumedAt ||
		stateToken.expiresAt <= new Date() ||
		!stateToken.user
	) {
		throw createBadRequestError('OAUTH_STATE_INVALID')
	}

	const token = await fetchOAuthToken(provider, code)
	const accessToken = token.access_token

	if (!accessToken) {
		throw createApiError({
			statusCode: 502,
			code: 'OAUTH_TOKEN_INVALID',
		})
	}

	const rawProfile =
		provider === 'QQ'
			? await $fetch<Prisma.InputJsonObject>(config.userUrl, {
					query: {
						access_token: accessToken,
						oauth_consumer_key: config.clientId,
						openid: token.openid ?? (await fetchQQOpenId(accessToken)),
					},
				})
			: await $fetch<Prisma.InputJsonObject>(config.userUrl, {
					headers: {
						authorization: `Bearer ${accessToken}`,
						accept: 'application/json',
					},
				})

	const profile = config.mapProfile(rawProfile)
	const existing = await prisma.externalAccount.findUnique({
		where: {
			provider_providerAccountId: {
				provider,
				providerAccountId: profile.id,
			},
		},
	})

	if (existing && existing.userId !== stateToken.userId) {
		throw createApiError({
			statusCode: 409,
			code: 'OAUTH_ACCOUNT_ALREADY_LINKED',
		})
	}

	const account = await prisma.externalAccount.upsert({
		where: {
			provider_providerAccountId: {
				provider,
				providerAccountId: profile.id,
			},
		},
		create: {
			userId: stateToken.userId!,
			provider,
			providerAccountId: profile.id,
			providerUsername: profile.username,
			providerEmail: profile.email,
			avatarUrl: profile.avatarUrl,
			scope: token.scope ?? config.scopes.join(' '),
			rawProfile: profile.raw,
			lastUsedAt: new Date(),
		},
		update: {
			providerUsername: profile.username,
			providerEmail: profile.email,
			avatarUrl: profile.avatarUrl,
			scope: token.scope ?? config.scopes.join(' '),
			rawProfile: profile.raw,
			lastUsedAt: new Date(),
		},
	})

	await prisma.oAuthStateToken.update({
		where: {
			id: stateToken.id,
		},
		data: {
			consumedAt: new Date(),
		},
	})
	await issueAuthCookies(event, stateToken.user)
	await recordSecurityEvent({
		event,
		userId: stateToken.userId!,
		type: 'OAUTH_LINKED',
		title: `${provider} 已绑定`,
		description: profile.username,
		metadata: {
			provider,
			providerAccountId: profile.id,
		},
	})
	await emitEvent('user.oauth.linked', {
		userId: stateToken.userId!,
		provider,
		providerAccountId: account.providerAccountId,
		updatedAt: new Date(),
	})

	return sendRedirect(
		event,
		stateToken.redirectTo || '/me/connections?oauth=linked',
		302,
	)
})
