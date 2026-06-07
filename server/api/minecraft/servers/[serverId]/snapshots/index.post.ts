import type { Prisma } from '~/generated/prisma/client'
import { prisma } from '../../../../../utils/db/prisma'
import { requireAdminUser } from '../../../../../utils/auth/session'

interface CreateServerSnapshotBody {
	kind: string
	observedAt?: string
	payload: unknown
}

const snapshotKinds = new Set([
	'SERVER_INFO',
	'SERVER_STATUS',
	'WORLDS',
	'ONLINE_PLAYERS',
	'METRICS',
	'HEARTBEAT',
	'PLAYER_SNAPSHOT',
	'PLAYERDATA_SCAN',
	'STATS_SNAPSHOT',
	'ADVANCEMENTS_SNAPSHOT',
	'COMMAND_RESULT',
])

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const serverId = getRouterParam(event, 'serverId') ?? ''
	const body = await readBody<CreateServerSnapshotBody>(event)

	if (!snapshotKinds.has(body.kind)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid snapshot kind',
		})
	}

	const snapshot = await prisma.minecraftServerSnapshot.create({
		data: {
			serverId,
			kind: body.kind as never,
			observedAt: body.observedAt ? new Date(body.observedAt) : new Date(),
			payload: body.payload as Prisma.InputJsonValue,
		},
	})

	return {
		snapshot,
	}
})
