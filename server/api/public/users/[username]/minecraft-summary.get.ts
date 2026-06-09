import { getRouterParam } from 'h3'
import { getPublicMinecraftSummary } from '../../../../utils/profile/queries'

export default defineEventHandler(async (event) => {
	const username = getRouterParam(event, 'username') ?? ''
	const minecraftSummary = await getPublicMinecraftSummary(username)

	return {
		minecraftSummary,
	}
})
