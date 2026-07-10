import { deleteCookie, getCookie, getHeader, setCookie, type H3Event } from 'h3'
import { createHash, randomBytes } from 'node:crypto'
import type {
	User,
	UserAuthActivitySource,
	UserProfileLanguage,
	UserRole,
	UserStatus,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { createApiError } from '../errors'
import { emitEvent } from '../events/event-bus'
import { getClientIpAddress } from '../ip-location/ip-normalizer'
import { signAuthToken, verifyAuthToken } from './jwt'

export interface UserSummary {
	id: string
	handle: string
	username: string
	hydrolineId: string
	displayName: string | null
	email: string | null
	avatarUrl: string | null
	coverUrl: string | null
	bio: string | null
	role: UserRole
	status: UserStatus
	lastLoginAt: Date | null
	createdAt: Date
	updatedAt: Date
	preferences: {
		language: UserProfileLanguage
	} | null
}

export type UserForSummary = User & {
	preferences?: {
		language: UserProfileLanguage
	} | null
}

// Portal sessions are intentionally host-only. Cross-site SSO is established
// through OAuth authorization redirects, never through a shared parent-domain
// session cookie.
export const AUTH_COOKIE_NAME = 'portal_auth'
export const REFRESH_COOKIE_NAME = 'portal_refresh'

const clearCookieByName = (event: H3Event, cookieName: string): void => {
	deleteCookie(event, cookieName, {
		path: '/',
	})
}

const ACCESS_TOKEN_MAX_AGE_SECONDS = Number(
	process.env.JWT_EXPIRES_IN_SECONDS ??
		process.env.AUTH_TOKEN_EXPIRES_IN_SECONDS ??
		900,
)
const REFRESH_TOKEN_MAX_AGE_SECONDS = Number(
	process.env.REFRESH_TOKEN_EXPIRES_IN_SECONDS ?? 2592000,
)

export const toUserSummary = (user: UserForSummary): UserSummary => ({
	id: user.id,
	handle: user.handle,
	username: user.username,
	hydrolineId: user.hydrolineId,
	displayName: user.displayName,
	email: user.email,
	avatarUrl: user.avatarUrl,
	coverUrl: user.coverUrl,
	bio: user.bio,
	role: user.role,
	status: user.status,
	lastLoginAt: user.lastLoginAt,
	createdAt: user.createdAt,
	updatedAt: user.updatedAt,
	preferences: user.preferences
		? {
				language: user.preferences.language,
			}
		: null,
})

export const issueAuthToken = (user: User): string =>
	signAuthToken({
		sub: user.id,
		role: user.role,
		status: user.status,
	})

export const setAuthCookie = (event: H3Event, token: string): void => {
	setCookie(event, AUTH_COOKIE_NAME, token, {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		path: '/',
		maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
	})
}

export const setRefreshCookie = (event: H3Event, token: string): void => {
	setCookie(event, REFRESH_COOKIE_NAME, token, {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		path: '/',
		maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
	})
}

export const clearAuthCookie = (event: H3Event): void => {
	clearCookieByName(event, AUTH_COOKIE_NAME)
}

export const clearRefreshCookie = (event: H3Event): void => {
	clearCookieByName(event, REFRESH_COOKIE_NAME)
}

export const clearAuthCookies = (event: H3Event): void => {
	clearAuthCookie(event)
	clearRefreshCookie(event)
}

export const getAuthTokenFromEvent = (event: H3Event): string | null => {
	const authorization = getHeader(event, 'authorization')

	if (authorization?.startsWith('Bearer ')) {
		return authorization.slice('Bearer '.length).trim()
	}

	return getCookie(event, AUTH_COOKIE_NAME) ?? null
}

export const getRefreshTokenFromEvent = (event: H3Event): string | null =>
	getCookie(event, REFRESH_COOKIE_NAME) ?? null

export const hashRefreshToken = (token: string): string =>
	createHash('sha256').update(token).digest('hex')

export const getRefreshTokenHashFromEvent = (event: H3Event): string | null => {
	const token = getRefreshTokenFromEvent(event)

	return token ? hashRefreshToken(token) : null
}

const createRefreshTokenValue = (): string =>
	randomBytes(48).toString('base64url')

export const issueRefreshToken = async (
	event: H3Event,
	user: User,
): Promise<string> => {
	const refreshToken = createRefreshTokenValue()
	const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_SECONDS * 1000)

	await prisma.refreshToken.create({
		data: {
			userId: user.id,
			tokenHash: hashRefreshToken(refreshToken),
			userAgent: getHeader(event, 'user-agent') ?? null,
			ipAddress: getClientIpAddress(event),
			expiresAt,
		},
	})

	return refreshToken
}

export const observeUserAuthActivity = async (input: {
	userId: string
	source: UserAuthActivitySource
	observedAt?: Date
}): Promise<void> => {
	await emitEvent('user.auth-activity.observed', {
		userId: input.userId,
		source: input.source,
		observedAt: input.observedAt ?? new Date(),
	})
}

export const issueAuthCookies = async (
	event: H3Event,
	user: User,
	source: UserAuthActivitySource = 'LOGIN',
): Promise<string> => {
	const token = issueAuthToken(user)
	const refreshToken = await issueRefreshToken(event, user)

	setAuthCookie(event, token)
	setRefreshCookie(event, refreshToken)
	await observeUserAuthActivity({
		userId: user.id,
		source,
	})

	return token
}

export const revokeRefreshToken = async (
	token: string | null,
): Promise<void> => {
	if (!token) {
		return
	}

	await prisma.refreshToken.updateMany({
		where: {
			tokenHash: hashRefreshToken(token),
			revokedAt: null,
		},
		data: {
			revokedAt: new Date(),
		},
	})
}

export const findCurrentRefreshSession = async (event: H3Event) => {
	const token = getRefreshTokenFromEvent(event)

	if (!token) {
		return null
	}

	return await prisma.refreshToken
		.findUnique({
			where: {
				tokenHash: hashRefreshToken(token),
			},
		})
		.then((session) => {
			if (!session || session.revokedAt || session.expiresAt <= new Date()) {
				return null
			}

			return session
		})
}

export const requireCurrentRefreshSession = async (event: H3Event) => {
	const session = await findCurrentRefreshSession(event)

	if (!session) {
		clearAuthCookies(event)
		throw createApiError({
			statusCode: 401,
			code: 'REFRESH_TOKEN_EXPIRED',
		})
	}

	return session
}

export const rotateRefreshToken = async (
	event: H3Event,
): Promise<{ token: string; user: User }> => {
	const refreshToken = getRefreshTokenFromEvent(event)

	if (!refreshToken) {
		throw createApiError({
			statusCode: 401,
			code: 'REFRESH_TOKEN_REQUIRED',
		})
	}

	const session = await prisma.refreshToken.findUnique({
		where: {
			tokenHash: hashRefreshToken(refreshToken),
		},
		include: {
			user: {
				include: {
					preferences: {
						select: {
							language: true,
						},
					},
				},
			},
		},
	})

	if (
		!session ||
		session.revokedAt ||
		session.expiresAt <= new Date() ||
		session.user.status !== 'ACTIVE'
	) {
		clearAuthCookies(event)
		throw createApiError({
			statusCode: 401,
			code: 'REFRESH_TOKEN_EXPIRED',
		})
	}

	await prisma.refreshToken.update({
		where: {
			id: session.id,
		},
		data: {
			revokedAt: new Date(),
		},
	})

	const token = await issueAuthCookies(event, session.user, 'REFRESH')

	return {
		token,
		user: session.user,
	}
}

export const requireCurrentUser = async (
	event: H3Event,
	options?: {
		observeActivity?: boolean
	},
): Promise<UserForSummary> => {
	const token = getAuthTokenFromEvent(event)
	const authorization = getHeader(event, 'authorization')

	if (!token) {
		throw createApiError({
			statusCode: 401,
			code: 'AUTHENTICATION_REQUIRED',
		})
	}

	const payload = verifyAuthToken(token)
	const user = await prisma.user.findUnique({
		where: {
			id: payload.sub,
		},
		include: {
			preferences: {
				select: {
					language: true,
				},
			},
		},
	})

	if (!user || user.status !== 'ACTIVE') {
		throw createApiError({
			statusCode: 401,
			code: 'AUTHENTICATION_REQUIRED',
		})
	}

	if (!authorization?.startsWith('Bearer ')) {
		const currentSession = await findCurrentRefreshSession(event)

		if (!currentSession || currentSession.userId !== user.id) {
			clearAuthCookies(event)
			throw createApiError({
				statusCode: 401,
				code: 'REFRESH_TOKEN_EXPIRED',
			})
		}
	}

	if (options?.observeActivity !== false) {
		await observeUserAuthActivity({
			userId: user.id,
			source: 'AUTHENTICATED_REQUEST',
		})
	}

	return user
}

export const requireAdminUser = async (event: H3Event): Promise<User> => {
	const user = await requireCurrentUser(event)

	if (user.role !== 'ADMIN' && user.role !== 'OWNER') {
		throw createApiError({ statusCode: 403, code: 'ADMIN_ROLE_REQUIRED' })
	}

	return user
}

export const getOptionalCurrentUser = async (
	event: H3Event,
): Promise<UserForSummary | null> => {
	const token = getAuthTokenFromEvent(event)
	const authorization = getHeader(event, 'authorization')

	if (!token) {
		return null
	}

	let payload

	try {
		payload = verifyAuthToken(token)
	} catch {
		return null
	}

	const user = await prisma.user.findUnique({
		where: {
			id: payload.sub,
		},
		include: {
			preferences: {
				select: {
					language: true,
				},
			},
		},
	})

	if (!user || user.status !== 'ACTIVE') {
		return null
	}

	if (!authorization?.startsWith('Bearer ')) {
		const currentSession = await findCurrentRefreshSession(event)

		if (!currentSession || currentSession.userId !== user.id) {
			clearAuthCookies(event)
			return null
		}
	}

	return user
}
