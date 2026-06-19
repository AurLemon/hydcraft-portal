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

interface LuckPermsUserPermissionRow extends RowDataPacket {
	id: number
	uuid: string
	permission: string
	value: number | boolean
	server: string
	world: string
	expiry: number | bigint | string
	contexts: string
}

interface LuckPermsGroupPermissionRow extends RowDataPacket {
	id: number
	name: string
	permission: string
	value: number | boolean
	server: string
	world: string
	expiry: number | bigint | string
	contexts: string
}

interface LuckPermsActionRow extends RowDataPacket {
	id: number
	time: number | bigint | string
	actor_uuid: string
	actor_name: string
	type: string
	acted_uuid: string
	acted_name: string
	action: string
}

interface LuckPermsTrackRow extends RowDataPacket {
	name: string
	groups: string
}

interface LuckPermsMessengerRow extends RowDataPacket {
	id: number
	time: Date | string
	msg: string
}

interface ExternalSyncResult {
	serversRead: number
	rowsRead: number
	rowsMatched: number
	rowsChanged: number
	rowsSkipped: number
	latencyMs?: number | null
}

type MysqlPool = ReturnType<typeof createMysqlPoolFromDatabaseUrl>

const getLuckPermsTableColumns = async (
	pool: MysqlPool,
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

const buildSelectAllQuery = (
	table: string,
	columns: Set<string>,
): string | null => {
	if (!columns.size) {
		return null
	}

	return `SELECT ${[...columns].map((column) => `\`${column}\``).join(', ')} FROM ${table}`
}

const toJsonSafe = (value: unknown): Prisma.InputJsonValue | null => {
	if (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	) {
		return value
	}

	if (typeof value === 'bigint') {
		return value.toString()
	}

	if (value instanceof Date) {
		return value.toISOString()
	}

	if (Array.isArray(value)) {
		return value.map((entry) => toJsonSafe(entry))
	}

	if (typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, entry]) => [key, toJsonSafe(entry)]),
		) as Prisma.InputJsonObject
	}

	return String(value)
}

const createRawSnapshot = (row: RowDataPacket): Prisma.InputJsonValue =>
	toJsonSafe(Object.fromEntries(Object.entries(row))) as Prisma.InputJsonValue

const parseBoolean = (value: number | boolean): boolean =>
	typeof value === 'boolean' ? value : value !== 0

const parseBigInt = (value: number | bigint | string): bigint => BigInt(value)

const parseDate = (value: Date | string): Date =>
	value instanceof Date ? value : new Date(value)

const syncLuckPermsPlayers = async (
	rows: LuckPermsPlayerRow[],
	syncedAt: Date,
) => {
	let rowsMatched = 0
	let rowsChanged = 0

	for (const row of rows) {
		const raw = createRawSnapshot(row)
		const rawHash = hashSyncValue(raw)
		const existing = await prisma.luckPermsPlayer.findUnique({
			where: {
				uuid: row.uuid,
			},
			select: {
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
				raw,
				rawHash,
				syncedAt,
			},
			update: {
				username: row.username,
				normalizedUsername: normalizeMinecraftUsername(row.username),
				primaryGroup: row.primary_group,
				raw,
				rawHash,
				syncedAt,
			},
		})
		rowsChanged += 1
	}

	const deleted = await prisma.luckPermsPlayer.deleteMany({
		where: rows.length
			? {
					uuid: {
						notIn: rows.map((row) => row.uuid),
					},
				}
			: {},
	})

	return {
		rowsMatched,
		rowsChanged: rowsChanged + deleted.count,
	}
}

const syncLuckPermsGroups = async (
	rows: LuckPermsGroupRow[],
	syncedAt: Date,
) => {
	let rowsMatched = 0
	let rowsChanged = 0

	for (const row of rows) {
		const raw = createRawSnapshot(row)
		const rawHash = hashSyncValue(raw)
		const existing = await prisma.luckPermsGroup.findUnique({
			where: {
				name: row.name,
			},
			select: {
				rawHash: true,
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
				raw,
				rawHash,
				syncedAt,
			},
			update: {
				raw,
				rawHash,
				syncedAt,
			},
		})
		rowsChanged += 1
	}

	const deleted = await prisma.luckPermsGroup.deleteMany({
		where: rows.length
			? {
					name: {
						notIn: rows.map((row) => row.name),
					},
				}
			: {},
	})

	return {
		rowsMatched,
		rowsChanged: rowsChanged + deleted.count,
	}
}

const syncLuckPermsUserPermissions = async (
	rows: LuckPermsUserPermissionRow[],
	syncedAt: Date,
) => {
	let rowsMatched = 0
	let rowsChanged = 0

	for (const row of rows) {
		const raw = createRawSnapshot(row)
		const rawHash = hashSyncValue(raw)
		const existing = await prisma.luckPermsUserPermission.findUnique({
			where: {
				sourceId: row.id,
			},
			select: {
				rawHash: true,
			},
		})

		rowsMatched += 1

		if (existing?.rawHash === rawHash) {
			continue
		}

		await prisma.luckPermsUserPermission.upsert({
			where: {
				sourceId: row.id,
			},
			create: {
				sourceId: row.id,
				uuid: row.uuid,
				permission: row.permission,
				value: parseBoolean(row.value),
				server: row.server,
				world: row.world,
				expiry: parseBigInt(row.expiry),
				contexts: row.contexts,
				raw,
				rawHash,
				syncedAt,
			},
			update: {
				uuid: row.uuid,
				permission: row.permission,
				value: parseBoolean(row.value),
				server: row.server,
				world: row.world,
				expiry: parseBigInt(row.expiry),
				contexts: row.contexts,
				raw,
				rawHash,
				syncedAt,
			},
		})
		rowsChanged += 1
	}

	const deleted = await prisma.luckPermsUserPermission.deleteMany({
		where: rows.length
			? {
					sourceId: {
						notIn: rows.map((row) => row.id),
					},
				}
			: {},
	})

	return {
		rowsMatched,
		rowsChanged: rowsChanged + deleted.count,
	}
}

const syncLuckPermsGroupPermissions = async (
	rows: LuckPermsGroupPermissionRow[],
	syncedAt: Date,
) => {
	let rowsMatched = 0
	let rowsChanged = 0

	for (const row of rows) {
		const raw = createRawSnapshot(row)
		const rawHash = hashSyncValue(raw)
		const existing = await prisma.luckPermsGroupPermission.findUnique({
			where: {
				sourceId: row.id,
			},
			select: {
				rawHash: true,
			},
		})

		rowsMatched += 1

		if (existing?.rawHash === rawHash) {
			continue
		}

		await prisma.luckPermsGroupPermission.upsert({
			where: {
				sourceId: row.id,
			},
			create: {
				sourceId: row.id,
				name: row.name,
				permission: row.permission,
				value: parseBoolean(row.value),
				server: row.server,
				world: row.world,
				expiry: parseBigInt(row.expiry),
				contexts: row.contexts,
				raw,
				rawHash,
				syncedAt,
			},
			update: {
				name: row.name,
				permission: row.permission,
				value: parseBoolean(row.value),
				server: row.server,
				world: row.world,
				expiry: parseBigInt(row.expiry),
				contexts: row.contexts,
				raw,
				rawHash,
				syncedAt,
			},
		})
		rowsChanged += 1
	}

	const deleted = await prisma.luckPermsGroupPermission.deleteMany({
		where: rows.length
			? {
					sourceId: {
						notIn: rows.map((row) => row.id),
					},
				}
			: {},
	})

	return {
		rowsMatched,
		rowsChanged: rowsChanged + deleted.count,
	}
}

const syncLuckPermsActions = async (
	rows: LuckPermsActionRow[],
	syncedAt: Date,
) => {
	let rowsMatched = 0
	let rowsChanged = 0

	for (const row of rows) {
		const raw = createRawSnapshot(row)
		const rawHash = hashSyncValue(raw)
		const existing = await prisma.luckPermsAction.findUnique({
			where: {
				sourceId: row.id,
			},
			select: {
				rawHash: true,
			},
		})

		rowsMatched += 1

		if (existing?.rawHash === rawHash) {
			continue
		}

		await prisma.luckPermsAction.upsert({
			where: {
				sourceId: row.id,
			},
			create: {
				sourceId: row.id,
				time: parseBigInt(row.time),
				actorUuid: row.actor_uuid,
				actorName: row.actor_name,
				type: row.type,
				actedUuid: row.acted_uuid,
				actedName: row.acted_name,
				action: row.action,
				raw,
				rawHash,
				syncedAt,
			},
			update: {
				time: parseBigInt(row.time),
				actorUuid: row.actor_uuid,
				actorName: row.actor_name,
				type: row.type,
				actedUuid: row.acted_uuid,
				actedName: row.acted_name,
				action: row.action,
				raw,
				rawHash,
				syncedAt,
			},
		})
		rowsChanged += 1
	}

	const deleted = await prisma.luckPermsAction.deleteMany({
		where: rows.length
			? {
					sourceId: {
						notIn: rows.map((row) => row.id),
					},
				}
			: {},
	})

	return {
		rowsMatched,
		rowsChanged: rowsChanged + deleted.count,
	}
}

const syncLuckPermsTracks = async (
	rows: LuckPermsTrackRow[],
	syncedAt: Date,
) => {
	let rowsMatched = 0
	let rowsChanged = 0

	for (const row of rows) {
		const raw = createRawSnapshot(row)
		const rawHash = hashSyncValue(raw)
		const existing = await prisma.luckPermsTrack.findUnique({
			where: {
				name: row.name,
			},
			select: {
				rawHash: true,
			},
		})

		rowsMatched += 1

		if (existing?.rawHash === rawHash) {
			continue
		}

		await prisma.luckPermsTrack.upsert({
			where: {
				name: row.name,
			},
			create: {
				name: row.name,
				groups: row.groups,
				raw,
				rawHash,
				syncedAt,
			},
			update: {
				groups: row.groups,
				raw,
				rawHash,
				syncedAt,
			},
		})
		rowsChanged += 1
	}

	const deleted = await prisma.luckPermsTrack.deleteMany({
		where: rows.length
			? {
					name: {
						notIn: rows.map((row) => row.name),
					},
				}
			: {},
	})

	return {
		rowsMatched,
		rowsChanged: rowsChanged + deleted.count,
	}
}

const syncLuckPermsMessenger = async (
	rows: LuckPermsMessengerRow[],
	syncedAt: Date,
) => {
	let rowsMatched = 0
	let rowsChanged = 0

	for (const row of rows) {
		const raw = createRawSnapshot(row)
		const rawHash = hashSyncValue(raw)
		const existing = await prisma.luckPermsMessenger.findUnique({
			where: {
				sourceId: row.id,
			},
			select: {
				rawHash: true,
			},
		})

		rowsMatched += 1

		if (existing?.rawHash === rawHash) {
			continue
		}

		await prisma.luckPermsMessenger.upsert({
			where: {
				sourceId: row.id,
			},
			create: {
				sourceId: row.id,
				time: parseDate(row.time),
				message: row.msg,
				raw,
				rawHash,
				syncedAt,
			},
			update: {
				time: parseDate(row.time),
				message: row.msg,
				raw,
				rawHash,
				syncedAt,
			},
		})
		rowsChanged += 1
	}

	const deleted = await prisma.luckPermsMessenger.deleteMany({
		where: rows.length
			? {
					sourceId: {
						notIn: rows.map((row) => row.id),
					},
				}
			: {},
	})

	return {
		rowsMatched,
		rowsChanged: rowsChanged + deleted.count,
	}
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

		const tableNames = [
			'luckperms_actions',
			'luckperms_groups',
			'luckperms_group_permissions',
			'luckperms_messenger',
			'luckperms_players',
			'luckperms_tracks',
			'luckperms_user_permissions',
		] as const
		const tableColumns = new Map<
			(string & {}) | (typeof tableNames)[number],
			Set<string>
		>()

		for (const tableName of tableNames) {
			tableColumns.set(
				tableName,
				await getLuckPermsTableColumns(pool, config.database, tableName),
			)
		}

		const [
			actions,
			groups,
			groupPermissions,
			messenger,
			players,
			tracks,
			userPermissions,
		] = await Promise.all([
			(async () => {
				const query = buildSelectAllQuery(
					'luckperms_actions',
					tableColumns.get('luckperms_actions') ?? new Set(),
				)

				if (!query) {
					return [] as LuckPermsActionRow[]
				}

				const [rows] = await pool.query<LuckPermsActionRow[]>(query)

				return rows
			})(),
			(async () => {
				const query = buildSelectAllQuery(
					'luckperms_groups',
					tableColumns.get('luckperms_groups') ?? new Set(),
				)

				if (!query) {
					return [] as LuckPermsGroupRow[]
				}

				const [rows] = await pool.query<LuckPermsGroupRow[]>(query)

				return rows
			})(),
			(async () => {
				const query = buildSelectAllQuery(
					'luckperms_group_permissions',
					tableColumns.get('luckperms_group_permissions') ?? new Set(),
				)

				if (!query) {
					return [] as LuckPermsGroupPermissionRow[]
				}

				const [rows] = await pool.query<LuckPermsGroupPermissionRow[]>(query)

				return rows
			})(),
			(async () => {
				const query = buildSelectAllQuery(
					'luckperms_messenger',
					tableColumns.get('luckperms_messenger') ?? new Set(),
				)

				if (!query) {
					return [] as LuckPermsMessengerRow[]
				}

				const [rows] = await pool.query<LuckPermsMessengerRow[]>(query)

				return rows
			})(),
			(async () => {
				const query = buildSelectAllQuery(
					'luckperms_players',
					tableColumns.get('luckperms_players') ?? new Set(),
				)

				if (!query) {
					return [] as LuckPermsPlayerRow[]
				}

				const [rows] = await pool.query<LuckPermsPlayerRow[]>(query)

				return rows
			})(),
			(async () => {
				const query = buildSelectAllQuery(
					'luckperms_tracks',
					tableColumns.get('luckperms_tracks') ?? new Set(),
				)

				if (!query) {
					return [] as LuckPermsTrackRow[]
				}

				const [rows] = await pool.query<LuckPermsTrackRow[]>(query)

				return rows
			})(),
			(async () => {
				const query = buildSelectAllQuery(
					'luckperms_user_permissions',
					tableColumns.get('luckperms_user_permissions') ?? new Set(),
				)

				if (!query) {
					return [] as LuckPermsUserPermissionRow[]
				}

				const [rows] = await pool.query<LuckPermsUserPermissionRow[]>(query)

				return rows
			})(),
		])

		const syncedAt = new Date()
		const [
			actionsResult,
			groupsResult,
			groupPermissionsResult,
			messengerResult,
			playersResult,
			tracksResult,
			userPermissionsResult,
		] = await Promise.all([
			syncLuckPermsActions(actions, syncedAt),
			syncLuckPermsGroups(groups, syncedAt),
			syncLuckPermsGroupPermissions(groupPermissions, syncedAt),
			syncLuckPermsMessenger(messenger, syncedAt),
			syncLuckPermsPlayers(players, syncedAt),
			syncLuckPermsTracks(tracks, syncedAt),
			syncLuckPermsUserPermissions(userPermissions, syncedAt),
		])

		const rowsRead =
			actions.length +
			groups.length +
			groupPermissions.length +
			messenger.length +
			players.length +
			tracks.length +
			userPermissions.length
		const rowsMatched =
			actionsResult.rowsMatched +
			groupsResult.rowsMatched +
			groupPermissionsResult.rowsMatched +
			messengerResult.rowsMatched +
			playersResult.rowsMatched +
			tracksResult.rowsMatched +
			userPermissionsResult.rowsMatched
		const rowsChanged =
			actionsResult.rowsChanged +
			groupsResult.rowsChanged +
			groupPermissionsResult.rowsChanged +
			messengerResult.rowsChanged +
			playersResult.rowsChanged +
			tracksResult.rowsChanged +
			userPermissionsResult.rowsChanged

		return {
			serversRead: 1,
			rowsRead,
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
