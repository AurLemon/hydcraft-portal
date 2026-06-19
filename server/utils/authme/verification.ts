import type { RowDataPacket } from 'mysql2'
import type { Prisma } from '~/generated/prisma/client'
import {
	createExternalMysqlPool,
	closeExternalMysqlPool,
} from '../external-sync/mysql'
import { normalizeMinecraftUsername } from '../minecraft/normalize'
import { createApiError, createBadRequestError } from '../errors'
import { verifyAuthMeShaPassword } from './password'
import { readAuthMeVerificationConfig } from './runtime'

interface AuthMeVerificationRow extends RowDataPacket {
	id: number
	username: string
	realname?: string | null
	password?: string | null
	lastlogin?: number | null
	regdate?: number | null
	email?: string | null
	regip?: string | null
	ip?: string | null
	totp?: string | null
}

export interface VerifiedAuthMeAccount {
	authmeId: number
	username: string
	realname: string | null
	normalizedUsername: string
	displayName: string
	email: string | null
	passwordHash: string
	registeredAt: Date | null
	lastLoginAt: Date | null
	registerIp: string | null
	lastIp: string | null
	hasTotp: boolean
	raw: Prisma.InputJsonValue
}

const AUTHME_USERNAME_PATTERN = /^[a-z0-9_]{3,16}$/

const parseUnixTimestamp = (value: number | null | undefined): Date | null => {
	if (value == null || !Number.isFinite(value) || value <= 0) {
		return null
	}

	const ms = value > 10_000_000_000 ? value : value * 1000

	return new Date(ms)
}

const normalizeOptionalString = (value: unknown): string | null => {
	if (typeof value !== 'string') {
		return null
	}

	const trimmed = value.trim()

	return trimmed || null
}

export const normalizeAuthMeUsername = (value: string): string => {
	const normalized = normalizeMinecraftUsername(value) ?? ''

	if (!AUTHME_USERNAME_PATTERN.test(normalized)) {
		throw createBadRequestError('MINECRAFT_USERNAME_INVALID')
	}

	return normalized
}

const normalizeVerifiedAuthMeAccount = (
	row: AuthMeVerificationRow,
): VerifiedAuthMeAccount => {
	const username = normalizeOptionalString(row.username)
	const normalizedUsername = normalizeMinecraftUsername(username)

	if (!username || !normalizedUsername || !row.password) {
		throw createApiError({
			statusCode: 500,
			code: 'AUTHME_ACCOUNT_INVALID',
		})
	}

	const realname = normalizeOptionalString(row.realname)

	return {
		authmeId: row.id,
		username,
		realname,
		normalizedUsername,
		displayName: realname || username,
		email: normalizeOptionalString(row.email),
		passwordHash: row.password,
		registeredAt: parseUnixTimestamp(row.regdate),
		lastLoginAt: parseUnixTimestamp(row.lastlogin),
		registerIp: normalizeOptionalString(row.regip),
		lastIp: normalizeOptionalString(row.ip),
		hasTotp: Boolean(normalizeOptionalString(row.totp)),
		raw: JSON.parse(JSON.stringify(row)) as Prisma.InputJsonValue,
	}
}

const readAuthMeAccountByUsername = async (
	username: string,
): Promise<VerifiedAuthMeAccount | null> => {
	const config = readAuthMeVerificationConfig()

	if (!config.enabled || !config.databaseUrl) {
		throw createApiError({
			statusCode: 503,
			code: 'AUTHME_VERIFICATION_UNAVAILABLE',
		})
	}

	const pool = createExternalMysqlPool(config.databaseUrl)

	try {
		const [rows] = await pool.query<AuthMeVerificationRow[]>(
			`SELECT * FROM \`${config.tableName}\` WHERE LOWER(username) = LOWER(?) LIMIT 1`,
			[username],
		)

		if (!rows.length) {
			return null
		}

		const row = rows[0]
		if (!row) {
			return null
		}

		return normalizeVerifiedAuthMeAccount(row)
	} finally {
		await closeExternalMysqlPool(pool)
	}
}

export const readVerifiedAuthMeAccountByUsername = async (
	usernameInput: string,
): Promise<VerifiedAuthMeAccount | null> => {
	const username = normalizeAuthMeUsername(usernameInput)

	return await readAuthMeAccountByUsername(username)
}

export const verifyAuthMeCredentials = async (
	usernameInput: string,
	password: string,
): Promise<VerifiedAuthMeAccount> => {
	const username = normalizeAuthMeUsername(usernameInput)
	const account = await readAuthMeAccountByUsername(username)

	if (!account) {
		throw createApiError({
			statusCode: 404,
			code: 'AUTHME_ACCOUNT_NOT_FOUND',
		})
	}

	if (!verifyAuthMeShaPassword(account.passwordHash, password)) {
		throw createApiError({
			statusCode: 401,
			code: 'AUTHME_PASSWORD_INVALID',
		})
	}

	return account
}
