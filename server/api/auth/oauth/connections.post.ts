import type { ExternalProvider, Prisma } from '~/generated/prisma/client'
import { requireCurrentUser } from '../../../utils/auth/session'
import { prisma } from '../../../utils/db/prisma'
import { createApiError } from '../../../utils/errors'
import { queuePostCommitEvent } from '../../../utils/events/post-commit'
import { recordSecurityEvent } from '../../../utils/security/security-events'

interface ConnectOAuthBody {
	provider: ExternalProvider
	providerAccountId: string
	providerUsername?: string | null
	providerEmail?: string | null
	avatarUrl?: string | null
	scope?: string | null
	rawProfile?: Prisma.InputJsonValue
}

const connectableProviders: ExternalProvider[] = [
	'GITHUB',
	'GOOGLE',
	'MICROSOFT',
	'QQ',
	'MINECRAFT',
]

export default defineEventHandler(async (event) => {
	const user = await requireCurrentUser(event)
	const body = await readBody<ConnectOAuthBody>(event)
	const provider = body.provider
	const providerAccountId = body.providerAccountId?.trim()

	if (!connectableProviders.includes(provider)) {
		throw createApiError({ statusCode: 400, code: 'OAUTH_PROVIDER_INVALID' })
	}

	if (!providerAccountId) {
		throw createApiError({
			statusCode: 400,
			code: 'OAUTH_PROVIDER_ACCOUNT_ID_REQUIRED',
		})
	}

	const existing = await prisma.externalAccount.findUnique({
		where: {
			provider_providerAccountId: {
				provider,
				providerAccountId,
			},
		},
	})

	if (existing && existing.userId !== user.id) {
		throw createApiError({
			statusCode: 409,
			code: 'OAUTH_ACCOUNT_ALREADY_LINKED',
		})
	}
	const replacedAccounts = await prisma.externalAccount.findMany({
		where: {
			userId: user.id,
			provider,
			providerAccountId: {
				not: providerAccountId,
			},
		},
	})

	const account = await prisma.$transaction(async (tx) => {
		if (replacedAccounts.length) {
			await tx.externalAccount.deleteMany({
				where: {
					id: {
						in: replacedAccounts.map((item) => item.id),
					},
				},
			})
		}

		return tx.externalAccount.upsert({
			where: {
				provider_providerAccountId: {
					provider,
					providerAccountId,
				},
			},
			create: {
				userId: user.id,
				provider,
				providerAccountId,
				providerUsername: body.providerUsername?.trim() || null,
				providerEmail: body.providerEmail?.trim().toLowerCase() || null,
				avatarUrl: body.avatarUrl?.trim() || null,
				scope: body.scope?.trim() || null,
				rawProfile: body.rawProfile,
				connectedAt: new Date(),
				lastUsedAt: new Date(),
				disconnectedAt: null,
			},
			update: {
				providerUsername: body.providerUsername?.trim() || null,
				providerEmail: body.providerEmail?.trim().toLowerCase() || null,
				avatarUrl: body.avatarUrl?.trim() || null,
				scope: body.scope?.trim() || null,
				rawProfile: body.rawProfile,
				lastUsedAt: new Date(),
				disconnectedAt: null,
			},
		})
	})

	await recordSecurityEvent({
		event,
		userId: user.id,
		type: 'OAUTH_LINKED',
		title: 'OAuth account linked',
		description: provider,
		metadata: {
			provider,
			providerAccountId,
			accountId: account.id,
		},
	})

	for (const replacedAccount of replacedAccounts) {
		queuePostCommitEvent('user.oauth.unlinked', {
			userId: user.id,
			provider,
			externalAccountId: replacedAccount.id,
			avatarAttachmentId: replacedAccount.avatarAttachmentId,
			avatarUrl: replacedAccount.avatarUrl,
		})
	}

	return {
		ok: true,
		account,
	}
})
