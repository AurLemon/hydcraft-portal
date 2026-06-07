import {
	createError,
	deleteCookie,
	getCookie,
	getHeader,
	getRequestIP,
	setCookie,
	type H3Event,
} from 'h3'
import { createHash, randomBytes } from 'node:crypto'
import type { User, UserRole, UserStatus } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { signAuthToken, verifyAuthToken } from './jwt'

export interface UserSummary {
	id: string
	handle: string
	displayName: string | null
	email: string | null
	avatarUrl: string | null
	bio: string | null
	role: UserRole
	status: UserStatus
	title: string | null
	lastLoginAt: Date | null
	createdAt: Date
	updatedAt: Date
}

export const AUTH_COOKIE_NAME = 'hydcraft_auth'
export const REFRESH_COOKIE_NAME = 'hydcraft_refresh'

const ACCESS_TOKEN_MAX_AGE_SECONDS = Number(
	process.env.JWT_EXPIRES_IN_SECONDS ??
		process.env.AUTH_TOKEN_EXPIRES_IN_SECONDS ??
		900,
)
const REFRESH_TOKEN_MAX_AGE_SECONDS = Number(
	process.env.REFRESH_TOKEN_EXPIRES_IN_SECONDS ?? 2592000,
)

export const toUserSummary = (user: User): UserSummary => ({
	id: user.id,
	handle: user.handle,
	displayName: user.displayName,
	email: user.email,
	avatarUrl: user.avatarUrl,
	bio: user.bio,
	role: user.role,
	status: user.status,
	title: user.title,
	lastLoginAt: user.lastLoginAt,
	createdAt: user.createdAt,
	updatedAt: user.updatedAt,
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
	deleteCookie(event, AUTH_COOKIE_NAME, {
		path: '/',
	})
}

export const clearRefreshCookie = (event: H3Event): void => {
	deleteCookie(event, REFRESH_COOKIE_NAME, {
		path: '/',
	})
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

const hashRefreshToken = (token: string): string =>
	createHash('sha256').update(token).digest('hex')

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
			ipAddress: getRequestIP(event, { xForwardedFor: true }) ?? null,
			expiresAt,
		},
	})

	return refreshToken
}

export const issueAuthCookies = async (
	event: H3Event,
	user: User,
): Promise<string> => {
	const token = issueAuthToken(user)
	const refreshToken = await issueRefreshToken(event, user)

	setAuthCookie(event, token)
	setRefreshCookie(event, refreshToken)

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

export const rotateRefreshToken = async (
	event: H3Event,
): Promise<{ token: string; user: User }> => {
	const refreshToken = getRefreshTokenFromEvent(event)

	if (!refreshToken) {
		throw createError({
			statusCode: 401,
			statusMessage: 'Refresh token required',
		})
	}

	const session = await prisma.refreshToken.findUnique({
		where: {
			tokenHash: hashRefreshToken(refreshToken),
		},
		include: {
			user: true,
		},
	})

	if (
		!session ||
		session.revokedAt ||
		session.expiresAt <= new Date() ||
		session.user.status !== 'ACTIVE'
	) {
		clearAuthCookies(event)
		throw createError({
			statusCode: 401,
			statusMessage: 'Refresh token expired',
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

	const token = await issueAuthCookies(event, session.user)

	return {
		token,
		user: session.user,
	}
}

export const requireCurrentUser = async (event: H3Event): Promise<User> => {
	const token = getAuthTokenFromEvent(event)

	if (!token) {
		throw createError({
			statusCode: 401,
			statusMessage: 'Authentication required',
		})
	}

	const payload = verifyAuthToken(token)
	const user = await prisma.user.findUnique({
		where: {
			id: payload.sub,
		},
	})

	if (!user || user.status !== 'ACTIVE') {
		throw createError({
			statusCode: 401,
			statusMessage: 'Authentication required',
		})
	}

	return user
}

export const requireAdminUser = async (event: H3Event): Promise<User> => {
	const user = await requireCurrentUser(event)

	if (user.role !== 'ADMIN' && user.role !== 'OWNER') {
		throw createError({ statusCode: 403, statusMessage: 'Admin role required' })
	}

	return user
}
