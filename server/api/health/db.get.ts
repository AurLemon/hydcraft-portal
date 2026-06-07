import { prisma } from '../../utils/db/prisma'

export default defineEventHandler(async () => {
	await prisma.$queryRaw`SELECT 1`

	return {
		ok: true,
		timestamp: new Date().toISOString(),
	}
})
