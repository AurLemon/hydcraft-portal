import type { RowDataPacket } from 'mysql2'
import type { Prisma } from '~/generated/prisma/client'
import { syncMinecraftAccountsFromAuthMeAccounts } from '../admin/players'
import { prisma } from '../db/prisma'
import { hashSyncValue } from '../minecraft/server-player'
import { normalizeMinecraftUsername } from '../minecraft/normalize'
import { closeExternalMysqlPool } from './mysql'
import {
	createMysqlPoolFromDatabaseUrl,
	readAuthMeSourceConfig,
} from './source-config'
import { parseUnixTimestamp } from './time'

interface AuthMeRow extends RowDataPacket {
	id: number
	username: string
	realname?: string | null
	password?: string | null
	lastlogin?: number | null
	regdate?: number | null
	email?: string | null
	regip?: string | null
	ip?: string | null
	hasTotp?: 0 | 1
}

interface ExternalSyncResult {
	serversRead: number
	rowsRead: number
	rowsMatched: number
	rowsChanged: number
	rowsSkipped: number
	latencyMs?: number | null
}

const AUTHME_COLUMNS = [
	'id',
	'username',
	'realname',
	'password',
	'lastlogin',
	'regdate',
	'email',
	'regip',
	'ip',
	'totp',
]

const normalizeOptionalString = (value: unknown): string | null => {
	if (typeof value !== 'string') {
		return null
	}

	const trimmed = value.trim()

	return trimmed || null
}

const getAuthMeTableColumns = async (
	pool: ReturnType<typeof createMysqlPoolFromDatabaseUrl>,
	database: string,
): Promise<Set<string>> => {
	const [rows] = await pool.query<
		Array<RowDataPacket & { COLUMN_NAME: string }>
	>(
		`
			SELECT COLUMN_NAME
			FROM INFORMATION_SCHEMA.COLUMNS
			WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'authme'
		`,
		[database],
	)

	return new Set(rows.map((row) => row.COLUMN_NAME))
}

const buildAuthMeSelect = (columns: Set<string>): string => {
	const selected = AUTHME_COLUMNS.filter((column) => columns.has(column))

	if (!selected.includes('id') || !selected.includes('username')) {
		throw new Error('AuthMe table must contain id and username columns.')
	}

	const fields = selected.map((column) => `\`${column}\``)

	if (columns.has('totp')) {
		fields.push(
			"CASE WHEN `totp` IS NULL OR `totp` = '' THEN 0 ELSE 1 END AS `hasTotp`",
		)
	}

	return `SELECT ${fields.join(', ')} FROM authme`
}

export const syncAuthMeSource = async (): Promise<ExternalSyncResult> => {
	const config = readAuthMeSourceConfig()

	if (!config.enabled || !config.databaseUrl) {
		return {
			serversRead: 0,
			rowsRead: 0,
			rowsMatched: 0,
			rowsChanged: 0,
			rowsSkipped: 0,
		}
	}

	const pool = createMysqlPoolFromDatabaseUrl(config.databaseUrl)
	let latencyMs: number | null = null

	try {
		const latencyStartedAt = Date.now()
		await pool.query('SELECT 1 AS ok')
		latencyMs = Date.now() - latencyStartedAt
		const columns = await getAuthMeTableColumns(pool, config.database)
		const [rows] = await pool.query<AuthMeRow[]>(buildAuthMeSelect(columns))
		const syncedAt = new Date()
		let rowsMatched = 0
		let rowsChanged = 0

		for (const row of rows) {
			const username = normalizeOptionalString(row.username)
			const realname = normalizeOptionalString(row.realname)
			const displayUsername = realname || username
			const normalizedUsername = normalizeMinecraftUsername(displayUsername)
			const raw = Object.fromEntries(Object.entries(row))

			if (!username || !normalizedUsername) {
				continue
			}

			const rawHash = hashSyncValue(raw)
			const existing = await prisma.authMeAccount.findUnique({
				where: {
					authmeId: row.id,
				},
				select: {
					id: true,
					rawHash: true,
				},
			})

			rowsMatched += 1

			if (existing?.rawHash === rawHash) {
				continue
			}

			await prisma.authMeAccount.upsert({
				where: {
					authmeId: row.id,
				},
				create: {
					authmeId: row.id,
					username,
					realname,
					normalizedUsername,
					email: normalizeOptionalString(row.email),
					registeredAt:
						row.regdate == null ? null : parseUnixTimestamp(row.regdate),
					lastLoginAt:
						row.lastlogin == null ? null : parseUnixTimestamp(row.lastlogin),
					registerIp: normalizeOptionalString(row.regip),
					lastIp: normalizeOptionalString(row.ip),
					hasTotp: row.hasTotp === 1,
					raw: raw as Prisma.InputJsonValue,
					rawHash,
					syncedAt,
				},
				update: {
					username,
					realname,
					normalizedUsername,
					email: normalizeOptionalString(row.email),
					registeredAt:
						row.regdate == null ? null : parseUnixTimestamp(row.regdate),
					lastLoginAt:
						row.lastlogin == null ? null : parseUnixTimestamp(row.lastlogin),
					registerIp: normalizeOptionalString(row.regip),
					lastIp: normalizeOptionalString(row.ip),
					hasTotp: row.hasTotp === 1,
					raw: raw as Prisma.InputJsonValue,
					rawHash,
					syncedAt,
				},
			})
			rowsChanged += 1
		}

		const accountSync = await syncMinecraftAccountsFromAuthMeAccounts()

		return {
			serversRead: 1,
			rowsRead: rows.length,
			rowsMatched,
			rowsChanged: rowsChanged + accountSync.changed,
			rowsSkipped: Math.max(0, rowsMatched - rowsChanged),
			latencyMs,
		}
	} finally {
		await closeExternalMysqlPool(pool)
	}
}

export async function syncAuthMeSnapshots(): Promise<ExternalSyncResult> {
	return await syncAuthMeSource()
}
