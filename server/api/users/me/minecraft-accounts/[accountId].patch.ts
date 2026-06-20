import { requireCurrentUser } from '../../../../utils/auth/session'
import { createApiError, createBadRequestError } from '../../../../utils/errors'
import { setPrimaryMinecraftAccount } from '../../../../utils/minecraft/account-binding'

interface UpdateMinecraftAccountBody {
	isPrimary?: boolean
}

export default defineEventHandler(async (event) => {
	const currentUser = await requireCurrentUser(event)
	const accountId = getRouterParam(event, 'accountId')
	const body = await readBody<UpdateMinecraftAccountBody>(event)

	if (!accountId) {
		throw createBadRequestError('MINECRAFT_ACCOUNT_ID_REQUIRED')
	}

	const account = await prisma.minecraftAccount.findFirst({
		where: {
			id: accountId,
			userId: currentUser.id,
			unlinkedAt: null,
		},
	})

	if (!account) {
		throw createApiError({
			statusCode: 404,
			code: 'MINECRAFT_ACCOUNT_NOT_FOUND',
		})
	}

	if (!body.isPrimary) {
		throw createBadRequestError('MINECRAFT_PRIMARY_ACCOUNT_REQUIRED')
	}

	const updatedAccount = await setPrimaryMinecraftAccount({
		minecraftAccountId: accountId,
		userId: currentUser.id,
		actorUserId: currentUser.id,
		reason: 'self-service-primary-set',
	})

	return {
		account: updatedAccount,
	}
})
