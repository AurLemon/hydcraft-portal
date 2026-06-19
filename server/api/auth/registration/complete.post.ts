import { issueAuthCookies, toUserSummary } from '../../../utils/auth/session'
import { completeRegistrationFromTicket } from '../../../utils/auth/registration-completion'
import { getRegistrationTicket } from '../../../utils/auth/registration-ticket'
import { prisma } from '../../../utils/db/prisma'
import { createBadRequestError } from '../../../utils/errors'
import { emitEvent } from '../../../utils/events/event-bus'
import { recordSecurityEvent } from '../../../utils/security/security-events'

interface RegistrationCompleteBody {
	ticketToken: string
	handle: string
	email: string
	code?: string
}

export default defineEventHandler(async (event) => {
	const body = await readBody<RegistrationCompleteBody>(event)
	const ticketToken = body.ticketToken?.trim()

	if (!ticketToken) {
		throw createBadRequestError('REGISTRATION_TICKET_REQUIRED')
	}

	const ticket = await getRegistrationTicket(ticketToken)
	const user = await completeRegistrationFromTicket({
		ticketToken,
		handle: body.handle,
		email: body.email,
		code: body.code,
	})
	const userWithPreferences = await prisma.user.findUniqueOrThrow({
		where: {
			id: user.id,
		},
		include: {
			preferences: {
				select: {
					language: true,
				},
			},
		},
	})
	const token = await issueAuthCookies(event, userWithPreferences)

	if (ticket.kind === 'GAME_ACCOUNT' && ticket.minecraftAccountId) {
		await emitEvent('minecraft.account.bound', {
			userId: user.id,
			minecraftAccountId: ticket.minecraftAccountId,
			occurredAt: new Date(),
		})
		await emitEvent('minecraft.account.primary-set', {
			userId: user.id,
			minecraftAccountId: ticket.minecraftAccountId,
			occurredAt: new Date(),
		})
		await recordSecurityEvent({
			event,
			userId: user.id,
			type: 'MINECRAFT_ACCOUNT_BOUND',
			title: '已绑定 Minecraft 账号',
			description: ticket.minecraftAccount?.username ?? null,
			metadata: {
				minecraftAccountId: ticket.minecraftAccountId,
			},
		})
		await recordSecurityEvent({
			event,
			userId: user.id,
			type: 'LOGIN_SUCCESS',
			title: '游戏账号注册并登录成功',
			description: ticket.minecraftAccount?.username ?? null,
		})
	} else if (ticket.kind === 'OAUTH' && ticket.oauthProvider) {
		const externalAccount = await prisma.externalAccount.findFirstOrThrow({
			where: {
				userId: user.id,
				provider: ticket.oauthProvider,
			},
		})
		await recordSecurityEvent({
			event,
			userId: user.id,
			type: 'LOGIN_SUCCESS',
			title: `${ticket.oauthProvider} OAuth 注册并登录成功`,
		})
		await emitEvent('user.oauth.linked', {
			userId: user.id,
			provider: ticket.oauthProvider,
			providerAccountId: externalAccount.providerAccountId,
			externalAccountId: externalAccount.id,
			updatedAt: new Date(),
		})
	}

	return {
		token,
		user: toUserSummary(userWithPreferences),
	}
})
