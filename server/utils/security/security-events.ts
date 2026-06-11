import { getHeader, getRequestIP, type H3Event } from 'h3'
import type { Prisma, SecurityEventType } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { emitEvent } from '../events/event-bus'

interface RecordSecurityEventOptions {
	event?: H3Event
	userId: string
	type: SecurityEventType
	title: string
	description?: string | null
	metadata?: Prisma.InputJsonValue
}

export const recordSecurityEvent = async ({
	event,
	userId,
	type,
	title,
	description,
	metadata,
}: RecordSecurityEventOptions): Promise<void> => {
	await prisma.securityEvent.create({
		data: {
			userId,
			type,
			title,
			description: description ?? null,
			ipAddress: event
				? (getRequestIP(event, { xForwardedFor: true }) ?? null)
				: null,
			userAgent: event ? (getHeader(event, 'user-agent') ?? null) : null,
			metadata,
		},
	})

	await emitEvent('user.security-event.created', {
		userId,
		type,
		createdAt: new Date(),
	})
}
