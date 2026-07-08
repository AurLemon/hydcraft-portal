import { getRouterParam } from 'h3'
import { getPublicHistoricalMinecraftAccounts } from '../../../../../utils/minecraft/historical-accounts'

export default defineEventHandler(async (event) => {
	const username = getRouterParam(event, 'username') ?? ''

	return {
		accounts: await getPublicHistoricalMinecraftAccounts(username),
	}
})
