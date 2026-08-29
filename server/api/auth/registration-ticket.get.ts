import { getQuery } from 'h3'
import { getRegistrationTicket } from '../../utils/auth/registration-ticket'
import { createBadRequestError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
	const token = String(getQuery(event).token ?? '').trim()

	if (!token) {
		throw createBadRequestError('REGISTRATION_TICKET_REQUIRED')
	}

	const ticket = await getRegistrationTicket(token)

	if (ticket.kind === 'GAME_ACCOUNT') {
		const payload =
			typeof ticket.payload === 'object' && ticket.payload
				? (ticket.payload as Record<string, unknown>)
				: {}

		return {
			ticket: {
				kind: ticket.kind,
				token,
				expiresAt: ticket.expiresAt,
				account: ticket.minecraftAccount
					? {
							id: ticket.minecraftAccount.id,
							username: ticket.minecraftAccount.authMeAccount?.username ?? null,
							realname: ticket.minecraftAccount.authMeAccount?.realname ?? null,
							displayName:
								ticket.minecraftAccount.authMeAccount?.realname ??
								ticket.minecraftAccount.authMeAccount?.username ??
								ticket.minecraftAccount.username,
							uuid: ticket.minecraftAccount.uuid,
							registeredAt:
								typeof payload.registeredAt === 'string'
									? payload.registeredAt
									: null,
							lastLoginAt:
								typeof payload.lastLoginAt === 'string'
									? payload.lastLoginAt
									: null,
							registerIp:
								typeof payload.registerIp === 'string'
									? payload.registerIp
									: null,
							lastIp:
								typeof payload.lastIp === 'string' ? payload.lastIp : null,
							registerIpLocation:
								typeof payload.registerIpLocation === 'object' &&
								payload.registerIpLocation
									? (payload.registerIpLocation as Record<string, unknown>)
									: null,
							lastIpLocation:
								typeof payload.lastIpLocation === 'object' &&
								payload.lastIpLocation
									? (payload.lastIpLocation as Record<string, unknown>)
									: null,
						}
					: null,
			},
		}
	}

	const payload =
		typeof ticket.payload === 'object' && ticket.payload
			? (ticket.payload as Record<string, unknown>)
			: {}

	return {
		ticket: {
			kind: ticket.kind,
			token,
			expiresAt: ticket.expiresAt,
			oauth: {
				provider: ticket.oauthProvider,
				providerAccountId:
					typeof payload.providerAccountId === 'string'
						? payload.providerAccountId
						: null,
				providerUsername:
					typeof payload.providerUsername === 'string'
						? payload.providerUsername
						: null,
				providerEmail:
					typeof payload.providerEmail === 'string'
						? payload.providerEmail
						: null,
				avatarUrl:
					typeof payload.initialAvatarUrl === 'string'
						? payload.initialAvatarUrl
						: typeof payload.avatarUrl === 'string'
							? payload.avatarUrl
							: null,
			},
		},
	}
})
