import type {
	MinecraftAccount,
	MinecraftAccountBindingAction,
	Prisma,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { emitEvent } from '../events/event-bus'
import { createApiError } from '../errors'
import type { VerifiedAuthMeAccount } from '../authme/verification'

type DbClient = Prisma.TransactionClient | typeof prisma

const maxDate = (left: Date | null, right: Date | null): Date | null => {
	if (!left) {
		return right
	}

	if (!right) {
		return left
	}

	return left.getTime() >= right.getTime() ? left : right
}

const createBindingHistory = async (
	tx: DbClient,
	input: {
		minecraftAccountId: string
		action: MinecraftAccountBindingAction
		actorUserId?: string | null
		targetUserId?: string | null
		previousUserId?: string | null
		reason?: string | null
		metadata?: Prisma.InputJsonValue
	},
) =>
	await tx.minecraftAccountBindingHistory.create({
		data: {
			minecraftAccountId: input.minecraftAccountId,
			action: input.action,
			actorUserId: input.actorUserId ?? null,
			targetUserId: input.targetUserId ?? null,
			previousUserId: input.previousUserId ?? null,
			reason: input.reason ?? null,
			metadata: input.metadata,
		},
	})

export const syncMinecraftAccountFromVerifiedAuthMe = async (
	account: VerifiedAuthMeAccount,
	tx: DbClient = prisma,
): Promise<MinecraftAccount> => {
	await tx.authMeAccount.upsert({
		where: {
			authmeId: account.authmeId,
		},
		create: {
			authmeId: account.authmeId,
			username: account.username,
			realname: account.realname,
			normalizedUsername: account.normalizedUsername,
			email: account.email,
			registeredAt: account.registeredAt,
			lastLoginAt: account.lastLoginAt,
			registerIp: account.registerIp,
			lastIp: account.lastIp,
			hasTotp: account.hasTotp,
			raw: account.raw,
			rawHash: null,
			syncedAt: new Date(),
		},
		update: {
			username: account.username,
			realname: account.realname,
			normalizedUsername: account.normalizedUsername,
			email: account.email,
			registeredAt: account.registeredAt,
			lastLoginAt: account.lastLoginAt,
			registerIp: account.registerIp,
			lastIp: account.lastIp,
			hasTotp: account.hasTotp,
			raw: account.raw,
			syncedAt: new Date(),
		},
	})

	const existing = await tx.minecraftAccount.findUnique({
		where: {
			normalizedUsername: account.normalizedUsername,
		},
	})
	const username = account.displayName
	const authmeName = account.displayName

	if (existing) {
		const nextStatus =
			existing.status === 'VERIFIED' || existing.status === 'IMPORTED'
				? existing.status
				: 'IMPORTED'
		const nextSource =
			existing.source === 'PORTAL' || existing.source === 'MANUAL'
				? existing.source
				: 'AUTHME'

		return await tx.minecraftAccount.update({
			where: {
				id: existing.id,
			},
			data: {
				username,
				authmeName,
				authmeId: account.authmeId,
				firstJoinedAt: account.registeredAt,
				lastSeenAt: maxDate(account.lastLoginAt, new Date()),
				status: nextStatus,
				source: nextSource,
			},
		})
	}

	return await tx.minecraftAccount.create({
		data: {
			username,
			normalizedUsername: account.normalizedUsername,
			status: 'IMPORTED',
			source: 'AUTHME',
			authmeId: account.authmeId,
			authmeName,
			firstJoinedAt: account.registeredAt,
			lastSeenAt: maxDate(account.lastLoginAt, new Date()),
		},
	})
}

export const recordMinecraftAccountVerification = async (
	input: {
		minecraftAccountId: string
		actorUserId?: string | null
		targetUserId?: string | null
		reason?: string | null
		metadata?: Prisma.InputJsonValue
	},
	tx: DbClient = prisma,
) =>
	await createBindingHistory(tx, {
		minecraftAccountId: input.minecraftAccountId,
		action: 'VERIFICATION_PASSED',
		actorUserId: input.actorUserId,
		targetUserId: input.targetUserId,
		reason: input.reason,
		metadata: input.metadata,
	})

export const bindMinecraftAccountToUserInTx = async (
	tx: DbClient,
	input: {
		minecraftAccountId: string
		userId: string
		actorUserId?: string | null
		reason?: string | null
	},
) => {
	const account = await tx.minecraftAccount.findUnique({
		where: {
			id: input.minecraftAccountId,
		},
	})

	if (!account) {
		throw createApiError({
			statusCode: 404,
			code: 'MINECRAFT_ACCOUNT_NOT_FOUND',
		})
	}

	if (account.userId === input.userId) {
		await createBindingHistory(tx, {
			minecraftAccountId: account.id,
			action: 'BIND_REJECTED_CURRENT_USER',
			actorUserId: input.actorUserId ?? input.userId,
			targetUserId: input.userId,
			previousUserId: account.userId,
			reason: input.reason,
		})
		throw createApiError({
			statusCode: 409,
			code: 'MINECRAFT_ACCOUNT_ALREADY_BOUND_TO_CURRENT_USER',
		})
	}

	if (account.userId && account.userId !== input.userId) {
		await createBindingHistory(tx, {
			minecraftAccountId: account.id,
			action: 'BIND_REJECTED_ALREADY_BOUND',
			actorUserId: input.actorUserId ?? input.userId,
			targetUserId: input.userId,
			previousUserId: account.userId,
			reason: input.reason,
		})
		throw createApiError({
			statusCode: 409,
			code: 'MINECRAFT_ACCOUNT_ALREADY_BOUND',
		})
	}

	const existingPrimary = await tx.minecraftAccount.findFirst({
		where: {
			userId: input.userId,
			unlinkedAt: null,
			isPrimary: true,
		},
		select: {
			id: true,
		},
	})
	const updatedAccount = await tx.minecraftAccount.update({
		where: {
			id: account.id,
		},
		data: {
			userId: input.userId,
			status: 'VERIFIED',
			verifiedAt: new Date(),
			unlinkedAt: null,
			isPrimary: !existingPrimary,
		},
	})

	await createBindingHistory(tx, {
		minecraftAccountId: account.id,
		action: 'BIND_CREATED',
		actorUserId: input.actorUserId ?? input.userId,
		targetUserId: input.userId,
		previousUserId: account.userId,
		reason: input.reason,
	})

	if (!existingPrimary) {
		await createBindingHistory(tx, {
			minecraftAccountId: account.id,
			action: 'PRIMARY_SET',
			actorUserId: input.actorUserId ?? input.userId,
			targetUserId: input.userId,
			previousUserId: account.userId,
			reason: 'initial-primary',
		})
	}

	return {
		account: updatedAccount,
		becamePrimary: !existingPrimary,
	}
}

export const bindMinecraftAccountToUser = async (input: {
	minecraftAccountId: string
	userId: string
	actorUserId?: string | null
	reason?: string | null
}) =>
	await prisma
		.$transaction(async (tx) => {
			return await bindMinecraftAccountToUserInTx(tx, input)
		})
		.then(async (result) => {
			await emitEvent('minecraft.account.bound', {
				userId: input.userId,
				minecraftAccountId: result.account.id,
				occurredAt: new Date(),
			})

			if (result.becamePrimary) {
				await emitEvent('minecraft.account.primary-set', {
					userId: input.userId,
					minecraftAccountId: result.account.id,
					occurredAt: new Date(),
				})
			}

			return result.account
		})

export const unbindMinecraftAccountFromUserInTx = async (
	tx: DbClient,
	input: {
		minecraftAccountId: string
		actorUserId?: string | null
		reason?: string | null
	},
) => {
	const account = await tx.minecraftAccount.findUnique({
		where: {
			id: input.minecraftAccountId,
		},
	})

	if (!account) {
		throw createApiError({
			statusCode: 404,
			code: 'MINECRAFT_ACCOUNT_NOT_FOUND',
		})
	}

	if (!account.userId || account.unlinkedAt) {
		throw createApiError({
			statusCode: 409,
			code: 'MINECRAFT_ACCOUNT_NOT_BOUND',
		})
	}

	const previousUserId = account.userId
	const unlinkedAt = new Date()
	const updatedAccount = await tx.minecraftAccount.update({
		where: {
			id: account.id,
		},
		data: {
			userId: null,
			isPrimary: false,
			status: 'UNLINKED',
			unlinkedAt,
		},
	})

	await createBindingHistory(tx, {
		minecraftAccountId: account.id,
		action: 'UNBOUND',
		actorUserId: input.actorUserId ?? previousUserId,
		targetUserId: previousUserId,
		previousUserId,
		reason: input.reason,
	})

	const nextPrimary = account.isPrimary
		? await tx.minecraftAccount.findFirst({
				where: {
					userId: previousUserId,
					unlinkedAt: null,
					id: {
						not: account.id,
					},
				},
				orderBy: [
					{
						verifiedAt: 'desc',
					},
					{
						updatedAt: 'desc',
					},
				],
			})
		: null

	if (nextPrimary) {
		await tx.minecraftAccount.update({
			where: {
				id: nextPrimary.id,
			},
			data: {
				isPrimary: true,
			},
		})

		await createBindingHistory(tx, {
			minecraftAccountId: nextPrimary.id,
			action: 'PRIMARY_SET',
			actorUserId: input.actorUserId ?? previousUserId,
			targetUserId: previousUserId,
			previousUserId,
			reason: 'primary-promoted-after-unbind',
		})
	}

	return {
		account: updatedAccount,
		previousUserId,
		nextPrimaryAccountId: nextPrimary?.id ?? null,
	}
}

export const unbindMinecraftAccountFromUser = async (input: {
	minecraftAccountId: string
	actorUserId?: string | null
	reason?: string | null
}) =>
	await prisma
		.$transaction(async (tx) => {
			return await unbindMinecraftAccountFromUserInTx(tx, input)
		})
		.then(async (result) => {
			await emitEvent('minecraft.account.unbound', {
				userId: result.previousUserId,
				minecraftAccountId: result.account.id,
				occurredAt: new Date(),
			})

			if (result.nextPrimaryAccountId) {
				await emitEvent('minecraft.account.primary-set', {
					userId: result.previousUserId,
					minecraftAccountId: result.nextPrimaryAccountId,
					occurredAt: new Date(),
				})
			}

			return result.account
		})
