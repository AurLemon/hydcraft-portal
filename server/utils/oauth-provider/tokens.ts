import { createHash, randomBytes } from 'node:crypto'
import { prisma } from '../db/prisma'
import { createApiError } from '../errors'

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000

const hashToken = (token: string): string =>
	createHash('sha256').update(token).digest('hex')

export const issueOAuthAccessToken = async (input: {
	userId: string
	clientId: string
	scopes: string[]
}): Promise<{ accessToken: string; expiresIn: number }> => {
	const accessToken = randomBytes(48).toString('base64url')
	const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS)

	await prisma.oAuthAccessToken.create({
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

const getIssuer = (): string =>
	(
		process.env.OAUTH_ISSUER_URL ??
		process.env.NUXT_PUBLIC_SITE_URL ??
		'http://localhost:3000'
	).replace(/\/$/, '')

export const getOAuthDiscoveryDocument = () => {
	const issuer = getIssuer()
	return {
		issuer,
		authorization_endpoint: `${issuer}/oauth/authorize`,
		token_endpoint: `${issuer}/api/oauth/token`,
		userinfo_endpoint: `${issuer}/api/oauth/userinfo`,
		response_types_supported: ['code'],
		grant_types_supported: ['authorization_code'],
		code_challenge_methods_supported: ['S256'],
		scopes_supported: ['profile', 'email', 'hydroline', 'directory.read'],
		token_endpoint_auth_methods_supported: [
			'client_secret_basic',
			'client_secret_post',
		],
	}
}
