import { createHash, randomBytes } from 'node:crypto'
import type { OAuthClient, User } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { createApiError } from '../errors'
import { emitEvent } from '../events/event-bus'
import { hashPassword, verifyPassword } from '../auth/password'

export const oauthSupportedScopes = [
	'openid',
	'profile',
	'email',
	'hydroline',
	'directory.read',
] as const

export type OAuthScope = (typeof oauthSupportedScopes)[number]

export interface OAuthClientSummary {
	id: string
	clientId: string
	name: string
	redirectUris: string[]
	allowedScopes: string[]
	enabled: boolean
	createdAt: Date
	updatedAt: Date
}

export interface OAuthAuthorizationRequest {
	clientId: string
	redirectUri: string
	scopes: OAuthScope[]
	state: string | null
	nonce: string | null
	codeChallenge: string
}

const AUTHORIZATION_CODE_TTL_MS = 5 * 60 * 1000
const CLIENT_ID_PREFIX = 'hydcraft_'

const toOAuthClientSummary = (client: OAuthClient): OAuthClientSummary => ({
	id: client.id,
	clientId: client.clientId,
	name: client.name,
	redirectUris: client.redirectUris,
	allowedScopes: client.allowedScopes,
	enabled: client.enabled,
	createdAt: client.createdAt,
	updatedAt: client.updatedAt,
})

const getRequiredString = (value: unknown, code: string): string => {
	if (typeof value !== 'string' || !value.trim()) {
		throw createApiError({ statusCode: 400, code })
	}

	return value.trim()
}

const normalizeScope = (value: string | null | undefined): OAuthScope[] => {
	const scopes = (value ?? 'openid').split(/\s+/).filter(Boolean)

	if (
		!scopes.length ||
		scopes.some((scope) => !oauthSupportedScopes.includes(scope as OAuthScope))
	) {
		throw createApiError({ statusCode: 400, code: 'OAUTH_SCOPE_INVALID' })
	}

	return [...new Set(scopes)] as OAuthScope[]
}

const normalizeNonce = (value: unknown): string | null => {
	if (typeof value !== 'string' || !value.trim()) return null

	const nonce = value.trim()
	if (nonce.length > 255) {
		throw createApiError({ statusCode: 400, code: 'OAUTH_NONCE_INVALID' })
	}

	return nonce
}

const getEnabledClient = async (clientId: string): Promise<OAuthClient> => {
	const client = await prisma.oAuthClient.findUnique({ where: { clientId } })

	if (!client || !client.enabled) {
		throw createApiError({ statusCode: 400, code: 'OAUTH_CLIENT_INVALID' })
	}

	return client
}

const validateRedirectUri = (
	client: OAuthClient,
	redirectUri: string,
): void => {
	if (!client.redirectUris.includes(redirectUri)) {
		throw createApiError({
			statusCode: 400,
			code: 'OAUTH_REDIRECT_URI_INVALID',
		})
	}
}

const validateScopes = (client: OAuthClient, scopes: OAuthScope[]): void => {
	if (scopes.some((scope) => !client.allowedScopes.includes(scope))) {
		throw createApiError({ statusCode: 400, code: 'OAUTH_SCOPE_INVALID' })
	}
}

export const parseAuthorizationRequest = async (
	query: Record<string, unknown>,
): Promise<{ client: OAuthClient; request: OAuthAuthorizationRequest }> => {
	if (query.response_type !== 'code') {
		throw createApiError({
			statusCode: 400,
			code: 'OAUTH_RESPONSE_TYPE_INVALID',
		})
	}

	const clientId = getRequiredString(
		query.client_id,
		'OAUTH_CLIENT_ID_REQUIRED',
	)
	const redirectUri = getRequiredString(
		query.redirect_uri,
		'OAUTH_REDIRECT_URI_REQUIRED',
	)
	const codeChallenge = getRequiredString(
		query.code_challenge,
		'OAUTH_PKCE_REQUIRED',
	)

	if (
		query.code_challenge_method !== 'S256' ||
		!/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge)
	) {
		throw createApiError({ statusCode: 400, code: 'OAUTH_PKCE_INVALID' })
	}

	const client = await getEnabledClient(clientId)
	validateRedirectUri(client, redirectUri)
	const scopes = normalizeScope(
		typeof query.scope === 'string' ? query.scope : null,
	)
	if (!scopes.includes('openid')) {
		throw createApiError({ statusCode: 400, code: 'OAUTH_SCOPE_INVALID' })
	}
	validateScopes(client, scopes)

	return {
		client,
		request: {
			clientId,
			redirectUri,
			scopes,
			state:
				typeof query.state === 'string' && query.state ? query.state : null,
			nonce: normalizeNonce(query.nonce),
			codeChallenge,
		},
	}
}

export const hasOAuthGrant = async (
	userId: string,
	clientId: string,
	scopes: OAuthScope[],
): Promise<boolean> => {
	const grant = await prisma.oAuthClientGrant.findUnique({
		where: { clientId_userId: { clientId, userId } },
	})

	return Boolean(grant && scopes.every((scope) => grant.scopes.includes(scope)))
}

export const grantOAuthClientAccess = async (
	userId: string,
	clientId: string,
	scopes: OAuthScope[],
): Promise<void> => {
	const grant = await prisma.oAuthClientGrant.upsert({
		where: { clientId_userId: { clientId, userId } },
		create: { userId, clientId, scopes },
		update: { scopes },
	})
	await emitEvent('oauth.client.granted', {
		clientId,
		userId,
		scopes: grant.scopes,
		grantedAt: grant.grantedAt,
	})
}

export const createAuthorizationCode = async (input: {
	userId: string
	clientId: string
	redirectUri: string
	scopes: OAuthScope[]
	nonce: string | null
	codeChallenge: string
}): Promise<string> => {
	const code = randomBytes(48).toString('base64url')

	await prisma.oAuthAuthorizationCode.create({
		data: {
			codeHash: createHash('sha256').update(code).digest('hex'),
			userId: input.userId,
			clientId: input.clientId,
			redirectUri: input.redirectUri,
			scopes: input.scopes,
			nonce: input.nonce,
			codeChallenge: input.codeChallenge,
			codeChallengeMethod: 'S256',
			expiresAt: new Date(Date.now() + AUTHORIZATION_CODE_TTL_MS),
		},
	})

	return code
}

export const createAuthorizationRedirect = (input: {
	redirectUri: string
	code: string
	state: string | null
}): string => {
	const url = new URL(input.redirectUri)
	url.searchParams.set('code', input.code)

	if (input.state) {
		url.searchParams.set('state', input.state)
	}

	return url.toString()
}

export const consumeAuthorizationCode = async (input: {
	code: string
	clientId: string
	redirectUri: string
	codeVerifier: string
}): Promise<{
	user: User & {
		preferences: { language: 'ZH_CN' | 'ZH_TW' | 'EN_US' | 'JA_JP' } | null
	}
	scopes: string[]
	nonce: string | null
}> => {
	if (!/^[A-Za-z0-9._~-]{43,128}$/.test(input.codeVerifier)) {
		throw createApiError({ statusCode: 400, code: 'OAUTH_PKCE_INVALID' })
	}

	const codeHash = createHash('sha256').update(input.code).digest('hex')
	const record = await prisma.oAuthAuthorizationCode.findUnique({
		where: { codeHash },
		include: { user: { include: { preferences: true } }, client: true },
	})

	if (
		!record ||
		record.consumedAt ||
		record.expiresAt <= new Date() ||
		record.client.clientId !== input.clientId ||
		record.redirectUri !== input.redirectUri
	) {
		throw createApiError({
			statusCode: 400,
			code: 'OAUTH_AUTHORIZATION_CODE_INVALID',
		})
	}

	const challenge = createHash('sha256')
		.update(input.codeVerifier)
		.digest('base64url')

	if (challenge !== record.codeChallenge) {
		throw createApiError({ statusCode: 400, code: 'OAUTH_PKCE_INVALID' })
	}

	const updated = await prisma.oAuthAuthorizationCode.updateMany({
		where: { id: record.id, consumedAt: null },
		data: { consumedAt: new Date() },
	})

	if (updated.count !== 1) {
		throw createApiError({
			statusCode: 400,
			code: 'OAUTH_AUTHORIZATION_CODE_INVALID',
		})
	}

	return { user: record.user, scopes: record.scopes, nonce: record.nonce }
}

export const authenticateOAuthClient = async (input: {
	clientId: string
	clientSecret: string
}): Promise<OAuthClient> => {
	const client = await getEnabledClient(input.clientId)

	if (!(await verifyPassword(input.clientSecret, client.clientSecretHash))) {
		throw createApiError({
			statusCode: 401,
			code: 'OAUTH_CLIENT_AUTHENTICATION_FAILED',
		})
	}

	return client
}

export const createOAuthClient = async (input: {
	name: unknown
	redirectUris: unknown
	allowedScopes: unknown
}): Promise<{ client: OAuthClientSummary; clientSecret: string }> => {
	const name = getRequiredString(input.name, 'OAUTH_CLIENT_NAME_REQUIRED')
	const redirectUris = Array.isArray(input.redirectUris)
		? input.redirectUris.filter(
				(value): value is string => typeof value === 'string',
			)
		: []
	const allowedScopes = Array.isArray(input.allowedScopes)
		? input.allowedScopes.filter(
				(value): value is OAuthScope =>
					typeof value === 'string' &&
					oauthSupportedScopes.includes(value as OAuthScope),
			)
		: []

	if (
		!redirectUris.length ||
		redirectUris.some((uri) => !isValidRedirectUri(uri))
	) {
		throw createApiError({
			statusCode: 400,
			code: 'OAUTH_REDIRECT_URI_INVALID',
		})
	}

	if (!allowedScopes.includes('openid')) {
		throw createApiError({ statusCode: 400, code: 'OAUTH_SCOPE_INVALID' })
	}

	const clientSecret = randomBytes(36).toString('base64url')
	const client = await prisma.oAuthClient.create({
		data: {
			clientId: `${CLIENT_ID_PREFIX}${randomBytes(18).toString('base64url')}`,
			clientSecretHash: await hashPassword(clientSecret),
			name: name.slice(0, 120),
			redirectUris: [...new Set(redirectUris)],
			allowedScopes: [...new Set(allowedScopes)],
		},
	})
	await emitEvent('oauth.client.created', {
		clientId: client.id,
		createdAt: client.createdAt,
	})

	return { client: toOAuthClientSummary(client), clientSecret }
}

const isValidRedirectUri = (value: string): boolean => {
	try {
		const url = new URL(value)
		const isLoopbackHost =
			url.hostname === 'localhost' ||
			url.hostname === '127.0.0.1' ||
			url.hostname === '[::1]'
		return (
			url.protocol === 'https:' || (url.protocol === 'http:' && isLoopbackHost)
		)
	} catch {
		return false
	}
}

export const listOAuthClients = async (): Promise<OAuthClientSummary[]> =>
	(await prisma.oAuthClient.findMany({ orderBy: { createdAt: 'desc' } })).map(
		toOAuthClientSummary,
	)

export const deleteOAuthClient = async (id: string): Promise<void> => {
	const client = await prisma.oAuthClient.findUnique({ where: { id } })
	if (!client)
		throw createApiError({ statusCode: 404, code: 'OAUTH_CLIENT_NOT_FOUND' })

	await prisma.oAuthClient.delete({ where: { id } })
	await emitEvent('oauth.client.deleted', {
		clientId: client.id,
		deletedAt: new Date(),
	})
}

export const updateOAuthClient = async (
	id: string,
	input: {
		name?: unknown
		redirectUris?: unknown
		allowedScopes?: unknown
		enabled?: unknown
	},
): Promise<OAuthClientSummary> => {
	const existing = await prisma.oAuthClient.findUnique({ where: { id } })
	if (!existing)
		throw createApiError({ statusCode: 404, code: 'OAUTH_CLIENT_NOT_FOUND' })

	const patch: {
		name?: string
		redirectUris?: string[]
		allowedScopes?: OAuthScope[]
		enabled?: boolean
	} = {}
	if (input.name !== undefined)
		patch.name = getRequiredString(
			input.name,
			'OAUTH_CLIENT_NAME_REQUIRED',
		).slice(0, 120)
	if (input.redirectUris !== undefined) {
		if (
			!Array.isArray(input.redirectUris) ||
			!input.redirectUris.length ||
			input.redirectUris.some(
				(uri) => typeof uri !== 'string' || !isValidRedirectUri(uri),
			)
		) {
			throw createApiError({
				statusCode: 400,
				code: 'OAUTH_REDIRECT_URI_INVALID',
			})
		}
		patch.redirectUris = [...new Set(input.redirectUris)] as string[]
	}
	if (input.allowedScopes !== undefined) {
		const scopes = Array.isArray(input.allowedScopes)
			? input.allowedScopes.filter(
					(scope): scope is OAuthScope =>
						typeof scope === 'string' &&
						oauthSupportedScopes.includes(scope as OAuthScope),
				)
			: []
		if (!scopes.includes('openid'))
			throw createApiError({ statusCode: 400, code: 'OAUTH_SCOPE_INVALID' })
		patch.allowedScopes = [...new Set(scopes)]
	}
	if (input.enabled !== undefined) {
		if (typeof input.enabled !== 'boolean')
			throw createApiError({ statusCode: 400, code: 'INVALID_FIELD_TYPE' })
		patch.enabled = input.enabled
	}

	const client = await prisma.oAuthClient.update({ where: { id }, data: patch })
	await emitEvent('oauth.client.updated', {
		clientId: client.id,
		updatedAt: client.updatedAt,
	})
	return toOAuthClientSummary(client)
}
