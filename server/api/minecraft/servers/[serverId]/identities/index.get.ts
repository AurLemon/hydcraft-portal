import { prisma } from '../../../../../utils/db/prisma'

export default defineEventHandler(async (event) => {
	const serverId = getRouterParam(event, 'serverId') ?? ''
	const identities = await prisma.serverPlayerIdentity.findMany({
		where: {
			serverId,
		},
		orderBy: {
			lastSeenAt: 'desc',
		},
		take: 100,
	})

	return {
		identities,
	}
})
