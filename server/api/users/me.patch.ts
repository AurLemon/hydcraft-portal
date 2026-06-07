import { prisma } from '../../utils/db/prisma'
import { requireCurrentUser, toUserSummary } from '../../utils/auth/session'

interface UpdateMeBody {
	displayName?: string | null
	avatarUrl?: string | null
	bio?: string | null
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
	const body = await readBody<UpdateMeBody>(event)
	const user = await prisma.user.update({
		where: {
			id: currentUser.id,
		},
		data: {
			displayName: normalizeOptionalText(body.displayName),
			avatarUrl: normalizeOptionalText(body.avatarUrl),
			bio: normalizeOptionalText(body.bio),
		},
	})

	return {
		user: toUserSummary(user),
	}
})
