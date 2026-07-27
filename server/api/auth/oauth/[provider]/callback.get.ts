import { createHash } from 'node:crypto'
import { sendRedirect } from 'h3'
import type { Prisma, User } from '~/generated/prisma/client'
import { createRegistrationTicket } from '../../../../utils/auth/registration-ticket'
import { normalizePortalRedirectPath } from '../../../../../utils/auth/redirect'
import { issueAuthCookies } from '../../../../utils/auth/session'
import { normalizeEmail } from '../../../../utils/auth/validation'
import { prisma } from '../../../../utils/db/prisma'
import { createApiError, createBadRequestError } from '../../../../utils/errors'
import { queuePostCommitEvent } from '../../../../utils/events/post-commit'
import {
	getOAuthProviderConfig,
	parseOAuthProvider,
} from '../../../../utils/oauth/providers'
import {
	fetchOAuthAvatarAsset,
	syncOAuthAvatarAttachment,
} from '../../../../utils/oauth/avatar'
import { oauthProxyFetch } from '../../../../utils/oauth/proxy'
import { recordSecurityEvent } from '../../../../utils/security/security-events'

interface TokenResponse {
	access_token?: string
	scope?: string
	openid?: string
}

const hashState = (state: string): string =>
	createHash('sha256').update(state).digest('hex')

const normalizeOAuthEmail = (email: string | null): string | null => {
	const normalized = normalizeEmail(email)

	return normalized && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
		? normalized
		: null
}

const isValidProviderAccountId = (
	value: string | null | undefined,
): boolean => {
	if (!value) {
		return false
	}

	const normalized = value.trim().toLowerCase()

	return normalized !== 'undefined' && normalized !== 'null'
}

const getLocalizedRegisterPath = (locale: string): string => {
	switch (locale) {
		case 'ZH_TW':
			return '/zh-TW/register'
		case 'EN_US':
			return '/en-US/register'
		case 'JA_JP':
			return '/ja-JP/register'
		default:
			return '/register'
	}
}

const getSafeOAuthRedirectPath = (
	value: string | null | undefined,
	fallbackPath: string,
): string =>
	normalizePortalRedirectPath(value, {
		fallbackPath,
		loginPath: '/login',
	})

const parseTokenResponse = (value: unknown): TokenResponse => {
	if (typeof value === 'string') {
		const params = new URLSearchParams(value)
		return Object.fromEntries(params.entries()) as TokenResponse
	}

	return value as TokenResponse
}

const parseOAuthFetchResponse = async (
	response: Response,
): Promise<unknown> => {
	const contentType = response.headers.get('content-type') ?? ''
	const text = await response.text()

	if (!response.ok) {
		throw createApiError({
			statusCode: 502,
			code: 'OAUTH_UPSTREAM_REQUEST_FAILED',
			data: {
				status: response.status,
				message: text || response.statusText,
			},
		})
	}

	if (contentType.includes('application/json')) {
		return JSON.parse(text)
	}

	return text
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
		redirect_uri: config.redirectUri,
		grant_type: 'authorization_code',
	})
	const response = await oauthProxyFetch(
		config.tokenUrl,
		{
			method: 'POST',
			body,
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				accept: 'application/json',
			},
		},
		config.proxyEnabled,
	)
	const parsedResponse = await parseOAuthFetchResponse(response)

	return parseTokenResponse(parsedResponse)
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

const syncExternalAccountAvatar = async (input: {
	user?: User
	account: { id: string }
	provider: NonNullable<ReturnType<typeof parseOAuthProvider>>
	accessToken: string
	profileAvatarUrl: string | null
	proxyEnabled: boolean
	ownerType?: 'external-account' | 'registration-ticket'
	expiresAt?: Date
}): Promise<{
	synced: boolean
	avatarAttachmentId: string | null
	avatarUrl: string | null
}> => {
	try {
		const asset = await fetchOAuthAvatarAsset({
			provider: input.provider,
			accessToken: input.accessToken,
			avatarUrl: input.profileAvatarUrl,
			proxyEnabled: input.proxyEnabled,
		})
		const result = await syncOAuthAvatarAttachment({
			user: input.user,
			account: input.account,
			ownerType: input.ownerType,
			expiresAt: input.expiresAt,
			asset,
		})

		return {
			synced: true,
			...result,
		}
	} catch (error) {
		console.error('OAUTH_AVATAR_SYNC_FAILED', error)

		return {
			synced: false,
			avatarAttachmentId: null,
			avatarUrl: null,
		}
	}
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
		stateToken.expiresAt <= new Date()
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

	const qqOpenId =
		provider === 'QQ'
			? (token.openid ?? (await fetchQQOpenId(accessToken)))
			: null

	const rawProfile =
		provider === 'QQ'
			? {
					...(await $fetch<Prisma.InputJsonObject>(config.userUrl, {
						query: {
							access_token: accessToken,
							oauth_consumer_key: config.clientId,
							openid: qqOpenId!,
						},
					})),
					openid: qqOpenId,
				}
			: ((await parseOAuthFetchResponse(
					await oauthProxyFetch(
						config.userUrl,
						{
							headers: {
								authorization: `Bearer ${accessToken}`,
								accept: 'application/json',
							},
						},
						config.proxyEnabled,
					),
				)) as Prisma.InputJsonObject)

	const profile = config.mapProfile(rawProfile)

	if (!isValidProviderAccountId(profile.id)) {
		throw createApiError({
			statusCode: 502,
			code: 'OAUTH_PROFILE_INVALID',
			data: {
				provider,
				providerAccountId: profile.id,
			},
		})
	}

	const existing = await prisma.externalAccount.findUnique({
		where: {
			provider_providerAccountId: {
				provider,
				providerAccountId: profile.id,
			},
		},
	})

	if (existing && stateToken.userId && existing.userId !== stateToken.userId) {
		throw createApiError({
			statusCode: 409,
			code: 'OAUTH_ACCOUNT_ALREADY_LINKED',
		})
	}

	if (existing && !stateToken.userId) {
		const user = await prisma.user.update({
			where: {
				id: existing.userId,
			},
			data: {
				lastLoginAt: new Date(),
			},
		})

		if (user.status !== 'ACTIVE') {
			throw createApiError({ statusCode: 401, code: 'INVALID_CREDENTIALS' })
		}

		await prisma.externalAccount.update({
			where: {
				id: existing.id,
			},
			data: {
				providerUsername: profile.username,
				providerEmail: profile.email,
				scope: token.scope ?? config.scopes.join(' '),
				rawProfile: profile.raw,
				lastUsedAt: new Date(),
			},
		})
		const syncedAvatar = await syncExternalAccountAvatar({
			user,
			account: existing,
			provider,
			accessToken,
			profileAvatarUrl: profile.avatarUrl,
			proxyEnabled: config.proxyEnabled,
		})

		if (syncedAvatar.synced) {
			await prisma.externalAccount.update({
				where: {
					id: existing.id,
				},
				data: {
					avatarAttachmentId: syncedAvatar.avatarAttachmentId,
					avatarUrl: syncedAvatar.avatarUrl,
				},
			})
			queuePostCommitEvent('user.oauth.attachment-replaced', {
				userId: user.id,
				externalAccountId: existing.id,
				activeAttachmentId: syncedAvatar.avatarAttachmentId,
			})
		}
		await prisma.oAuthStateToken.update({
			where: { id: stateToken.id },
			data: { consumedAt: new Date() },
		})
		await issueAuthCookies(event, user)
		await recordSecurityEvent({
			event,
			userId: user.id,
			type: 'LOGIN_SUCCESS',
			title: `${provider} OAuth login`,
			description: profile.username,
		})

		return sendRedirect(
			event,
			getSafeOAuthRedirectPath(stateToken.redirectTo, '/me/profile'),
			302,
		)
	}

	if (!stateToken.userId) {
		const { ticket, token: registrationToken } = await createRegistrationTicket(
			{
				kind: 'OAUTH',
				oauthProvider: provider,
				payload: {
					providerAccountId: profile.id,
					providerUsername: profile.username,
					providerEmail: normalizeOAuthEmail(profile.email),
					avatarUrl: profile.avatarUrl,
					accessToken,
					scope: token.scope ?? config.scopes.join(' '),
					rawProfile: profile.raw,
				},
			},
		)
		const syncedAvatar = await syncExternalAccountAvatar({
			account: {
				id: ticket.id,
			},
			provider,
			accessToken,
			profileAvatarUrl: profile.avatarUrl,
			proxyEnabled: config.proxyEnabled,
			ownerType: 'registration-ticket',
			expiresAt: ticket.expiresAt,
		})

		if (syncedAvatar.synced) {
			await prisma.authRegistrationTicket.update({
				where: {
					id: ticket.id,
				},
				data: {
					payload: {
						providerAccountId: profile.id,
						providerUsername: profile.username,
						providerEmail: normalizeOAuthEmail(profile.email),
						avatarAttachmentId: syncedAvatar.avatarAttachmentId,
						avatarUrl: syncedAvatar.avatarUrl,
						accessToken,
						scope: token.scope ?? config.scopes.join(' '),
						rawProfile: profile.raw,
					},
				},
			})
		}
		await prisma.oAuthStateToken.update({
			where: { id: stateToken.id },
			data: { consumedAt: new Date() },
		})
		const redirectTo = stateToken.redirectTo
			? getSafeOAuthRedirectPath(stateToken.redirectTo, '/me/profile')
			: ''
		const registerPath = getLocalizedRegisterPath(stateToken.locale)
		const params = new URLSearchParams({
			mode: 'oauth',
			ticket: registrationToken,
		})

		if (redirectTo) {
			params.set('redirect', redirectTo)
		}

		return sendRedirect(event, `${registerPath}?${params.toString()}`, 302)
	}

	if (!stateToken.user) {
		throw createBadRequestError('OAUTH_STATE_INVALID')
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
	const replacedAccounts = await prisma.externalAccount.findMany({
		where: {
			userId: stateToken.userId!,
			provider,
			id: {
				not: account.id,
			},
		},
	})

	if (replacedAccounts.length) {
		await prisma.externalAccount.deleteMany({
			where: {
				id: {
					in: replacedAccounts.map((item) => item.id),
				},
			},
		})

		for (const replacedAccount of replacedAccounts) {
			queuePostCommitEvent('user.oauth.unlinked', {
				userId: stateToken.userId!,
				provider,
				externalAccountId: replacedAccount.id,
				avatarAttachmentId: replacedAccount.avatarAttachmentId,
				avatarUrl: replacedAccount.avatarUrl,
			})
		}
	}
	const syncedAvatar = await syncExternalAccountAvatar({
		user: stateToken.user,
		account,
		provider,
		accessToken,
		profileAvatarUrl: profile.avatarUrl,
		proxyEnabled: config.proxyEnabled,
	})

	if (syncedAvatar.synced) {
		await prisma.externalAccount.update({
			where: {
				id: account.id,
			},
			data: {
				avatarAttachmentId: syncedAvatar.avatarAttachmentId,
				avatarUrl: syncedAvatar.avatarUrl,
			},
		})
		queuePostCommitEvent('user.oauth.attachment-replaced', {
			userId: stateToken.userId!,
			externalAccountId: account.id,
			activeAttachmentId: syncedAvatar.avatarAttachmentId,
		})
	}

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
	return sendRedirect(
		event,
		getSafeOAuthRedirectPath(
			stateToken.redirectTo,
			'/me/connections?oauth=linked',
		),
		302,
	)
})
