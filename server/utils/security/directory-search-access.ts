import { deleteCookie, getCookie, setCookie, type H3Event } from 'h3'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createApiError } from '../errors'
import { getClientIpAddress } from '../ip-location/ip-normalizer'

interface DirectorySearchAccessPayload {
	scope: 'server-directory-search'
	ip: string | null
	exp: number
}

const DIRECTORY_SEARCH_ACCESS_COOKIE_NAME = 'hydcraft_directory_search_access'
const DIRECTORY_SEARCH_ACCESS_MAX_AGE_SECONDS = 15 * 60

const getDirectorySearchSecret = (): string => {
	const secret = process.env.JWT_SECRET

	if (!secret) {
		throw createApiError({
			statusCode: 500,
			code: 'JWT_SECRET_MISSING',
		})
	}

	return secret
}

const encodePayload = (payload: DirectorySearchAccessPayload): string =>
	Buffer.from(JSON.stringify(payload)).toString('base64url')

const signPayload = (encodedPayload: string): string =>
	createHmac('sha256', getDirectorySearchSecret())
		.update(encodedPayload)
		.digest('base64url')

const issueDirectorySearchAccessToken = (event: H3Event): string => {
	const now = Math.floor(Date.now() / 1000)
	const payload: DirectorySearchAccessPayload = {
		scope: 'server-directory-search',
		ip: getClientIpAddress(event),
		exp: now + DIRECTORY_SEARCH_ACCESS_MAX_AGE_SECONDS,
	}
	const encodedPayload = encodePayload(payload)

	return `${encodedPayload}.${signPayload(encodedPayload)}`
}

const readDirectorySearchAccessPayload = (
	token: string,
): DirectorySearchAccessPayload | null => {
	const [encodedPayload, signature] = token.split('.')

	if (!encodedPayload || !signature) {
		return null
	}

	const expected = Uint8Array.from(
		Buffer.from(signPayload(encodedPayload), 'base64url'),
	)
	const actual = Uint8Array.from(Buffer.from(signature, 'base64url'))

	if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
		return null
	}

	try {
		return JSON.parse(
			Buffer.from(encodedPayload, 'base64url').toString('utf8'),
		) as DirectorySearchAccessPayload
	} catch {
		return null
	}
}

export const grantDirectorySearchAccess = (event: H3Event): void => {
	setCookie(
		event,
		DIRECTORY_SEARCH_ACCESS_COOKIE_NAME,
		issueDirectorySearchAccessToken(event),
		{
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			path: '/api/public/server',
			maxAge: DIRECTORY_SEARCH_ACCESS_MAX_AGE_SECONDS,
		},
	)
}

export const clearDirectorySearchAccess = (event: H3Event): void => {
	deleteCookie(event, DIRECTORY_SEARCH_ACCESS_COOKIE_NAME, {
		path: '/api/public/server',
	})
}

export const requireDirectorySearchAccess = (event: H3Event): void => {
	const token = getCookie(event, DIRECTORY_SEARCH_ACCESS_COOKIE_NAME)

	if (!token) {
		throw createApiError({
			statusCode: 403,
			code: 'DIRECTORY_SEARCH_CAPTCHA_REQUIRED',
		})
	}

	const payload = readDirectorySearchAccessPayload(token)
	const now = Math.floor(Date.now() / 1000)
	const currentIp = getClientIpAddress(event)

	if (
		!payload ||
		payload.scope !== 'server-directory-search' ||
		payload.exp <= now ||
		payload.ip !== currentIp
	) {
		clearDirectorySearchAccess(event)
		throw createApiError({
			statusCode: 403,
			code: 'DIRECTORY_SEARCH_CAPTCHA_REQUIRED',
		})
	}
}
