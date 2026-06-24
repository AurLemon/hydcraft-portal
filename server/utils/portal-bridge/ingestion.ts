import type { Prisma } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { projectPortalBridgeEnvelope } from './ingestion-projector'
import type { PortalBridgeEnvelope } from './protocol'

export const ingestPortalBridgeEnvelope = async (input: {
	bridgeConfigId: string
	serverId: string
	streamEpoch: string | null
	envelope: PortalBridgeEnvelope
}): Promise<{ duplicate: boolean }> => {
	const seq = input.envelope.seq == null ? null : BigInt(input.envelope.seq)

	try {
		await prisma.portalBridgeMessageReceipt.create({
			data: {
				bridgeConfigId: input.bridgeConfigId,
				messageId: input.envelope.id,
				streamEpoch: input.streamEpoch,
				seq,
				topic: input.envelope.topic,
				payload: input.envelope as unknown as Prisma.InputJsonValue,
			},
		})
	} catch (error) {
		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			(error as { code?: string }).code === 'P2002'
		) {
			return { duplicate: true }
		}

		throw error
	}

	await projectPortalBridgeEnvelope(input.serverId, input.envelope)

	return { duplicate: false }
}
