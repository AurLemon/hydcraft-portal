import {
	createHash,
	createPrivateKey,
	createPublicKey,
	createSign,
	createVerify,
} from 'node:crypto'
import type { User } from '~/generated/prisma/client'
import { createApiError } from '../errors'

interface OAuthTokenClaims {
	iss: string
	sub: string
	aud: string
	exp: number
	iat: number
	auth_time?: number
	nonce?: string
	scope?: string
	typ?: 'access_token' | 'id_token'
}

const getIssuer = (): string =>
	(
		process.env.OAUTH_ISSUER_URL ??
		process.env.NUXT_PUBLIC_SITE_URL ??
		'http://localhost:3000'
	).replace(/\/$/, '')

const getPrivateKey = () => {
	const value = process.env.OAUTH_SIGNING_PRIVATE_KEY?.replace(/\\n/g, '\n')
	if (!value)
		throw createApiError({ statusCode: 500, code: 'OAUTH_SIGNING_KEY_MISSING' })
	return createPrivateKey(value)
}

const encode = (value: unknown): string =>
	Buffer.from(JSON.stringify(value)).toString('base64url')

const getPublicKeyId = (
	publicKey: ReturnType<typeof createPublicKey>,
): string =>
	createHash('sha256')
		.update(
			publicKey.export({ type: 'spki', format: 'der' }).toString('base64url'),
		)
		.digest('base64url')

const sign = (payload: Record<string, unknown>): string => {
	const privateKey = getPrivateKey()
	const publicKey = createPublicKey(privateKey)
	const kid = getPublicKeyId(publicKey)
	const input = `${encode({ alg: 'RS256', typ: 'JWT', kid })}.${encode(payload)}`
	const signer = createSign('RSA-SHA256')
	signer.update(input)
	signer.end()
	return `${input}.${signer.sign(privateKey, 'base64url')}`
}

export const issueOAuthTokens = (input: {
	user: User
	clientId: string
	scopes: string[]
	nonce: string | null
}) => {
	const now = Math.floor(Date.now() / 1000)
	const accessExpiresIn = 900
	const base = {
		iss: getIssuer(),
		sub: input.user.id,
		aud: input.clientId,
		iat: now,
	}
	const accessToken = sign({
		...base,
		exp: now + accessExpiresIn,
		scope: input.scopes.join(' '),
		typ: 'access_token',
	})
	const idToken = sign({
		...base,
		exp: now + accessExpiresIn,
		auth_time: now,
		...(input.nonce ? { nonce: input.nonce } : {}),
		typ: 'id_token',
		hydroline_id: input.user.hydrolineId,
	})
	return { accessToken, idToken, expiresIn: accessExpiresIn }
}

export const verifyOAuthAccessToken = (token: string): OAuthTokenClaims => {
	const [header, body, signature] = token.split('.')
	if (!header || !body || !signature)
		throw createApiError({
			statusCode: 401,
			code: 'OAUTH_ACCESS_TOKEN_INVALID',
		})
	const verifier = createVerify('RSA-SHA256')
	verifier.update(`${header}.${body}`)
	verifier.end()
	if (
		!verifier.verify(createPublicKey(getPrivateKey()), signature, 'base64url')
	)
		throw createApiError({
			statusCode: 401,
			code: 'OAUTH_ACCESS_TOKEN_INVALID',
		})
	try {
		const claims = JSON.parse(
			Buffer.from(body, 'base64url').toString('utf8'),
		) as OAuthTokenClaims
		if (
			claims.iss !== getIssuer() ||
			claims.typ !== 'access_token' ||
			claims.exp <= Math.floor(Date.now() / 1000)
		)
			throw new Error('invalid')
		return claims
	} catch {
		throw createApiError({
			statusCode: 401,
			code: 'OAUTH_ACCESS_TOKEN_INVALID',
		})
	}
}

export const getOAuthDiscoveryDocument = () => {
	const issuer = getIssuer()
	return {
		issuer,
		authorization_endpoint: `${issuer}/oauth/authorize`,
		token_endpoint: `${issuer}/api/oauth/token`,
		userinfo_endpoint: `${issuer}/api/oauth/userinfo`,
		jwks_uri: `${issuer}/.well-known/jwks.json`,
		response_types_supported: ['code'],
		grant_types_supported: ['authorization_code'],
		code_challenge_methods_supported: ['S256'],
		scopes_supported: ['openid', 'profile', 'email', 'hydroline'],
		subject_types_supported: ['public'],
		claims_supported: [
			'sub',
			'aud',
			'exp',
			'iat',
			'iss',
			'auth_time',
			'nonce',
			'preferred_username',
			'name',
			'picture',
			'email',
			'email_verified',
			'hydroline_id',
		],
		token_endpoint_auth_methods_supported: [
			'client_secret_basic',
			'client_secret_post',
		],
		id_token_signing_alg_values_supported: ['RS256'],
	}
}

export const getOAuthJwks = () => {
	const publicKey = createPublicKey(getPrivateKey())
	const jwk = publicKey.export({ format: 'jwk' })
	const kid = getPublicKeyId(publicKey)
	return { keys: [{ ...jwk, use: 'sig', alg: 'RS256', kid }] }
}
