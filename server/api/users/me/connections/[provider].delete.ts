import { requireCurrentUser } from '~/server/utils/auth/session'
import { prisma } from '~/server/utils/db/prisma'
import { createApiError, createBadRequestError } from '~/server/utils/errors'
import { emitEvent } from '~/server/utils/events/event-bus'
import { parseOAuthProvider } from '~/server/utils/oauth/providers'
import { recordSecurityEvent } from '~/server/utils/security/security-events'

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const provider = parseOAuthProvider(getRouterParam(event, 'provider'))

	if (!provider) {
		throw createBadRequestError('OAUTH_PROVIDER_INVALID')
	}

	const [account, credential, externalCount] = await Promise.all([
		prisma.externalAccount.findFirst({
			where: {
				userId: user.id,
				provider,
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
		prisma.externalAccount.count({
			where: {
				userId: user.id,
			},
		}),
	])

	if (!account) {
		throw createApiError({
			statusCode: 404,
			code: 'OAUTH_ACCOUNT_NOT_FOUND',
		})
	}

	if (!credential && externalCount <= 1) {
		throw createApiError({
			statusCode: 409,
			code: 'LAST_LOGIN_METHOD_CANNOT_BE_REMOVED',
		})
	}

	await prisma.externalAccount.delete({
		where: {
			id: account.id,
		},
	})
	await recordSecurityEvent({
		event,
		userId: user.id,
		type: 'OAUTH_UNLINKED',
		title: `${provider} 已解绑`,
		description: account.providerUsername,
		metadata: {
			provider,
			providerAccountId: account.providerAccountId,
		},
	})
	await emitEvent('user.oauth.unlinked', {
		userId: user.id,
		provider,
		externalAccountId: account.id,
		avatarAttachmentId: account.avatarAttachmentId,
		avatarUrl: account.avatarUrl,
		updatedAt: new Date(),
	})

	return {
		ok: true,
	}
})
