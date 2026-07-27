import { createHash, randomBytes } from 'node:crypto'
import type { Prisma } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { createApiError } from '../errors'
import { getOAuthIssuerUrl } from '../runtime/site-url'

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

type OAuthDbClient = Prisma.TransactionClient | typeof prisma

interface IssueOAuthAccessTokenInput {
	userId: string
	clientId: string
	scopes: string[]
	db?: OAuthDbClient
}

interface IssueOAuthRefreshTokenInput extends IssueOAuthAccessTokenInput {
	expiresAt?: Date
}

export interface OAuthTokenPair {
	accessToken: string
	accessTokenExpiresIn: number
	refreshToken: string
	refreshTokenExpiresIn: number
	scopes: string[]
}

const hashToken = (token: string): string =>
	createHash('sha256').update(token).digest('hex')

export const issueOAuthAccessToken = async (
	input: IssueOAuthAccessTokenInput,
): Promise<{ accessToken: string; expiresIn: number }> => {
	const accessToken = randomBytes(48).toString('base64url')
	const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS)
	const db = input.db ?? prisma

	await db.oAuthAccessToken.create({
		data: {
			tokenHash: hashToken(accessToken),
			userId: input.userId,
			clientId: input.clientId,
			scopes: input.scopes,
			expiresAt,
		},
	})

	return {
		accessToken,
		expiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
	}
}

export const issueOAuthRefreshToken = async (
	input: IssueOAuthRefreshTokenInput,
): Promise<{ refreshToken: string; expiresIn: number }> => {
	const refreshToken = randomBytes(64).toString('base64url')
	const expiresAt =
		input.expiresAt ?? new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
	const db = input.db ?? prisma

	await db.oAuthRefreshToken.create({
		data: {
			tokenHash: hashToken(refreshToken),
			userId: input.userId,
			clientId: input.clientId,
			scopes: input.scopes,
			expiresAt,
		},
	})

	return {
		refreshToken,
		expiresIn: Math.max(
			0,
			Math.floor((expiresAt.getTime() - Date.now()) / 1000),
		),
	}
}

export const issueOAuthTokenPair = async (
	input: IssueOAuthRefreshTokenInput,
): Promise<OAuthTokenPair> => {
	const accessToken = await issueOAuthAccessToken(input)
	const refreshToken = await issueOAuthRefreshToken(input)

	return {
		accessToken: accessToken.accessToken,
		accessTokenExpiresIn: accessToken.expiresIn,
		refreshToken: refreshToken.refreshToken,
		refreshTokenExpiresIn: refreshToken.expiresIn,
		scopes: input.scopes,
	}
}

export const exchangeOAuthRefreshToken = async (input: {
	refreshToken: string
	clientId: string
}): Promise<OAuthTokenPair> =>
	prisma.$transaction(async (tx) => {
		const now = new Date()
		const record = await tx.oAuthRefreshToken.findUnique({
			where: { tokenHash: hashToken(input.refreshToken) },
			include: { user: true, client: true },
		})
		const grant = record
			? await tx.oAuthClientGrant.findUnique({
					where: {
						clientId_userId: {
							clientId: record.clientId,
							userId: record.userId,
						},
					},
				})
			: null
		const hasCurrentAuthorization = Boolean(
			grant &&
			record?.scopes.every(
				(scope) =>
					grant.scopes.includes(scope) &&
					record.client.allowedScopes.includes(scope),
			),
		)

		if (
			!record ||
			record.revokedAt ||
			record.expiresAt <= now ||
			record.clientId !== input.clientId ||
			!record.client.enabled ||
			record.user.status !== 'ACTIVE' ||
			!hasCurrentAuthorization
		) {
			throw createApiError({
				statusCode: 401,
				code: 'OAUTH_REFRESH_TOKEN_INVALID',
			})
		}

		const revoked = await tx.oAuthRefreshToken.updateMany({
			where: { id: record.id, revokedAt: null },
			data: { revokedAt: now, lastUsedAt: now },
		})

		if (revoked.count !== 1) {
			throw createApiError({
				statusCode: 401,
				code: 'OAUTH_REFRESH_TOKEN_INVALID',
			})
		}

		return issueOAuthTokenPair({
			db: tx,
			userId: record.userId,
			clientId: record.clientId,
			scopes: record.scopes,
			expiresAt: record.expiresAt,
		})
	})

export const resolveOAuthAccessToken = async (accessToken: string) => {
	const record = await prisma.oAuthAccessToken.findUnique({
		where: { tokenHash: hashToken(accessToken) },
		include: { user: { include: { preferences: true } } },
	})

	if (
		!record ||
		record.revokedAt ||
		record.expiresAt <= new Date() ||
		record.user.status !== 'ACTIVE'
	) {
		throw createApiError({
			statusCode: 401,
			code: 'OAUTH_ACCESS_TOKEN_INVALID',
		})
	}

	await prisma.oAuthAccessToken.update({
		where: { id: record.id },
		data: { lastUsedAt: new Date() },
	})

	return record
}

const getIssuer = (): string => getOAuthIssuerUrl()

export const getOAuthDiscoveryDocument = () => {
	const issuer = getIssuer()
	return {
		issuer,
		authorization_endpoint: `${issuer}/oauth/authorize`,
		token_endpoint: `${issuer}/api/oauth/token`,
		userinfo_endpoint: `${issuer}/api/oauth/userinfo`,
		response_types_supported: ['code'],
		grant_types_supported: ['authorization_code', 'refresh_token'],
		code_challenge_methods_supported: ['S256'],
		scopes_supported: ['profile', 'email', 'hydroline', 'directory.read'],
		token_endpoint_auth_methods_supported: [
			'client_secret_basic',
			'client_secret_post',
		],
	}
}
