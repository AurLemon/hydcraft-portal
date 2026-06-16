import type { RowDataPacket } from 'mysql2'
import type { Prisma } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { syncAuthMePlayerToServerPlayer } from '../minecraft/server-player'
import { closeExternalMysqlPool } from './mysql'
import {
	createMysqlPoolFromSourceConfig,
	type EnabledAuthMeSourceConfig,
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

const detectPasswordAlgorithm = (hash: string | null): string | null => {
	if (!hash) {
		return null
	}

	if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
		return 'BCRYPT'
	}

	if (hash.startsWith('$argon2')) {
		return 'ARGON2'
	}

	if (hash.includes('$SHA$')) {
		return 'AUTHME_SHA'
	}

	return 'UNKNOWN'
}

const getAuthMeTableColumns = async (
	pool: ReturnType<typeof createMysqlPoolFromSourceConfig>,
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

export const syncAuthMeSource = async (
	config: EnabledAuthMeSourceConfig,
): Promise<ExternalSyncResult> => {
	const pool = createMysqlPoolFromSourceConfig(config)
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
			const raw = Object.fromEntries(Object.entries(row))

			if (!username) {
				continue
			}

			const passwordHash = normalizeOptionalString(row.password)
			const result = await syncAuthMePlayerToServerPlayer({
				serverId: config.minecraftServer.serverId,
				authmeId: row.id,
				username,
				realname,
				email: normalizeOptionalString(row.email),
				registeredAt:
					row.regdate == null ? null : parseUnixTimestamp(row.regdate),
				lastLoginAt:
					row.lastlogin == null ? null : parseUnixTimestamp(row.lastlogin),
				registerIp: normalizeOptionalString(row.regip),
				lastIp: normalizeOptionalString(row.ip),
				hasTotp: row.hasTotp === 1,
				passwordHash,
				passwordAlgorithm: detectPasswordAlgorithm(passwordHash),
				raw: raw as Prisma.InputJsonValue,
				syncedAt,
			})

			if (result.matched) {
				rowsMatched += 1
			}

			if (result.changed) {
				rowsChanged += 1
			}
		}

		await prisma.authMeSourceConfig.update({
			where: {
				id: config.id,
			},
			data: {
				lastSyncAt: syncedAt,
				lastError: null,
			},
		})

		return {
			serversRead: 1,
			rowsRead: rows.length,
			rowsMatched,
			rowsChanged,
			rowsSkipped: Math.max(0, rowsMatched - rowsChanged),
			latencyMs,
		}
	} catch (error) {
		await prisma.authMeSourceConfig.update({
			where: {
				id: config.id,
			},
			data: {
				lastError:
					error instanceof Error ? error.message : 'Unknown AuthMe sync error',
			},
		})

		throw error
	} finally {
		await closeExternalMysqlPool(pool)
	}
}

export async function syncAuthMeSnapshots(): Promise<ExternalSyncResult> {
	const configs = await prisma.authMeSourceConfig.findMany({
		where: {
			enabled: true,
			minecraftServer: {
				enabled: true,
			},
		},
		include: {
			minecraftServer: {
				select: {
					serverId: true,
				},
			},
		},
	})

	let rowsRead = 0
	let rowsMatched = 0
	let rowsChanged = 0
	let rowsSkipped = 0

	for (const config of configs) {
		const result = await syncAuthMeSource(config)
		rowsRead += result.rowsRead
		rowsMatched += result.rowsMatched
		rowsChanged += result.rowsChanged
		rowsSkipped += result.rowsSkipped
	}

	return {
		serversRead: configs.length,
		rowsRead,
		rowsMatched,
		rowsChanged,
		rowsSkipped,
	}
}
