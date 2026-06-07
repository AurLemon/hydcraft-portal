import { prisma } from '../../../utils/db/prisma'
import { toMinecraftServerSummary } from '../../../utils/minecraft/server-config'

export default defineEventHandler(async (event) => {
	const serverId = getRouterParam(event, 'serverId') ?? ''
	const server = await prisma.minecraftServer.findUnique({
		where: {
			serverId,
		},
		include: {
			portalBridge: true,
			authMe: true,
			luckPerms: true,
		},
	})

	if (!server) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Minecraft server not found',
		})
	}

	return {
		server: toMinecraftServerSummary(server),
	}
})
