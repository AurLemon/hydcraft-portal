import { requireCurrentUser } from '../../../../utils/auth/session'
import { prisma } from '../../../../utils/db/prisma'
import { createApiError, createBadRequestError } from '../../../../utils/errors'
import { unbindMinecraftAccountFromUser } from '../../../../utils/minecraft/account-binding'

export default defineEventHandler(async (event) => {
	const currentUser = await requireCurrentUser(event)
	const accountId = getRouterParam(event, 'accountId')

	if (!accountId) {
		throw createBadRequestError('MINECRAFT_ACCOUNT_ID_REQUIRED')
	}

	const account = await prisma.minecraftAccount.findFirst({
		where: {
			id: accountId,
			userId: currentUser.id,
			unlinkedAt: null,
		},
		select: {
			id: true,
		},
	})

	if (!account) {
		throw createApiError({
			statusCode: 404,
			code: 'MINECRAFT_ACCOUNT_NOT_FOUND',
		})
	}

	const updatedAccount = await unbindMinecraftAccountFromUser({
		minecraftAccountId: accountId,
		actorUserId: currentUser.id,
		reason: 'self-service-unbind',
	})

	return {
		account: updatedAccount,
	}
})
