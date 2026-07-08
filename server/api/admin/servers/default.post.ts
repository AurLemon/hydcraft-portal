import { prisma } from '../../../utils/db/prisma'
import { requireAdminUser } from '../../../utils/auth/session'
import { createBadRequestError } from '../../../utils/errors'

interface SetDefaultServerBody {
	serverId?: string
}

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const body = await readBody<SetDefaultServerBody>(event)
	const serverId = body.serverId?.trim()

	if (!serverId) {
		throw createBadRequestError('INVALID_MINECRAFT_SERVER_ID')
	}

	await prisma.$transaction(async (tx) => {
		const server = await tx.minecraftServer.findUnique({
			where: {
				serverId,
			},
			select: {
				id: true,
			},
		})

		if (!server) {
			throw createBadRequestError('INVALID_MINECRAFT_SERVER_ID')
		}

		await tx.minecraftServer.updateMany({
			where: {
				isDefault: true,
			},
			data: {
				isDefault: false,
			},
		})

		await tx.minecraftServer.update({
			where: {
				id: server.id,
			},
			data: {
				isDefault: true,
			},
		})
	})

	return {
		ok: true,
	}
})
