import { createHmac, timingSafeEqual } from 'node:crypto'
import type { UserRole, UserStatus } from '~/generated/prisma/enums'

export interface AuthTokenPayload {
	sub: string
	role: UserRole
	status: UserStatus
	iat?: number
	exp?: number
}

const getJwtSecret = (): string => {
	const secret = process.env.JWT_SECRET

	if (!secret) {
		throw createError({
			statusCode: 500,
			statusMessage: 'JWT_SECRET is required',
		})
	}

	return secret
}

const encodeJson = (value: unknown): string =>
	Buffer.from(JSON.stringify(value)).toString('base64url')

const signInput = (input: string): string =>
	createHmac('sha256', getJwtSecret()).update(input).digest('base64url')

export const signAuthToken = (payload: AuthTokenPayload): string => {
	const now = Math.floor(Date.now() / 1000)
	const expiresIn = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 604800)
	const header = encodeJson({ alg: 'HS256', typ: 'JWT' })
	const body = encodeJson({
		...payload,
		iat: now,
		exp: now + expiresIn,
	})
	const input = `${header}.${body}`

	return `${input}.${signInput(input)}`
}

export const verifyAuthToken = (token: string): AuthTokenPayload => {
	const [header, body, signature] = token.split('.')

	if (!header || !body || !signature) {
		throw createError({ statusCode: 401, statusMessage: 'Invalid auth token' })
	}

	const expected = Uint8Array.from(
		Buffer.from(signInput(`${header}.${body}`), 'base64url'),
	)
	const actual = Uint8Array.from(Buffer.from(signature, 'base64url'))

	if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
		throw createError({ statusCode: 401, statusMessage: 'Invalid auth token' })
	}

	const payload = JSON.parse(
		Buffer.from(body, 'base64url').toString('utf8'),
	) as AuthTokenPayload
	const now = Math.floor(Date.now() / 1000)

	if (!payload.sub || !payload.role || !payload.status) {
		throw createError({ statusCode: 401, statusMessage: 'Invalid auth token' })
	}

	if (payload.exp && payload.exp <= now) {
		throw createError({ statusCode: 401, statusMessage: 'Auth token expired' })
	}

	return payload
}
