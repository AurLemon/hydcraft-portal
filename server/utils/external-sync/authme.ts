import type { RowDataPacket } from 'mysql2'
import { prisma } from '../db/prisma'
import { closeExternalMysqlPool, createExternalMysqlPool } from './mysql'
import { parseUnixTimestamp } from './time'

interface AuthMeRow extends RowDataPacket {
	id: number
	username: string
	realname: string
	lastlogin: number | null
	regdate: number
	email: string | null
	hasTotp: 0 | 1
}

interface ExternalSyncResult {
	rowsRead: number
	rowsUpserted: number
}

function normalizeMinecraftUsername(username: string) {
	return username.trim().toLowerCase()
}

export async function syncAuthMeSnapshots(): Promise<ExternalSyncResult> {
	const run = await prisma.externalSyncRun.create({
		data: {
			source: 'AUTHME',
		},
	})
	const pool = createExternalMysqlPool(process.env.AUTHME_MYSQL_URL)

	try {
		const [rows] = await pool.query<AuthMeRow[]>(`
			SELECT
				id,
				username,
				realname,
				lastlogin,
				regdate,
				email,
				CASE WHEN totp IS NULL OR totp = '' THEN 0 ELSE 1 END AS hasTotp
			FROM authme
		`)
		const syncedAt = new Date()
		let rowsUpserted = 0

		for (const row of rows) {
			const username = row.realname || row.username
			const normalizedUsername = normalizeMinecraftUsername(username)
			const registeredAt = parseUnixTimestamp(row.regdate)
			const lastLoginAt = parseUnixTimestamp(row.lastlogin)

			await prisma.authMeAccountSnapshot.upsert({
				where: {
					authmeId: row.id,
				},
				create: {
					authmeId: row.id,
					username: row.username,
					normalizedUsername,
					realname: row.realname || null,
					email: row.email,
					registeredAt,
					lastLoginAt,
					hasTotp: row.hasTotp === 1,
					rawRegdate: BigInt(row.regdate),
					rawLastlogin: row.lastlogin === null ? null : BigInt(row.lastlogin),
					syncedAt,
				},
				update: {
					username: row.username,
					normalizedUsername,
					realname: row.realname || null,
					email: row.email,
					registeredAt,
					lastLoginAt,
					hasTotp: row.hasTotp === 1,
					rawRegdate: BigInt(row.regdate),
					rawLastlogin: row.lastlogin === null ? null : BigInt(row.lastlogin),
					syncedAt,
				},
			})

			await prisma.minecraftAccount.upsert({
				where: {
					normalizedUsername,
				},
				create: {
					username,
					normalizedUsername,
					status: 'IMPORTED',
					source: 'AUTHME',
					authmeId: row.id,
					authmeName: row.username,
					firstJoinedAt: registeredAt,
					lastSeenAt: lastLoginAt,
				},
				update: {
					username,
					authmeId: row.id,
					authmeName: row.username,
					firstJoinedAt: registeredAt,
					lastSeenAt: lastLoginAt,
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
				rowsRead: rows.length,
				rowsUpserted,
			},
		})

		return {
			rowsRead: rows.length,
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
					error instanceof Error ? error.message : 'Unknown AuthMe sync error',
			},
		})

		throw error
	} finally {
		await closeExternalMysqlPool(pool)
	}
}
