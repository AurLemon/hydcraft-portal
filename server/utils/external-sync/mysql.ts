import {
	createPool,
	type Pool,
	type PoolOptions,
	type QueryValues,
	type QueryResult,
	type QueryOptions,
} from 'mysql2/promise'

type ReadonlyQuery = string | QueryOptions

export interface ExternalReadonlyMysqlPool {
	query<T extends QueryResult>(
		sql: ReadonlyQuery,
		values?: QueryValues,
	): Promise<[T, unknown]>
	end(): Promise<void>
}

const READONLY_SQL_PATTERN =
	/^\s*(?:\/\*[\s\S]*?\*\/\s*)*(?:SELECT|SHOW|DESCRIBE|EXPLAIN|WITH)\b/i

const assertReadonlySql = (sql: ReadonlyQuery) => {
	const statement = typeof sql === 'string' ? sql : sql.sql

	if (!READONLY_SQL_PATTERN.test(statement)) {
		throw new Error(
			'External MySQL sources are forced to readonly mode and only accept read queries.',
		)
	}
}

const createReadonlyQuery =
	(pool: Pool): ExternalReadonlyMysqlPool['query'] =>
	async <T extends QueryResult>(sql: ReadonlyQuery, values?: QueryValues) => {
		assertReadonlySql(sql)

		const connection = await pool.getConnection()

		try {
			await connection.query('SET SESSION TRANSACTION READ ONLY')
			await connection.query('SET SESSION tx_read_only = 1')

			if (typeof sql === 'string') {
				return await connection.query<T>(sql, values)
			}

			return await connection.query<T>(sql, values)
		} finally {
			connection.release()
		}
	}

export function createExternalMysqlPool(
	connectionString: string | undefined,
): ExternalReadonlyMysqlPool {
	if (!connectionString) {
		throw new Error('External MySQL connection string is not configured.')
	}

	const options: PoolOptions = {
		uri: connectionString,
		connectionLimit: 4,
		namedPlaceholders: true,
	}
	const pool = createPool(options)

	return {
		query: createReadonlyQuery(pool),
		end: async () => {
			await pool.end()
		},
	}
}

export async function closeExternalMysqlPool(pool: ExternalReadonlyMysqlPool) {
	await pool.end()
}
