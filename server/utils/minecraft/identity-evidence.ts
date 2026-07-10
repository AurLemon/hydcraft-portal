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
	evidenceHash?: string | null
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
		evidenceHash: input.evidenceHash,
		serverId: input.serverId,
		uuid: input.uuid,
		username: input.username,
		normalizedUsername,
		uuidSource: input.uuidSource,
		observedAt: input.observedAt,
		payload: input.payload,
	}

	const existing =
		input.evidenceHash && input.uuid
			? await prisma.serverPlayerIdentityEvidence.findUnique({
					where: {
						source_serverId_uuid_evidenceHash: {
							source: input.source,
							serverId: input.serverId,
							uuid: input.uuid,
							evidenceHash: input.evidenceHash,
						},
					},
					select: {
						id: true,
					},
				})
			: input.sourceMessageId
				? await prisma.serverPlayerIdentityEvidence.findUnique({
						where: {
							source_sourceMessageId: {
								source: input.source,
								sourceMessageId: input.sourceMessageId,
							},
						},
						select: {
							id: true,
						},
					})
				: null

	const evidence = existing
		? await prisma.serverPlayerIdentityEvidence.update({
				where: {
					id: existing.id,
				},
				data,
			})
		: await prisma.serverPlayerIdentityEvidence.create({
				data,
			})

	if (!existing) {
		await emitEvent('server-player-identity-evidence.created', {
			serverId: evidence.serverId,
			uuid: evidence.uuid,
			username: evidence.username,
			normalizedUsername: evidence.normalizedUsername,
			uuidSource: evidence.uuidSource,
			observedAt: evidence.observedAt,
		})
	}

	return evidence
}
