import { createHash, randomBytes } from 'node:crypto'
import type {
	AuthRegistrationTicket,
	AuthRegistrationTicketKind,
	Prisma,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { createApiError } from '../errors'

const REGISTRATION_TICKET_TTL_MS = 15 * 60 * 1000

const hashRegistrationTicketToken = (token: string): string =>
	createHash('sha256')
		.update(`${process.env.JWT_SECRET ?? 'dev'}:registration-ticket:${token}`)
		.digest('hex')

const createRegistrationTicketTokenValue = (): string =>
	randomBytes(32).toString('base64url')

interface CreateRegistrationTicketInput {
	kind: AuthRegistrationTicketKind
	minecraftAccountId?: string | null
	oauthProvider?: AuthRegistrationTicket['oauthProvider']
	payload?: Prisma.InputJsonValue
}

export const createRegistrationTicket = async (
	input: CreateRegistrationTicketInput,
): Promise<{ ticket: AuthRegistrationTicket; token: string }> => {
	const token = createRegistrationTicketTokenValue()
	const now = new Date()
	const expiresAt = new Date(now.getTime() + REGISTRATION_TICKET_TTL_MS)
	const ticket = await prisma.authRegistrationTicket.create({
		data: {
			kind: input.kind,
			minecraftAccountId: input.minecraftAccountId ?? null,
			oauthProvider: input.oauthProvider ?? null,
			payload: input.payload ?? undefined,
			tokenHash: hashRegistrationTicketToken(token),
			expiresAt,
			deleteAfter: expiresAt,
		},
	})

	return {
		ticket,
		token,
	}
}

const findValidRegistrationTicket = async (token: string) =>
	await prisma.authRegistrationTicket.findFirst({
		where: {
			tokenHash: hashRegistrationTicketToken(token),
			consumedAt: null,
			expiresAt: {
				gt: new Date(),
			},
		},
		include: {
			minecraftAccount: {
				include: {
					authMeAccount: true,
				},
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
	})

export const getRegistrationTicket = async (token: string) => {
	const ticket = await findValidRegistrationTicket(token)

	if (!ticket) {
		throw createApiError({
			statusCode: 404,
			code: 'REGISTRATION_TICKET_NOT_FOUND',
		})
	}

	return ticket
}

export const consumeRegistrationTicket = async (token: string) => {
	const ticket = await findValidRegistrationTicket(token)

	if (!ticket) {
		throw createApiError({
			statusCode: 404,
			code: 'REGISTRATION_TICKET_NOT_FOUND',
		})
	}

	return await prisma.authRegistrationTicket.update({
		where: {
			id: ticket.id,
		},
		data: {
			consumedAt: new Date(),
		},
		include: {
			minecraftAccount: {
				include: {
					authMeAccount: true,
				},
			},
		},
	})
}
