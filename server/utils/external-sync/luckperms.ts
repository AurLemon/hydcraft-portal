import type { RowDataPacket } from 'mysql2'
import { prisma } from '../db/prisma'
import { closeExternalMysqlPool, createExternalMysqlPool } from './mysql'
import { parseLuckPermsExpiry } from './time'

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
	value: 0 | 1
	server: string
	world: string
	expiry: number
	contexts: string
}

interface LuckPermsGroupPermissionRow extends RowDataPacket {
	id: number
	name: string
	permission: string
	value: 0 | 1
	server: string
	world: string
	expiry: number
	contexts: string
}

interface LuckPermsTrackRow extends RowDataPacket {
	name: string
	groups: string
}

interface ExternalSyncResult {
	rowsRead: number
	rowsUpserted: number
}

function normalizeMinecraftUsername(username: string) {
	return username.trim().toLowerCase()
}

export async function syncLuckPermsSnapshots(): Promise<ExternalSyncResult> {
	const run = await prisma.externalSyncRun.create({
		data: {
			source: 'LUCKPERMS',
		},
	})
	const pool = createExternalMysqlPool(process.env.LUCKPERMS_MYSQL_URL)

	try {
		const syncedAt = new Date()
		let rowsRead = 0
		let rowsUpserted = 0

		const [players] = await pool.query<LuckPermsPlayerRow[]>(`
			SELECT uuid, username, primary_group
			FROM luckperms_players
		`)
		rowsRead += players.length

		for (const row of players) {
			await prisma.luckPermsPlayerSnapshot.upsert({
				where: {
					uuid: row.uuid,
				},
				create: {
					uuid: row.uuid,
					username: row.username,
					normalizedUsername: normalizeMinecraftUsername(row.username),
					primaryGroup: row.primary_group,
					syncedAt,
				},
				update: {
					username: row.username,
					normalizedUsername: normalizeMinecraftUsername(row.username),
					primaryGroup: row.primary_group,
					syncedAt,
				},
			})
			rowsUpserted += 1
		}

		const [groups] = await pool.query<LuckPermsGroupRow[]>(`
			SELECT name
			FROM luckperms_groups
		`)
		rowsRead += groups.length

		for (const row of groups) {
			await prisma.luckPermsGroupSnapshot.upsert({
				where: {
					name: row.name,
				},
				create: {
					name: row.name,
					syncedAt,
				},
				update: {
					syncedAt,
				},
			})
			rowsUpserted += 1
		}

		const [userPermissions] = await pool.query<LuckPermsUserPermissionRow[]>(`
				SELECT id, uuid, permission, value, server, world, expiry, contexts
				FROM luckperms_user_permissions
			`)
		rowsRead += userPermissions.length

		for (const row of userPermissions) {
			await prisma.luckPermsUserPermissionSnapshot.upsert({
				where: {
					sourceId: row.id,
				},
				create: {
					sourceId: row.id,
					uuid: row.uuid,
					permission: row.permission,
					value: row.value === 1,
					server: row.server,
					world: row.world,
					rawExpiry: BigInt(row.expiry),
					expiresAt: parseLuckPermsExpiry(row.expiry),
					contexts: row.contexts,
					syncedAt,
				},
				update: {
					uuid: row.uuid,
					permission: row.permission,
					value: row.value === 1,
					server: row.server,
					world: row.world,
					rawExpiry: BigInt(row.expiry),
					expiresAt: parseLuckPermsExpiry(row.expiry),
					contexts: row.contexts,
					syncedAt,
				},
			})
			rowsUpserted += 1
		}

		const [groupPermissions] = await pool.query<LuckPermsGroupPermissionRow[]>(`
				SELECT id, name, permission, value, server, world, expiry, contexts
				FROM luckperms_group_permissions
			`)
		rowsRead += groupPermissions.length

		for (const row of groupPermissions) {
			await prisma.luckPermsGroupPermissionSnapshot.upsert({
				where: {
					sourceId: row.id,
				},
				create: {
					sourceId: row.id,
					groupName: row.name,
					permission: row.permission,
					value: row.value === 1,
					server: row.server,
					world: row.world,
					rawExpiry: BigInt(row.expiry),
					expiresAt: parseLuckPermsExpiry(row.expiry),
					contexts: row.contexts,
					syncedAt,
				},
				update: {
					groupName: row.name,
					permission: row.permission,
					value: row.value === 1,
					server: row.server,
					world: row.world,
					rawExpiry: BigInt(row.expiry),
					expiresAt: parseLuckPermsExpiry(row.expiry),
					contexts: row.contexts,
					syncedAt,
				},
			})
			rowsUpserted += 1
		}

		const [tracks] = await pool.query<LuckPermsTrackRow[]>(`
			SELECT name, groups
			FROM luckperms_tracks
		`)
		rowsRead += tracks.length

		for (const row of tracks) {
			await prisma.luckPermsTrackSnapshot.upsert({
				where: {
					name: row.name,
				},
				create: {
					name: row.name,
					rawGroups: row.groups,
					syncedAt,
				},
				update: {
					rawGroups: row.groups,
					syncedAt,
				},
			})
			rowsUpserted += 1
		}

		await prisma.externalSyncRun.update({
			where: {
				id: run.id,
			},
			data: {
				status: 'SUCCESS',
				finishedAt: new Date(),
				rowsRead,
				rowsUpserted,
			},
		})

		return {
			rowsRead,
			rowsUpserted,
		}
	} catch (error) {
		await prisma.externalSyncRun.update({
			where: {
				id: run.id,
			},
			data: {
				status: 'FAILED',
				finishedAt: new Date(),
				errorMessage:
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
