import { prisma } from '../../../utils/db/prisma'
import { requireAdminUser } from '../../../utils/auth/session'
import { createApiError } from '../../../utils/errors'

interface ReorderServersBody {
	orderedIds?: string[]
}

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const body = await readBody<ReorderServersBody>(event)
	const orderedIds = body.orderedIds ?? []

	if (!orderedIds.length) {
		throw createApiError({
			statusCode: 400,
			code: 'INVALID_MINECRAFT_SERVER_REORDER',
		})
	}

	const existing = await prisma.minecraftServer.findMany({
		select: {
			id: true,
		},
	})
	const existingIds = new Set(existing.map((item) => item.id))

	if (existing.length !== orderedIds.length) {
		throw createApiError({
			statusCode: 400,
			code: 'INVALID_MINECRAFT_SERVER_REORDER',
		})
	}

	for (const id of orderedIds) {
		if (!existingIds.has(id)) {
			throw createApiError({
				statusCode: 400,
				code: 'INVALID_MINECRAFT_SERVER_REORDER',
			})
		}
	}

	await prisma.$transaction(
		orderedIds.map((id, index) =>
			prisma.minecraftServer.update({
				where: {
					id,
				},
				data: {
					sortOrder: index,
				},
				select: {
					id: true,
				},
			}),
		),
	)

	return {
		orderedIds,
	}
})
