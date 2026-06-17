import { prisma } from '../../../../../../utils/db/prisma'
import { requireAdminUser } from '../../../../../../utils/auth/session'
import {
	createApiError,
	createBadRequestError,
} from '../../../../../../utils/errors'
import { closeExternalMysqlPool } from '../../../../../../utils/external-sync/mysql'
import {
	createMysqlPoolFromDatabaseUrl,
	readAuthMeSourceConfig,
	readLuckPermsSourceConfig,
} from '../../../../../../utils/external-sync/source-config'

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

	const serverExists = await prisma.minecraftServer.findUnique({
		where: {
			serverId,
		},
		select: {
			id: true,
		},
	})

	if (!serverExists) {
		throw createApiError({
			statusCode: 404,
			code: 'MINECRAFT_SERVER_NOT_FOUND',
		})
	}

	const config =
		source === 'authme' ? readAuthMeSourceConfig() : readLuckPermsSourceConfig()
	const state = await prisma.externalSyncState.findUnique({
		where: {
			source: source === 'authme' ? 'AUTHME' : 'LUCKPERMS',
		},
	})

	if (!config.enabled || !config.databaseUrl) {
		return {
			source,
			config: {
				id: source,
				host: null,
				port: null,
				database: config.database || null,
				username: null,
				enabled: config.enabled,
				syncIntervalSeconds: config.intervalSeconds,
				lastSyncAt: state?.lastSuccessAt ?? null,
				lastError: state?.lastError ?? null,
				hasPassword: Boolean(config.databaseUrl),
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
		const pool = createMysqlPoolFromDatabaseUrl(config.databaseUrl)

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
			id: source,
			host: null,
			port: null,
			database: config.database || null,
			username: null,
			enabled: config.enabled,
			syncIntervalSeconds: config.intervalSeconds,
			lastSyncAt: state?.lastSuccessAt ?? null,
			lastError: state?.lastError ?? null,
			hasPassword: Boolean(config.databaseUrl),
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
