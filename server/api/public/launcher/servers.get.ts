import { prisma } from '../../../utils/db/prisma'
import { toPublicLauncherServerDirectoryItem } from '../../../utils/minecraft/server-config'

export default defineEventHandler(async () => {
	const servers = await prisma.minecraftServer.findMany({
		where: {
			status: 'ONLINE',
		},
		orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
		select: {
			id: true,
			serverId: true,
			code: true,
			shortCode: true,
			nameZhCn: true,
			nameZhTw: true,
			nameEnUs: true,
			nameJaJp: true,
			status: true,
			isDefault: true,
			sortOrder: true,
		},
	})

	return { servers: servers.map(toPublicLauncherServerDirectoryItem) }
})
