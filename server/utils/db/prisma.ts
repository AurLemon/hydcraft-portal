import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '~/generated/prisma/client'

declare global {
	var __prisma__: PrismaClient | undefined
	var __prismaPgPool__: Pool | undefined
}

const pool =
	globalThis.__prismaPgPool__ ??
	new Pool({
		connectionString: process.env.DATABASE_URL ?? '',
	})

if (process.env.NODE_ENV !== 'production') {
	globalThis.__prismaPgPool__ = pool
}

const adapter = new PrismaPg(pool)

export const prisma =
	globalThis.__prisma__ ??
	new PrismaClient({
		adapter,
		log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
	})

if (process.env.NODE_ENV !== 'production') {
	globalThis.__prisma__ = prisma
}
