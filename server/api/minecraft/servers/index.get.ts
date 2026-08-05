import { prisma } from '../../../utils/db/prisma'
import { requireAdminUser } from '../../../utils/auth/session'
import { toMinecraftServerSummary } from '../../../utils/minecraft/server-config'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const servers = await prisma.minecraftServer.findMany({
		orderBy: [
			{
				sortOrder: 'asc',
			},
			{
				createdAt: 'asc',
			},
		],
		include: {
			portalBridge: true,
			mapConfig: true,
			periods: {
				orderBy: [{ sortOrder: 'asc' }, { startedAt: 'asc' }],
			},
		},
	})

	return {
		servers: servers.map(toMinecraftServerSummary),
	}
})
