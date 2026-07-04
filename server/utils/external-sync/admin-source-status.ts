import type { ExternalSyncSource } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { closeExternalMysqlPool } from './mysql'
import {
	createMysqlPoolFromDatabaseUrl,
	readAuthMeSourceConfig,
	readLuckPermsSourceConfig,
} from './source-config'

export type AdminExternalSyncSourceName = 'authme' | 'luckperms'

interface ProbeResult {
	ok: boolean
	skipped: boolean
	latencyMs: number | null
	errorMessage: string | null
	checkedAt: Date | null
}

const SOURCE_TO_SYNC_SOURCE: Record<
	AdminExternalSyncSourceName,
	Extract<ExternalSyncSource, 'AUTHME' | 'LUCKPERMS'>
> = {
	authme: 'AUTHME',
	luckperms: 'LUCKPERMS',
}

const isAdminExternalSyncSourceName = (
	value: string,
): value is AdminExternalSyncSourceName =>
	value === 'authme' || value === 'luckperms'

const readSourceConfig = (source: AdminExternalSyncSourceName) =>
	source === 'authme' ? readAuthMeSourceConfig() : readLuckPermsSourceConfig()

const probeSourceConnection = async (input: {
	enabled: boolean
	databaseUrl: string | null
}): Promise<ProbeResult> => {
	if (!input.enabled || !input.databaseUrl) {
		return {
			ok: false,
			skipped: true,
			latencyMs: null,
			errorMessage: null,
			checkedAt: null,
		}
	}

	const startedAt = Date.now()

	try {
		const pool = createMysqlPoolFromDatabaseUrl(input.databaseUrl)

		try {
			await pool.query('SELECT 1 AS ok')

			return {
				ok: true,
				skipped: false,
				latencyMs: Date.now() - startedAt,
				errorMessage: null,
				checkedAt: new Date(),
			}
		} finally {
			await closeExternalMysqlPool(pool)
		}
	} catch (error) {
		return {
			ok: false,
			skipped: false,
			latencyMs: Date.now() - startedAt,
			errorMessage:
				error instanceof Error ? error.message : 'Unknown MySQL error',
			checkedAt: new Date(),
		}
	}
}

export const parseAdminExternalSyncSourceName = (value: string) =>
	isAdminExternalSyncSourceName(value) ? value : null

export const readAdminExternalSyncSourceStatus = async (
	source: AdminExternalSyncSourceName,
) => {
	const config = readSourceConfig(source)
	const state = await prisma.externalSyncState.findUnique({
		where: {
			source: SOURCE_TO_SYNC_SOURCE[source],
		},
	})
	const connection = await probeSourceConnection({
		enabled: config.enabled,
		databaseUrl: config.databaseUrl,
	})

	return {
		source,
		config: {
			configured: Boolean(config.databaseUrl),
			database: config.database || null,
			enabled: config.enabled,
			intervalSeconds: config.intervalSeconds,
		},
		sync: {
			running: state?.running ?? false,
			lastStartedAt: state?.lastStartedAt?.toISOString() ?? null,
			lastFinishedAt: state?.lastFinishedAt?.toISOString() ?? null,
			lastSuccessAt: state?.lastSuccessAt?.toISOString() ?? null,
			lastError: state?.lastError ?? null,
			rowsRead: state?.rowsRead ?? 0,
			rowsMatched: state?.rowsMatched ?? 0,
			rowsChanged: state?.rowsChanged ?? 0,
			rowsSkipped: state?.rowsSkipped ?? 0,
		},
		connection: {
			ok: connection.ok,
			skipped: connection.skipped,
			latencyMs: connection.latencyMs,
			errorMessage: connection.errorMessage,
			checkedAt: connection.checkedAt?.toISOString() ?? null,
		},
	}
}
