import { createHash } from 'node:crypto'
import { sendRedirect } from 'h3'
import type { Prisma, User } from '~/generated/prisma/client'
import { issueAuthCookies } from '../../../../utils/auth/session'
import { normalizeEmail } from '../../../../utils/auth/validation'
import { prisma } from '../../../../utils/db/prisma'
import { createApiError, createBadRequestError } from '../../../../utils/errors'
import { emitEvent } from '../../../../utils/events/event-bus'
import {
	getOAuthProviderConfig,
	parseOAuthProvider,
} from '../../../../utils/oauth/providers'
import {
	fetchOAuthAvatarAsset,
	syncOAuthAvatarAttachment,
} from '../../../../utils/oauth/avatar'
import { oauthProxyFetch } from '../../../../utils/oauth/proxy'
import {
	createUniqueHydrolineId,
	ensureUserProfileDefaults,
} from '../../../../utils/profile/defaults'
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

const createHandleBase = (
	provider: string,
	profile: { id: string; username: string | null; email: string | null },
): string => {
	const raw = profile.username ?? profile.email?.split('@')[0] ?? profile.id
	const normalized = raw
		.toLowerCase()
		.replace(/[^a-z0-9_-]/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 24)
	const base = /^[a-z0-9_]/.test(normalized)
		? normalized
		: `${provider.toLowerCase()}-${normalized}`

	return base.length >= 3 ? base : `${provider.toLowerCase()}-${profile.id}`
}

const createUniqueOAuthHandle = async (
	provider: string,
	profile: { id: string; username: string | null; email: string | null },
): Promise<string> => {
	const base = createHandleBase(provider, profile).slice(0, 24)

	for (let attempt = 0; attempt < 8; attempt += 1) {
		const suffix =
			attempt === 0 ? '' : `-${Math.floor(1000 + Math.random() * 9000)}`
		const handle = `${base.slice(0, 32 - suffix.length)}${suffix}`
		const exists = await prisma.user.findFirst({
			where: {
				OR: [{ handle }, { username: handle }],
			},
			select: {
				id: true,
			},
		})

		if (!exists) {
			return handle
		}
	}

	throw createApiError({
		statusCode: 500,
		code: 'OAUTH_USER_HANDLE_CREATE_FAILED',
	})
}

const resolveAvailableOAuthEmail = async (
	email: string | null,
): Promise<string | null> => {
	const normalized = normalizeOAuthEmail(email)

	if (!normalized) {
		return null
	}

	const [user, userEmail] = await Promise.all([
		prisma.user.findUnique({
			where: { email: normalized },
			select: { id: true },
		}),
		prisma.userEmail.findUnique({
			where: { email: normalized },
			select: { id: true },
		}),
	])

	return user || userEmail ? null : normalized
}

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
	user: User
	account: { id: string }
	provider: NonNullable<ReturnType<typeof parseOAuthProvider>>
	accessToken: string
	profileAvatarUrl: string | null
	proxyEnabled: boolean
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

	const rawProfile =
		provider === 'QQ'
			? await $fetch<Prisma.InputJsonObject>(config.userUrl, {
					query: {
						access_token: accessToken,
						oauth_consumer_key: config.clientId,
						openid: token.openid ?? (await fetchQQOpenId(accessToken)),
					},
				})
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
			await emitEvent('user.oauth.attachment-replaced', {
				userId: user.id,
				externalAccountId: existing.id,
				activeAttachmentId: syncedAvatar.avatarAttachmentId,
				updatedAt: new Date(),
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

		return sendRedirect(event, stateToken.redirectTo || '/me/profile', 302)
	}

	if (!stateToken.userId) {
		const handle = await createUniqueOAuthHandle(provider, profile)
		const email = await resolveAvailableOAuthEmail(profile.email)
		const hydrolineId = await createUniqueHydrolineId()
		const user = await prisma.user.create({
			data: {
				handle,
				username: handle,
				hydrolineId,
				displayName: profile.username,
				email,
				avatarUrl: profile.avatarUrl,
				role: 'USER',
				status: 'ACTIVE',
				externalAccounts: {
					create: {
						provider,
						providerAccountId: profile.id,
						providerUsername: profile.username,
						providerEmail: profile.email,
						avatarUrl: profile.avatarUrl,
						scope: token.scope ?? config.scopes.join(' '),
						rawProfile: profile.raw,
						lastUsedAt: new Date(),
					},
				},
				emails: email
					? {
							create: {
								email,
								kind: 'PRIMARY',
								verifiedAt: null,
							},
						}
					: undefined,
			},
			include: {
				externalAccounts: true,
			},
		})
		const account = user.externalAccounts[0]

		if (!account) {
			throw createApiError({
				statusCode: 500,
				code: 'OAUTH_ACCOUNT_CREATE_FAILED',
			})
		}

		const syncedAvatar = await syncExternalAccountAvatar({
			user,
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
			await emitEvent('user.oauth.attachment-replaced', {
				userId: user.id,
				externalAccountId: account.id,
				activeAttachmentId: syncedAvatar.avatarAttachmentId,
				updatedAt: new Date(),
			})
		}

		await ensureUserProfileDefaults(user.id)
		await prisma.oAuthStateToken.update({
			where: { id: stateToken.id },
			data: { consumedAt: new Date() },
		})
		await issueAuthCookies(event, user)
		await recordSecurityEvent({
			event,
			userId: user.id,
			type: 'LOGIN_SUCCESS',
			title: `${provider} OAuth registration`,
			description: profile.username,
		})
		await emitEvent('user.oauth.linked', {
			userId: user.id,
			provider,
			providerAccountId: profile.id,
			externalAccountId: account.id,
			updatedAt: new Date(),
		})

		return sendRedirect(event, stateToken.redirectTo || '/me/profile', 302)
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
			await emitEvent('user.oauth.unlinked', {
				userId: stateToken.userId!,
				provider,
				externalAccountId: replacedAccount.id,
				avatarAttachmentId: replacedAccount.avatarAttachmentId,
				avatarUrl: replacedAccount.avatarUrl,
				updatedAt: new Date(),
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
		await emitEvent('user.oauth.attachment-replaced', {
			userId: stateToken.userId!,
			externalAccountId: account.id,
			activeAttachmentId: syncedAvatar.avatarAttachmentId,
			updatedAt: new Date(),
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
	await emitEvent('user.oauth.linked', {
		userId: stateToken.userId!,
		provider,
		providerAccountId: account.providerAccountId,
		externalAccountId: account.id,
		updatedAt: new Date(),
	})

	return sendRedirect(
		event,
		stateToken.redirectTo || '/me/connections?oauth=linked',
		302,
	)
})
