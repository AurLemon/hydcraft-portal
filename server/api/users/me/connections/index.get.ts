import { prisma } from '../../../../utils/db/prisma'
import { requireCurrentUser } from '../../../../utils/auth/session'
import {
	getOAuthProviderDefinitions,
	getOAuthProviderSummary,
} from '../../../../utils/oauth/providers'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const [accounts, minecraftCount, credential, oidcGrants] = await Promise.all([
		prisma.externalAccount.findMany({
			where: {
				userId: user.id,
			},
			orderBy: {
				updatedAt: 'desc',
			},
		}),
		prisma.minecraftAccount.count({
			where: {
				userId: user.id,
				unlinkedAt: null,
			},
		}),
		prisma.userCredential.findUnique({
			where: {
				userId: user.id,
			},
			select: {
				id: true,
			},
		}),
		prisma.oAuthClientGrant.findMany({
			where: {
				userId: user.id,
			},
			include: {
				client: {
					select: {
						name: true,
					},
				},
			},
			orderBy: {
				updatedAt: 'desc',
			},
		}),
	])
	const accountByProvider = new Map(
		accounts.map((account) => [account.provider, account]),
	)

	return {
		connections: {
			hasPassword: Boolean(credential),
			providers: getOAuthProviderDefinitions().map((definition) => {
				const account = accountByProvider.get(definition.provider)

				return {
					...getOAuthProviderSummary(definition),
					connected: Boolean(account),
					account,
				}
			}),
			minecraft: {
				count: minecraftCount,
				href: '/me/minecraft',
			},
			oidcGrants: oidcGrants.map((grant) => ({
				id: grant.id,
				clientName: grant.client.name,
				scopes: grant.scopes,
				grantedAt: grant.grantedAt.toISOString(),
				updatedAt: grant.updatedAt.toISOString(),
			})),
		},
	}
})
