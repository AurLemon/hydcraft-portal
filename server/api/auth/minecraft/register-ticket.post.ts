import { createRegistrationTicket } from '../../../utils/auth/registration-ticket'
import { prisma } from '../../../utils/db/prisma'
import { createApiError } from '../../../utils/errors'
import type { Prisma } from '~/generated/prisma/client'
import {
	lookupIpLocation,
	normalizeIpAddressForDisplay,
} from '../../../utils/ip-location/ip-location'
import {
	recordMinecraftAccountVerification,
	syncMinecraftAccountFromVerifiedAuthMe,
} from '../../../utils/minecraft/account-binding'
import { verifyAuthMeCredentials } from '../../../utils/authme/verification'

interface MinecraftRegisterTicketBody {
	username: string
	password: string
}

export default defineEventHandler(async (event) => {
	const body = await readBody<MinecraftRegisterTicketBody>(event)

	const verifiedAccount = await verifyAuthMeCredentials(
		body.username,
		body.password,
	)
	const minecraftAccount = await prisma.$transaction(async (tx) => {
		return await syncMinecraftAccountFromVerifiedAuthMe(verifiedAccount, tx)
	})

	if (minecraftAccount.userId) {
		throw createApiError({
			statusCode: 409,
			code: 'MINECRAFT_ACCOUNT_ALREADY_BOUND',
		})
	}

	const [registerIpLocation, lastIpLocation] = await Promise.all([
		lookupIpLocation(verifiedAccount.registerIp),
		lookupIpLocation(verifiedAccount.lastIp),
	])
	const registrationPayload = JSON.parse(
		JSON.stringify({
			username: verifiedAccount.username,
			realname: verifiedAccount.realname,
			registeredAt: verifiedAccount.registeredAt?.toISOString() ?? null,
			lastLoginAt: verifiedAccount.lastLoginAt?.toISOString() ?? null,
			registerIp:
				normalizeIpAddressForDisplay(verifiedAccount.registerIp) ??
				verifiedAccount.registerIp,
			lastIp:
				normalizeIpAddressForDisplay(verifiedAccount.lastIp) ??
				verifiedAccount.lastIp,
			registerIpLocation,
			lastIpLocation,
		}),
	) as unknown as Prisma.InputJsonValue

	const { token } = await createRegistrationTicket({
		kind: 'GAME_ACCOUNT',
		minecraftAccountId: minecraftAccount.id,
		payload: registrationPayload,
	})
	await recordMinecraftAccountVerification({
		minecraftAccountId: minecraftAccount.id,
		reason: 'registration-ticket-created',
		metadata: {
			username: verifiedAccount.username,
			flow: 'register',
		},
	})

	return {
		registrationToken: token,
		account: {
			id: minecraftAccount.id,
			username: verifiedAccount.username,
			realname: verifiedAccount.realname,
			displayName: verifiedAccount.displayName,
			uuid: minecraftAccount.uuid,
			registeredAt: verifiedAccount.registeredAt?.toISOString() ?? null,
			lastLoginAt: verifiedAccount.lastLoginAt?.toISOString() ?? null,
			registerIp:
				normalizeIpAddressForDisplay(verifiedAccount.registerIp) ??
				verifiedAccount.registerIp,
			lastIp:
				normalizeIpAddressForDisplay(verifiedAccount.lastIp) ??
				verifiedAccount.lastIp,
			registerIpLocation,
			lastIpLocation,
		},
	}
})
