import { getRouterParam } from 'h3'
import { getPublicMinecraftAccounts } from '../../../../../utils/profile/queries'

export default defineEventHandler(async (event) => {
	const username = getRouterParam(event, 'username') ?? ''
	const { accounts } = await getPublicMinecraftAccounts(username)

	return {
		accounts,
	}
})
