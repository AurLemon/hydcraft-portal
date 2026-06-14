import { getLoginMethodState } from '../../../../utils/auth/login-methods'
import { requireCurrentUser } from '../../../../utils/auth/session'
import { prisma } from '../../../../utils/db/prisma'
import { createApiError } from '../../../../utils/errors'
import { emitEvent } from '../../../../utils/events/event-bus'
import { recordSecurityEvent } from '../../../../utils/security/security-events'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const connectionId = getRouterParam(event, 'id')

	if (!connectionId) {
		throw createApiError({
			statusCode: 400,
			code: 'OAUTH_CONNECTION_ID_REQUIRED',
		})
	}

	const account = await prisma.externalAccount.findFirst({
		where: {
			id: connectionId,
			userId: user.id,
		},
	})

	if (!account) {
		throw createApiError({
			statusCode: 404,
			code: 'OAUTH_CONNECTION_NOT_FOUND',
		})
	}

	if (!account.disconnectedAt) {
		const loginMethods = await getLoginMethodState(user.id)

		if (
			!loginMethods.hasPassword &&
			loginMethods.activeExternalAccounts.length <= 1
		) {
			throw createApiError({
				statusCode: 400,
				code: 'LAST_LOGIN_METHOD_REQUIRED',
			})
		}

		await prisma.externalAccount.update({
			where: {
				id: account.id,
			},
			data: {
				disconnectedAt: new Date(),
				avatarAttachmentId: null,
				avatarUrl: null,
			},
		})
	}

	await recordSecurityEvent({
		event,
		userId: user.id,
		type: 'OAUTH_UNLINKED',
		title: 'OAuth account unlinked',
		description: account.provider,
		metadata: {
			provider: account.provider,
			providerAccountId: account.providerAccountId,
			accountId: account.id,
		},
	})

	await emitEvent('user.oauth.unlinked', {
		userId: user.id,
		provider: account.provider,
		externalAccountId: account.id,
		avatarAttachmentId: account.avatarAttachmentId,
		avatarUrl: account.avatarUrl,
		updatedAt: new Date(),
	})

	return {
		ok: true,
	}
})
