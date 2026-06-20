import { getRouterParam } from 'h3'
import { getPublicPlayerActivity } from '../../../../utils/minecraft/player-activity'

export default defineEventHandler(async (event) => {
	const username = getRouterParam(event, 'username') ?? ''
	const { events } = await getPublicPlayerActivity(username)

	return {
		events,
	}
})
