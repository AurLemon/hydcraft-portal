import type { ExternalAccount } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'

export interface LoginMethodState {
	hasPassword: boolean
	activeExternalAccounts: Pick<
		ExternalAccount,
		'id' | 'provider' | 'providerAccountId'
	>[]
	count: number
}

export const getLoginMethodState = async (
	userId: string,
): Promise<LoginMethodState> => {
	const [credential, activeExternalAccounts] = await Promise.all([
		prisma.userCredential.findUnique({
			where: {
				userId,
			},
			select: {
				id: true,
			},
		}),
		prisma.externalAccount.findMany({
			where: {
				userId,
			},
			select: {
				id: true,
				provider: true,
				providerAccountId: true,
			},
		}),
	])

	return {
		hasPassword: Boolean(credential),
		activeExternalAccounts,
		count: (credential ? 1 : 0) + activeExternalAccounts.length,
	}
}
