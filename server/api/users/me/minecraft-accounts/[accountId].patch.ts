import { prisma } from '../../../../utils/db/prisma'
import { requireCurrentUser } from '../../../../utils/auth/session'
import { createApiError, createBadRequestError } from '../../../../utils/errors'

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

	const updatedAccount = await prisma.$transaction(async (tx) => {
		if (!body.isPrimary) {
			throw createBadRequestError('MINECRAFT_PRIMARY_ACCOUNT_REQUIRED')
		}

		await tx.minecraftAccount.updateMany({
			where: {
				userId: currentUser.id,
				id: {
					not: accountId,
				},
			},
			data: {
				isPrimary: false,
			},
		})

		return tx.minecraftAccount.update({
			where: {
				id: accountId,
			},
			data: {
				isPrimary: true,
			},
		})
	})

	return {
		account: updatedAccount,
	}
})
