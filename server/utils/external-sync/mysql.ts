import { createPool, type Pool } from 'mysql2/promise'

export function createExternalMysqlPool(
	connectionString: string | undefined,
): Pool {
	if (!connectionString) {
		throw new Error('External MySQL connection string is not configured.')
	}

	return createPool({
		uri: connectionString,
		connectionLimit: 4,
		namedPlaceholders: true,
	})
}

export async function closeExternalMysqlPool(pool: Pool) {
	await pool.end()
}
