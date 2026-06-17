import { createExternalMysqlPool } from './mysql'

interface EnvExternalSourceConfig {
	enabled: boolean
	databaseUrl: string | null
	database: string
	intervalSeconds: number
}

const DEFAULT_SYNC_INTERVAL_SECONDS = 1800
const MIN_SYNC_INTERVAL_SECONDS = 60

const readBooleanEnv = (value: string | undefined): boolean =>
	value === '1' || value?.toLowerCase() === 'true'

const readIntervalEnv = (value: string | undefined): number => {
	const parsed = Number(value)

	return Number.isFinite(parsed) && parsed > 0
		? Math.max(MIN_SYNC_INTERVAL_SECONDS, Math.floor(parsed))
		: DEFAULT_SYNC_INTERVAL_SECONDS
}

const readDatabaseName = (databaseUrl: string | null): string => {
	if (!databaseUrl) {
		return ''
	}

	try {
		const url = new URL(databaseUrl)

		return url.pathname.replace(/^\//, '').split('/')[0] ?? ''
	} catch {
		return ''
	}
}

export const readAuthMeSourceConfig = (): EnvExternalSourceConfig => {
	const databaseUrl = process.env.AUTHME_DATABASE_URL?.trim() || null

	return {
		enabled: readBooleanEnv(process.env.AUTHME_SYNC_ENABLED),
		databaseUrl,
		database: readDatabaseName(databaseUrl),
		intervalSeconds: readIntervalEnv(process.env.AUTHME_SYNC_INTERVAL_SECONDS),
	}
}

export const readLuckPermsSourceConfig = (): EnvExternalSourceConfig => {
	const databaseUrl = process.env.LUCKPERMS_DATABASE_URL?.trim() || null

	return {
		enabled: readBooleanEnv(process.env.LUCKPERMS_SYNC_ENABLED),
		databaseUrl,
		database: readDatabaseName(databaseUrl),
		intervalSeconds: readIntervalEnv(
			process.env.LUCKPERMS_SYNC_INTERVAL_SECONDS,
		),
	}
}

export const createMysqlPoolFromDatabaseUrl = (databaseUrl: string | null) =>
	createExternalMysqlPool(databaseUrl ?? undefined)
