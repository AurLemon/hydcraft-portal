import { prisma } from '../db/prisma'
import { onEvent } from '../events/event-bus'
import { upsertMinecraftServerPlayerFromIdentity } from './server-player'

let registered = false

export const projectServerPlayerIdentityEvidence = async (payload: {
	serverId: string
	uuid?: string | null
	username?: string | null
	normalizedUsername?: string | null
	uuidSource?: string | null
	observedAt: Date
}): Promise<void> => {
	if (!payload.uuid) {
		return
	}

	await prisma.serverPlayerIdentity.upsert({
		where: {
			serverId_uuid: {
				serverId: payload.serverId,
				uuid: payload.uuid,
			},
		},
		create: {
			serverId: payload.serverId,
			uuid: payload.uuid,
			username: payload.username,
			normalizedUsername: payload.normalizedUsername,
			uuidSource: payload.uuidSource,
			firstSeenAt: payload.observedAt,
			lastSeenAt: payload.observedAt,
			evidenceCount: 1,
		},
		update: {
			username: payload.username,
			normalizedUsername: payload.normalizedUsername,
			uuidSource: payload.uuidSource,
			lastSeenAt: payload.observedAt,
			evidenceCount: {
				increment: 1,
			},
		},
	})

	await upsertMinecraftServerPlayerFromIdentity({
		serverId: payload.serverId,
		uuid: payload.uuid,
		username: payload.username,
		normalizedUsername: payload.normalizedUsername,
		uuidSource: payload.uuidSource,
		observedAt: payload.observedAt,
	})
}

export const registerMinecraftProjectionHandlers = (): void => {
	if (registered) {
		return
	}

	onEvent(
		'server-player-identity-evidence.created',
		projectServerPlayerIdentityEvidence,
	)
	registered = true
}
