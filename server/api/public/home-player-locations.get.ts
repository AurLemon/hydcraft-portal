import { getQuery } from 'h3'
import { createBadRequestError } from '~/server/utils/errors'
import { getHomePlayerLocations } from '~/server/utils/minecraft/home-player-locations'
import type { HomePlayerLocationsResponse } from '~/utils/home/player-locations'

export default defineEventHandler(
	async (event): Promise<HomePlayerLocationsResponse> => {
		const query = getQuery(event)
		const sceneId = typeof query.sceneId === 'string' ? query.sceneId : ''
		const includeOverview = query.includeOverview === 'true'
		const result = await getHomePlayerLocations({ sceneId, includeOverview })

		if (!result) {
			throw createBadRequestError('HOME_SCENE_INVALID')
		}

		return result
	},
)
