import { prisma } from '../../../../utils/db/prisma'
import { requireCurrentUser } from '../../../../utils/auth/session'

interface UpdateMinecraftAccountBody {
	note?: string | null
	isPrimary?: boolean
}

const normalizeOptionalText = (
	value: string | null | undefined,
): string | null | undefined => {
	if (value === undefined) {
		return undefined
	}

	const normalized = value?.trim()

	return normalized || null
}

export default defineEventHandler(async (event) => {
	const currentUser = await requireCurrentUser(event)
	const accountId = getRouterParam(event, 'accountId')
	const body = await readBody<UpdateMinecraftAccountBody>(event)

	if (!accountId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Minecraft account id is required',
		})
	}

	const account = await prisma.minecraftAccount.findFirst({
		where: {
			id: accountId,
			userId: currentUser.id,
			unlinkedAt: null,
		},
	})

	if (!account) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Minecraft account not found',
		})
	}

	const updatedAccount = await prisma.$transaction(async (tx) => {
		if (body.isPrimary) {
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
		}

		return tx.minecraftAccount.update({
			where: {
				id: accountId,
			},
			data: {
				note: normalizeOptionalText(body.note),
				isPrimary: body.isPrimary,
			},
		})
	})

	return {
		account: updatedAccount,
	}
})
