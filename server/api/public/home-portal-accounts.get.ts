import type { HomePortalAccountsResponse } from '~/utils/home/portal-accounts'
import { listHomePortalAccounts } from '~/server/utils/home/portal-accounts'

export default defineEventHandler(
	async (): Promise<HomePortalAccountsResponse> => ({
		accounts: await listHomePortalAccounts(),
	}),
)
