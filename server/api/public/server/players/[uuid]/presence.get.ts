import { getQuery, getRouterParam } from 'h3'
import { createApiError } from '~/server/utils/errors'
import { getPublicServerPlayerPresence } from '~/server/utils/server/public-player-presence'

export default defineEventHandler(async (event) => {
	const uuid = getRouterParam(event, 'uuid')?.trim() ?? ''
	const query = getQuery(event)
	const serverId =
		typeof query['serverId'] === 'string' ? query['serverId'].trim() : ''

	if (!uuid || !serverId) {
		throw createApiError({
			statusCode: 400,
			code: 'INVALID_REQUEST',
		})
	}

	return await getPublicServerPlayerPresence(serverId, uuid)
})
