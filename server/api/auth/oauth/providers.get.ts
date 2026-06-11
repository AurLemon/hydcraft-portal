import { requireCurrentUser } from '../../../utils/auth/session'
import { prisma } from '../../../utils/db/prisma'
import {
	getOAuthProviderDefinitions,
	getOAuthProviderSummary,
} from '../../../utils/oauth/providers'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const providers = getOAuthProviderDefinitions()
	const accounts = await prisma.externalAccount.findMany({
		where: {
			userId: user.id,
			provider: {
				in: providers.map((item) => item.provider),
			},
		},
		orderBy: {
			updatedAt: 'desc',
		},
	})

	return {
		providers: providers.map((definition) => {
			const account =
				accounts.find(
					(item) =>
						item.provider === definition.provider && !item.disconnectedAt,
				) ?? null

			return {
				...getOAuthProviderSummary(definition),
				isConnected: Boolean(account),
				account,
			}
		}),
	}
})
