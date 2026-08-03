import { requireCurrentUser } from '../../../../utils/auth/session'
import { prisma } from '../../../../utils/db/prisma'
import { createApiError } from '../../../../utils/errors'
import {
	bindMinecraftAccountToUser,
	recordMinecraftAccountVerification,
	syncMinecraftAccountFromVerifiedAuthMe,
} from '../../../../utils/minecraft/account-binding'
import { validateTurnstileToken } from '../../../../utils/security/turnstile'
import { TURNSTILE_ACTIONS } from '~/utils/security/turnstile-actions'
import { recordSecurityEvent } from '../../../../utils/security/security-events'
import { verifyAuthMeCredentials } from '../../../../utils/authme/verification'

interface BindMinecraftAccountBody {
	username: string
	password: string
	captchaToken?: string
}

export default defineEventHandler(async (event) => {
	const currentUser = await requireCurrentUser(event)
	const body = await readBody<BindMinecraftAccountBody>(event)
	await validateTurnstileToken({
		event,
		token: body.captchaToken,
		action: TURNSTILE_ACTIONS.MINECRAFT_BIND,
	})
	const verifiedAccount = await verifyAuthMeCredentials(
		body.username,
		body.password,
	)
	const minecraftAccount = await prisma.$transaction(async (tx) => {
		return await syncMinecraftAccountFromVerifiedAuthMe(verifiedAccount, tx)
	})

	if (minecraftAccount.userId && minecraftAccount.userId !== currentUser.id) {
		throw createApiError({
			statusCode: 409,
			code: 'MINECRAFT_ACCOUNT_ALREADY_BOUND',
		})
	}

	await recordMinecraftAccountVerification({
		minecraftAccountId: minecraftAccount.id,
		actorUserId: currentUser.id,
		targetUserId: currentUser.id,
		reason: 'me-bind',
		metadata: {
			authmeId: verifiedAccount.authmeId,
			username: verifiedAccount.username,
		},
	})
	const boundAccount = await bindMinecraftAccountToUser({
		minecraftAccountId: minecraftAccount.id,
		userId: currentUser.id,
		actorUserId: currentUser.id,
		reason: 'me-bind',
	})

	await recordSecurityEvent({
		event,
		userId: currentUser.id,
		type: 'MINECRAFT_ACCOUNT_BOUND',
		title: '已绑定 Minecraft 账号',
		description: verifiedAccount.displayName,
		metadata: {
			minecraftAccountId: boundAccount.id,
			authmeId: verifiedAccount.authmeId,
			username: verifiedAccount.username,
			realname: verifiedAccount.realname,
		},
	})

	return {
		account: {
			id: boundAccount.id,
		},
	}
})
