import type {
	Prisma,
	ServerPlayerIdentityEvidenceSource,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { emitEvent } from '../events/event-bus'
import { normalizeMinecraftUsername } from './normalize'

export interface CreateIdentityEvidenceInput {
	source: ServerPlayerIdentityEvidenceSource
	sourceMessageId?: string | null
	serverId: string
	uuid?: string | null
	username?: string | null
	uuidSource?: string | null
	observedAt: Date
	payload?: Prisma.InputJsonValue
}

export const createServerPlayerIdentityEvidence = async (
	input: CreateIdentityEvidenceInput,
) => {
	const normalizedUsername = normalizeMinecraftUsername(input.username)
	const data = {
		source: input.source,
		sourceMessageId: input.sourceMessageId,
		serverId: input.serverId,
		uuid: input.uuid,
		username: input.username,
		normalizedUsername,
		uuidSource: input.uuidSource,
		observedAt: input.observedAt,
		payload: input.payload,
	}

	const evidence = input.sourceMessageId
		? await prisma.serverPlayerIdentityEvidence.upsert({
				where: {
					source_sourceMessageId: {
						source: input.source,
						sourceMessageId: input.sourceMessageId,
					},
				},
				create: data,
				update: data,
			})
		: await prisma.serverPlayerIdentityEvidence.create({
				data,
			})

	await emitEvent('server-player-identity-evidence.created', {
		serverId: evidence.serverId,
		uuid: evidence.uuid,
		username: evidence.username,
		normalizedUsername: evidence.normalizedUsername,
		uuidSource: evidence.uuidSource,
		observedAt: evidence.observedAt,
	})

	return evidence
}
