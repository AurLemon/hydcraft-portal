import { prisma } from '../../../utils/db/prisma'
import { requireAdminUser } from '../../../utils/auth/session'
import { createApiError } from '../../../utils/errors'
import { toMinecraftServerSummary } from '../../../utils/minecraft/server-config'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const serverId = getRouterParam(event, 'serverId') ?? ''
	const server = await prisma.minecraftServer.findUnique({
		where: {
			serverId,
		},
		include: {
			portalBridge: true,
			mapConfig: true,
			periods: {
				orderBy: [{ sortOrder: 'asc' }, { startedAt: 'asc' }],
			},
		},
	})

	if (!server) {
		throw createApiError({
			statusCode: 404,
			code: 'MINECRAFT_SERVER_NOT_FOUND',
		})
	}

	return {
		server: toMinecraftServerSummary(server),
	}
})
