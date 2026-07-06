import type { ExternalProvider, Prisma, User } from '~/generated/prisma/client'
import { getAttachmentService } from '../attachment/runtime'
import { prisma } from '../db/prisma'
import { createApiError } from '../errors'
import { ensureUserProfileDefaults } from '../profile/defaults'
import { createUniqueHydrolineId } from '../profile/hydroline-id'
import {
	normalizeUsername,
	normalizeUsernameForComparison,
} from '../profile/validation'
import { consumeAuthEmailCode } from './email-code'
import { assertEmail, assertHandle } from './validation'
import { getRegistrationTicket } from './registration-ticket'
import { bindMinecraftAccountToUserInTx } from '../minecraft/account-binding'

interface OAuthRegistrationPayload {
	providerAccountId: string
	providerUsername: string | null
	providerEmail: string | null
	avatarAttachmentId: string | null
	avatarUrl: string | null
	accessToken: string | null
	scope: string | null
	rawProfile: Prisma.JsonValue | null
}

interface CompleteRegistrationInput {
	ticketToken: string
	handle: string
	email: string
	code?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null

const normalizeOAuthRegistrationPayload = (
	value: unknown,
): OAuthRegistrationPayload | null => {
	if (!isRecord(value) || typeof value.providerAccountId !== 'string') {
		return null
	}

	return {
		providerAccountId: value.providerAccountId,
		providerUsername:
			typeof value.providerUsername === 'string'
				? value.providerUsername
				: null,
		providerEmail:
			typeof value.providerEmail === 'string' ? value.providerEmail : null,
		avatarAttachmentId:
			typeof value.avatarAttachmentId === 'string'
				? value.avatarAttachmentId
				: null,
		avatarUrl: typeof value.avatarUrl === 'string' ? value.avatarUrl : null,
		accessToken:
			typeof value.accessToken === 'string' ? value.accessToken : null,
		scope: typeof value.scope === 'string' ? value.scope : null,
		rawProfile: (value.rawProfile as Prisma.JsonValue | undefined) ?? null,
	}
}

const normalizeRegistrationUniqError = (error: unknown): never => {
	const code = (error as { code?: string } | null)?.code
	const target = (error as { meta?: { target?: string[] } } | null)?.meta
		?.target

	if (code === 'P2002' && Array.isArray(target)) {
		if (target.includes('handle') || target.includes('username')) {
			throw createApiError({
				statusCode: 409,
				code: 'HANDLE_ALREADY_IN_USE',
			})
		}

		if (target.includes('email')) {
			throw createApiError({
				statusCode: 409,
				code: 'EMAIL_ALREADY_IN_USE',
			})
		}

		if (target.includes('provider') || target.includes('providerAccountId')) {
			throw createApiError({
				statusCode: 409,
				code: 'OAUTH_ACCOUNT_ALREADY_LINKED',
			})
		}
	}

	throw error
}

const createUserShell = async (
	tx: Prisma.TransactionClient,
	input: {
		handle: string
		username: string
		email: string
		displayName: string | null
		avatarUrl?: string | null
	},
): Promise<User> => {
	const now = new Date()
	const normalizedUsername = normalizeUsernameForComparison(input.username)
	const existingUser = await tx.user.findFirst({
		where: {
			OR: [
				{ handle: input.handle },
				{
					username: {
						equals: normalizedUsername,
						mode: 'insensitive',
					},
				},
				{ email: input.email },
			],
		},
		select: {
			handle: true,
			username: true,
			email: true,
		},
	})

	if (
		existingUser?.handle === input.handle ||
		normalizeUsernameForComparison(existingUser?.username ?? '') ===
			normalizedUsername
	) {
		throw createApiError({
			statusCode: 409,
			code: 'HANDLE_ALREADY_IN_USE',
		})
	}

	if (existingUser?.email === input.email) {
		throw createApiError({
			statusCode: 409,
			code: 'EMAIL_ALREADY_IN_USE',
		})
	}

	const existingEmail = await tx.userEmail.findUnique({
		where: {
			email: input.email,
		},
		select: {
			userId: true,
		},
	})

	if (existingEmail) {
		throw createApiError({
			statusCode: 409,
			code: 'EMAIL_ALREADY_IN_USE',
		})
	}

	const hydrolineId = await createUniqueHydrolineId()

	return await tx.user.create({
		data: {
			handle: input.handle,
			username: input.username,
			hydrolineId,
			displayName: input.displayName ?? input.username,
			email: input.email,
			emailVerifiedAt: now,
			avatarUrl: input.avatarUrl ?? null,
			role: 'USER',
			status: 'ACTIVE',
			emails: {
				create: {
					email: input.email,
					kind: 'PRIMARY',
					verifiedAt: now,
				},
			},
		},
	})
}

export const completeRegistrationFromTicket = async (
	input: CompleteRegistrationInput,
): Promise<User> => {
	const rawHandle = input.handle ?? ''
	const handle = assertHandle(rawHandle)
	const username = normalizeUsername(rawHandle)
	const email = assertEmail(input.email)
	const code = input.code?.trim() ?? ''

	if (!code) {
		throw createApiError({
			statusCode: 400,
			code: 'EMAIL_VERIFICATION_CODE_REQUIRED',
		})
	}

	const verifiedEmail = await consumeAuthEmailCode(
		email,
		code,
		'EMAIL_REGISTER',
	)
	const ticket = await getRegistrationTicket(input.ticketToken)

	try {
		const user = await prisma.$transaction(async (tx) => {
			if (ticket.kind === 'GAME_ACCOUNT') {
				if (!ticket.minecraftAccount) {
					throw createApiError({
						statusCode: 400,
						code: 'REGISTRATION_TICKET_INVALID',
					})
				}

				const createdUser = await createUserShell(tx, {
					handle,
					username,
					email: verifiedEmail,
					displayName: username,
				})
				await bindMinecraftAccountToUserInTx(tx, {
					minecraftAccountId: ticket.minecraftAccount.id,
					userId: createdUser.id,
					actorUserId: createdUser.id,
					reason: 'registration-complete',
				})
				await tx.authRegistrationTicket.update({
					where: {
						id: ticket.id,
					},
					data: {
						consumedAt: new Date(),
					},
				})

				return createdUser
			}

			if (ticket.kind !== 'OAUTH') {
				throw createApiError({
					statusCode: 400,
					code: 'REGISTRATION_TICKET_INVALID',
				})
			}

			const payload = normalizeOAuthRegistrationPayload(ticket.payload)

			if (!payload || !ticket.oauthProvider) {
				throw createApiError({
					statusCode: 400,
					code: 'REGISTRATION_TICKET_INVALID',
				})
			}

			const createdUser = await createUserShell(tx, {
				handle,
				username,
				email: verifiedEmail,
				displayName: payload.providerUsername ?? username,
				avatarUrl: payload.avatarUrl,
			})
			const externalAccount = await tx.externalAccount.create({
				data: {
					userId: createdUser.id,
					provider: ticket.oauthProvider as ExternalProvider,
					providerAccountId: payload.providerAccountId,
					avatarAttachmentId: payload.avatarAttachmentId,
					providerUsername: payload.providerUsername,
					providerEmail: payload.providerEmail,
					avatarUrl: payload.avatarUrl,
					scope: payload.scope,
					rawProfile:
						(payload.rawProfile as Prisma.InputJsonValue | null) ?? undefined,
					lastUsedAt: new Date(),
				},
			})

			if (payload.avatarAttachmentId) {
				await tx.attachment.update({
					where: {
						id: payload.avatarAttachmentId,
					},
					data: {
						ownerType: 'external-account',
						ownerId: externalAccount.id,
						expiresAt: null,
					},
				})
			}
			await tx.authRegistrationTicket.update({
				where: {
					id: ticket.id,
				},
				data: {
					consumedAt: new Date(),
				},
			})

			return createdUser
		})

		await ensureUserProfileDefaults(user.id)

		return user
	} catch (error) {
		throw normalizeRegistrationUniqError(error)
	}
}
