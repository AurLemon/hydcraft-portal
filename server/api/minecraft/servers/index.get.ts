import { prisma } from '../../../utils/db/prisma'
import { toMinecraftServerSummary } from '../../../utils/minecraft/server-config'

export default defineEventHandler(async () => {
	const servers = await prisma.minecraftServer.findMany({
		orderBy: [
			{
				isDefault: 'desc',
			},
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
