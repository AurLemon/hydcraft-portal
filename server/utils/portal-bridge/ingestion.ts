import type {
	MinecraftServerSnapshotKind,
	Prisma,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { createServerPlayerIdentityEvidence } from '../minecraft/identity-evidence'
import { normalizeMinecraftUsername } from '../minecraft/normalize'
import type { PortalBridgeEnvelope } from './protocol'

const snapshotKindByTopic: ReadonlyMap<string, MinecraftServerSnapshotKind> =
	new Map([
		['mc.server.info.snapshot', 'SERVER_INFO'],
		['mc.server.status.snapshot', 'SERVER_STATUS'],
		['mc.server.worlds.snapshot', 'WORLDS'],
		['mc.player.online.snapshot', 'ONLINE_PLAYERS'],
		['mc.player.snapshot', 'PLAYER_SNAPSHOT'],
		['bridge.heartbeat', 'HEARTBEAT'],
		['bridge.metrics', 'METRICS'],
		['mc.playerdata.scan.started', 'PLAYERDATA_SCAN'],
		['mc.playerdata.scan.chunk', 'PLAYERDATA_SCAN'],
		['mc.playerdata.scan.completed', 'PLAYERDATA_SCAN'],
		['mc.stats.snapshot.manifest', 'STATS_SNAPSHOT'],
		['mc.stats.snapshot.chunk', 'STATS_SNAPSHOT'],
		['mc.stats.snapshot.completed', 'STATS_SNAPSHOT'],
		['mc.advancements.snapshot.manifest', 'ADVANCEMENTS_SNAPSHOT'],
		['mc.advancements.snapshot.chunk', 'ADVANCEMENTS_SNAPSHOT'],
		['mc.advancements.snapshot.completed', 'ADVANCEMENTS_SNAPSHOT'],
		['command.accepted', 'COMMAND_RESULT'],
		['command.rejected', 'COMMAND_RESULT'],
		['command.result', 'COMMAND_RESULT'],
	])

const readString = (payload: unknown, key: string): string | null => {
	if (!payload || typeof payload !== 'object') {
		return null
	}

	const value = (payload as Record<string, unknown>)[key]

	return typeof value === 'string' ? value : null
}

export const ingestPortalBridgeEnvelope = async (input: {
	bridgeConfigId: string
	serverId: string
	envelope: PortalBridgeEnvelope
}): Promise<{ duplicate: boolean }> => {
	const seq = input.envelope.seq == null ? null : BigInt(input.envelope.seq)

	try {
		await prisma.portalBridgeMessageReceipt.create({
			data: {
				bridgeConfigId: input.bridgeConfigId,
				messageId: input.envelope.id,
				seq,
				topic: input.envelope.topic,
				payload: input.envelope as unknown as Prisma.InputJsonValue,
			},
		})
	} catch {
		return { duplicate: true }
	}

	await projectPortalBridgeEnvelope(input.serverId, input.envelope)

	return { duplicate: false }
}

const projectPortalBridgeEnvelope = async (
	serverId: string,
	envelope: PortalBridgeEnvelope,
): Promise<void> => {
	const observedAt = new Date(envelope.observedAt)
	const snapshotKind = snapshotKindByTopic.get(envelope.topic)

	if (snapshotKind) {
		await prisma.minecraftServerSnapshot.create({
			data: {
				serverId,
				kind: snapshotKind,
				observedAt,
				payload: envelope.payload as Prisma.InputJsonValue,
			},
		})
	}

	if (envelope.topic === 'mc.player.identity.observed') {
		await createServerPlayerIdentityEvidence({
			source: 'PORTAL_BRIDGE',
			sourceMessageId: envelope.id,
			serverId,
			uuid: readString(envelope.payload, 'uuid'),
			username: readString(envelope.payload, 'username'),
			uuidSource: readString(envelope.payload, 'uuidSource'),
			observedAt,
			payload: envelope.payload as Prisma.InputJsonValue,
		})
	}

	if (envelope.topic === 'mc.player.session.opened') {
		const sessionId = readString(envelope.payload, 'sessionId')
		const uuid = readString(envelope.payload, 'uuid')
		const username = readString(envelope.payload, 'username')

		if (uuid && sessionId) {
			await prisma.serverPlayerSession.upsert({
				where: {
					serverId_sessionId: {
						serverId,
						sessionId,
					},
				},
				create: {
					serverId,
					sessionId,
					uuid,
					username,
					normalizedUsername: normalizeMinecraftUsername(username),
					openedAt: new Date(
						readString(envelope.payload, 'openedAt') ?? observedAt,
					),
				},
				update: {
					username,
					normalizedUsername: normalizeMinecraftUsername(username),
					openedAt: new Date(
						readString(envelope.payload, 'openedAt') ?? observedAt,
					),
				},
			})
		} else if (uuid) {
			await prisma.serverPlayerSession.create({
				data: {
					serverId,
					uuid,
					username,
					normalizedUsername: normalizeMinecraftUsername(username),
					openedAt: new Date(
						readString(envelope.payload, 'openedAt') ?? observedAt,
					),
				},
			})
		}
	}

	if (envelope.topic === 'mc.player.session.closed') {
		const sessionId = readString(envelope.payload, 'sessionId')
		const uuid = readString(envelope.payload, 'uuid')

		if (sessionId) {
			await prisma.serverPlayerSession.updateMany({
				where: {
					serverId,
					sessionId,
				},
				data: {
					closedAt: new Date(
						readString(envelope.payload, 'closedAt') ?? observedAt,
					),
					closeReason: readString(envelope.payload, 'closeReason'),
				},
			})
		} else if (uuid) {
			await prisma.serverPlayerSession.updateMany({
				where: {
					serverId,
					uuid,
					closedAt: null,
				},
				data: {
					closedAt: observedAt,
					closeReason: readString(envelope.payload, 'closeReason'),
				},
			})
		}
	}
}
