import { prisma } from '../../../utils/db/prisma'
import { toMinecraftServerSummary } from '../../../utils/minecraft/server-config'

export default defineEventHandler(async () => {
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
			authMe: true,
			luckPerms: true,
		},
	})

	return {
		servers: servers.map(toMinecraftServerSummary),
	}
})
