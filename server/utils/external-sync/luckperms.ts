import type { RowDataPacket } from 'mysql2'
import type { Prisma } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { hashSyncValue } from '../minecraft/server-player'
import { normalizeMinecraftUsername } from '../minecraft/normalize'
import { closeExternalMysqlPool } from './mysql'
import {
	createMysqlPoolFromDatabaseUrl,
	readLuckPermsSourceConfig,
} from './source-config'

interface LuckPermsPlayerRow extends RowDataPacket {
	uuid: string
	username: string
	primary_group: string
}

interface LuckPermsGroupRow extends RowDataPacket {
	name: string
}

interface ExternalSyncResult {
	serversRead: number
	rowsRead: number
	rowsMatched: number
	rowsChanged: number
	rowsSkipped: number
	latencyMs?: number | null
}

const LUCKPERMS_GROUP_COLUMNS = [
	'name',
	'priority',
	'weight',
	'friendly_name',
	'display_name',
]

const getLuckPermsTableColumns = async (
	pool: ReturnType<typeof createMysqlPoolFromDatabaseUrl>,
	database: string,
	table: string,
): Promise<Set<string>> => {
	const [rows] = await pool.query<
		Array<RowDataPacket & { COLUMN_NAME: string }>
	>(
		`
			SELECT COLUMN_NAME
			FROM INFORMATION_SCHEMA.COLUMNS
			WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
		`,
		[database, table],
	)

	return new Set(rows.map((row) => row.COLUMN_NAME))
}

const buildLuckPermsGroupSelect = (columns: Set<string>): string | null => {
	if (!columns.has('name')) {
		return null
	}

	const selected = LUCKPERMS_GROUP_COLUMNS.filter((column) =>
		columns.has(column),
	)
	const fields = selected.map((column) => `\`${column}\``)

	return `SELECT ${fields.join(', ')} FROM luckperms_groups`
}

export const syncLuckPermsSource = async (): Promise<ExternalSyncResult> => {
	const config = readLuckPermsSourceConfig()

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
		const [players] = await pool.query<LuckPermsPlayerRow[]>(`
			SELECT uuid, username, primary_group
			FROM luckperms_players
		`)
		const groupColumns = await getLuckPermsTableColumns(
			pool,
			config.database,
			'luckperms_groups',
		)
		const groupSelect = buildLuckPermsGroupSelect(groupColumns)
		const [groups] = groupSelect
			? await pool.query<LuckPermsGroupRow[]>(groupSelect)
			: [[] as LuckPermsGroupRow[]]
		const syncedAt = new Date()
		let rowsMatched = 0
		let rowsChanged = 0

		for (const row of players) {
			const raw = Object.fromEntries(Object.entries(row))
			const rawHash = hashSyncValue(raw)
			const existing = await prisma.luckPermsPlayer.findUnique({
				where: {
					uuid: row.uuid,
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

			await prisma.luckPermsPlayer.upsert({
				where: {
					uuid: row.uuid,
				},
				create: {
					uuid: row.uuid,
					username: row.username,
					normalizedUsername: normalizeMinecraftUsername(row.username),
					primaryGroup: row.primary_group,
					raw: raw as Prisma.InputJsonValue,
					rawHash,
					syncedAt,
				},
				update: {
					username: row.username,
					normalizedUsername: normalizeMinecraftUsername(row.username),
					primaryGroup: row.primary_group,
					raw: raw as Prisma.InputJsonValue,
					rawHash,
					syncedAt,
				},
			})
			rowsChanged += 1
		}

		for (const row of groups) {
			const raw = Object.fromEntries(Object.entries(row))
			const rawHash = hashSyncValue(raw)
			const existing = await prisma.luckPermsGroup.findUnique({
				where: {
					name: row.name,
				},
			})

			rowsMatched += 1

			if (existing?.rawHash === rawHash) {
				continue
			}

			await prisma.luckPermsGroup.upsert({
				where: {
					name: row.name,
				},
				create: {
					name: row.name,
					raw: raw as Prisma.InputJsonValue,
					rawHash,
					syncedAt,
				},
				update: {
					raw: raw as Prisma.InputJsonValue,
					rawHash,
					syncedAt,
				},
			})
			rowsChanged += 1
		}

		return {
			serversRead: 1,
			rowsRead: players.length + groups.length,
			rowsMatched,
			rowsChanged,
			rowsSkipped: Math.max(0, rowsMatched - rowsChanged),
			latencyMs,
		}
	} finally {
		await closeExternalMysqlPool(pool)
	}
}

export async function syncLuckPermsSnapshots(): Promise<ExternalSyncResult> {
	return await syncLuckPermsSource()
}
