import type { RowDataPacket } from 'mysql2'
import type { Prisma } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import {
	hashSyncValue,
	syncLuckPermsPlayerToServerPlayer,
} from '../minecraft/server-player'
import { closeExternalMysqlPool } from './mysql'
import {
	createMysqlPoolFromSourceConfig,
	type EnabledLuckPermsSourceConfig,
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
	pool: ReturnType<typeof createMysqlPoolFromSourceConfig>,
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

export const syncLuckPermsSource = async (
	config: EnabledLuckPermsSourceConfig,
): Promise<ExternalSyncResult> => {
	const pool = createMysqlPoolFromSourceConfig(config)
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
			const result = await syncLuckPermsPlayerToServerPlayer({
				serverId: config.minecraftServer.serverId,
				uuid: row.uuid,
				username: row.username,
				primaryGroup: row.primary_group,
				syncedAt,
			})

			if (result.matched) {
				rowsMatched += 1
			}

			if (result.changed) {
				rowsChanged += 1
			}
		}

		for (const row of groups) {
			const raw = Object.fromEntries(Object.entries(row))
			const rawHash = hashSyncValue(raw)
			const existing = await prisma.minecraftServerLuckPermsGroup.findUnique({
				where: {
					serverId_name: {
						serverId: config.minecraftServer.serverId,
						name: row.name,
					},
				},
			})

			rowsMatched += 1

			if (existing?.rawHash === rawHash) {
				continue
			}

			await prisma.minecraftServerLuckPermsGroup.upsert({
				where: {
					serverId_name: {
						serverId: config.minecraftServer.serverId,
						name: row.name,
					},
				},
				create: {
					serverId: config.minecraftServer.serverId,
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

		await prisma.luckPermsSourceConfig.update({
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
			rowsRead: players.length + groups.length,
			rowsMatched,
			rowsChanged,
			rowsSkipped: Math.max(0, rowsMatched - rowsChanged),
			latencyMs,
		}
	} catch (error) {
		await prisma.luckPermsSourceConfig.update({
			where: {
				id: config.id,
			},
			data: {
				lastError:
					error instanceof Error
						? error.message
						: 'Unknown LuckPerms sync error',
			},
		})

		throw error
	} finally {
		await closeExternalMysqlPool(pool)
	}
}

export async function syncLuckPermsSnapshots(): Promise<ExternalSyncResult> {
	const configs = await prisma.luckPermsSourceConfig.findMany({
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
		const result = await syncLuckPermsSource(config)
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
