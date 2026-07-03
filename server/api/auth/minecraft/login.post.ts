import { issueAuthCookies, toUserSummary } from '../../../utils/auth/session'
import { createRegistrationTicket } from '../../../utils/auth/registration-ticket'
import { prisma } from '../../../utils/db/prisma'
import { createApiError } from '../../../utils/errors'
import {
	recordMinecraftAccountVerification,
	syncMinecraftAccountFromVerifiedAuthMe,
} from '../../../utils/minecraft/account-binding'
import { validateCapToken } from '../../../utils/security/cap'
import { recordSecurityEvent } from '../../../utils/security/security-events'
import { verifyAuthMeCredentials } from '../../../utils/authme/verification'

interface MinecraftLoginBody {
	username: string
	password: string
	captchaToken?: string
}

export default defineEventHandler(async (event) => {
	const body = await readBody<MinecraftLoginBody>(event)
	await validateCapToken({
		token: body.captchaToken,
	})

	const verifiedAccount = await verifyAuthMeCredentials(
		body.username,
		body.password,
	)
	const minecraftAccount = await prisma.$transaction(async (tx) => {
		return await syncMinecraftAccountFromVerifiedAuthMe(verifiedAccount, tx)
	})

	if (!minecraftAccount.userId) {
		const { token } = await createRegistrationTicket({
			kind: 'GAME_ACCOUNT',
			minecraftAccountId: minecraftAccount.id,
			payload: {
				username: verifiedAccount.username,
				realname: verifiedAccount.realname,
			},
		})
		await recordMinecraftAccountVerification({
			minecraftAccountId: minecraftAccount.id,
			reason: 'login-register-handoff',
			metadata: {
				username: verifiedAccount.username,
				flow: 'login',
			},
		})
		throw createApiError({
			statusCode: 409,
			code: 'MINECRAFT_ACCOUNT_NOT_BOUND',
			data: {
				registrationToken: token,
			},
		})
	}

	const existingUser = await prisma.user.findUniqueOrThrow({
		where: {
			id: minecraftAccount.userId,
		},
		include: {
			preferences: {
				select: {
					language: true,
				},
			},
		},
	})

	if (existingUser.status !== 'ACTIVE') {
		throw createApiError({
			statusCode: 403,
			code: 'MINECRAFT_ACCOUNT_OWNER_UNAVAILABLE',
		})
	}

	const user = await prisma.user.update({
		where: {
			id: existingUser.id,
		},
		data: {
			lastLoginAt: new Date(),
		},
		include: {
			preferences: {
				select: {
					language: true,
				},
			},
		},
	})

	const token = await issueAuthCookies(event, user)
	await recordSecurityEvent({
		event,
		userId: user.id,
		type: 'LOGIN_SUCCESS',
		title: '游戏账号登录成功',
		description: verifiedAccount.displayName,
		metadata: {
			authmeId: verifiedAccount.authmeId,
			username: verifiedAccount.username,
			realname: verifiedAccount.realname,
		},
	})

	return {
		token,
		user: toUserSummary(user),
	}
})
