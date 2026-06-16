import { prisma } from '../../../../../../utils/db/prisma'
import { requireAdminUser } from '../../../../../../utils/auth/session'
import {
	createApiError,
	createBadRequestError,
} from '../../../../../../utils/errors'
import { closeExternalMysqlPool } from '../../../../../../utils/external-sync/mysql'
import { createMysqlPoolFromSourceConfig } from '../../../../../../utils/external-sync/source-config'

type MysqlSourceName = 'authme' | 'luckperms'

const isMysqlSourceName = (value: string): value is MysqlSourceName =>
	value === 'authme' || value === 'luckperms'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const serverId = getRouterParam(event, 'serverId') ?? ''
	const source = getRouterParam(event, 'source') ?? ''

	if (!isMysqlSourceName(source)) {
		throw createBadRequestError('MYSQL_SOURCE_UNSUPPORTED')
	}

	const server = await prisma.minecraftServer.findUnique({
		where: {
			serverId,
		},
		include: {
			authMe: true,
			luckPerms: true,
		},
	})

	if (!server) {
		throw createApiError({
			statusCode: 404,
			code: 'MINECRAFT_SERVER_NOT_FOUND',
		})
	}

	const config = source === 'authme' ? server.authMe : server.luckPerms

	if (!config) {
		throw createApiError({
			statusCode: 404,
			code: 'MYSQL_SOURCE_CONFIG_NOT_FOUND',
		})
	}

	if (!config.enabled) {
		return {
			source,
			config: {
				id: config.id,
				host: config.host,
				port: config.port,
				database: config.database,
				username: config.username,
				enabled: config.enabled,
				syncIntervalSeconds: config.syncIntervalSeconds,
				lastSyncAt: config.lastSyncAt,
				lastError: config.lastError,
				hasPassword: Boolean(config.encryptedPassword),
			},
			connection: {
				ok: false,
				skipped: true,
				latencyMs: null,
				errorMessage: null,
				checkedAt: null,
			},
		}
	}

	const startedAt = Date.now()
	let latencyMs: number | null = null
	let connectionOk = false
	let errorMessage: string | null = null

	try {
		const pool = createMysqlPoolFromSourceConfig(config)

		try {
			await pool.query('SELECT 1 AS ok')
			connectionOk = true
			latencyMs = Date.now() - startedAt
		} finally {
			await closeExternalMysqlPool(pool)
		}
	} catch (error) {
		latencyMs = Date.now() - startedAt
		errorMessage =
			error instanceof Error ? error.message : 'Unknown MySQL error'
	}

	return {
		source,
		config: {
			id: config.id,
			host: config.host,
			port: config.port,
			database: config.database,
			username: config.username,
			enabled: config.enabled,
			syncIntervalSeconds: config.syncIntervalSeconds,
			lastSyncAt: config.lastSyncAt,
			lastError: config.lastError,
			hasPassword: Boolean(config.encryptedPassword),
		},
		connection: {
			ok: connectionOk,
			skipped: false,
			latencyMs,
			errorMessage,
			checkedAt: new Date(),
		},
	}
})
