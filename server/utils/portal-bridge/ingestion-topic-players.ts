import type { Prisma } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { createServerPlayerIdentityEvidence } from '../minecraft/identity-evidence'
import { normalizeMinecraftUsername } from '../minecraft/normalize'
import {
	syncMinecraftServerPlayerOnlineState,
	upsertMinecraftServerPlayerFromIdentity,
} from '../minecraft/server-player'
import {
	parseDate,
	readArray,
	readNumber,
	readObject,
	readString,
} from './ingestion-readers'
import type { PortalBridgeEnvelope } from './protocol'

export const handlePortalBridgePlayerEnvelope = async (
	serverId: string,
	envelope: PortalBridgeEnvelope,
): Promise<void> => {
	const observedAt = new Date(envelope.observedAt)

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

	if (envelope.topic === 'mc.player.snapshot') {
		for (const player of readArray(envelope.payload, 'players')) {
			const uuid = readString(player, 'uuid')
			const username = readString(player, 'username')

			if (!uuid) {
				continue
			}

			await upsertMinecraftServerPlayerFromIdentity({
				serverId,
				uuid,
				username,
				normalizedUsername: readString(player, 'normalizedUsername'),
				uuidSource: readString(player, 'uuidSource'),
				observedAt: parseDate(readString(player, 'lastSeenAt')) ?? observedAt,
			})
		}
	}

	if (envelope.topic === 'mc.player.online.snapshot') {
		for (const player of readArray(envelope.payload, 'players')) {
			const uuid = readString(player, 'uuid')

			if (!uuid) {
				continue
			}

			const position = readObject(player, 'position')

			await syncMinecraftServerPlayerOnlineState({
				serverId,
				uuid,
				username: readString(player, 'username'),
				normalizedUsername: normalizeMinecraftUsername(
					readString(player, 'username'),
				),
				uuidSource: 'ONLINE_SNAPSHOT',
				observedAt,
				online: true,
				worldName: readString(player, 'worldName'),
				dimension: readString(player, 'dimension'),
				x: readNumber(position, 'x'),
				y: readNumber(position, 'y'),
				z: readNumber(position, 'z'),
			})
		}
	}

	if (envelope.topic === 'mc.player.session.opened') {
		const sessionId = readString(envelope.payload, 'sessionId')
		const uuid = readString(envelope.payload, 'uuid')
		const username = readString(envelope.payload, 'username')
		const openedAt =
			parseDate(readString(envelope.payload, 'openedAt')) ??
			parseDate(readString(envelope.payload, 'startedAt')) ??
			observedAt
		const position = readObject(envelope.payload, 'position')

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
					openedAt,
				},
				update: {
					username,
					normalizedUsername: normalizeMinecraftUsername(username),
					openedAt,
				},
			})
		} else if (uuid) {
			await prisma.serverPlayerSession.create({
				data: {
					serverId,
					uuid,
					username,
					normalizedUsername: normalizeMinecraftUsername(username),
					openedAt,
				},
			})
		}

		if (uuid) {
			await syncMinecraftServerPlayerOnlineState({
				serverId,
				uuid,
				username,
				normalizedUsername: normalizeMinecraftUsername(username),
				uuidSource: 'SESSION_OPENED',
				observedAt: openedAt,
				online: true,
				worldName: readString(envelope.payload, 'worldName'),
				dimension: readString(envelope.payload, 'dimension'),
				x: readNumber(position, 'x'),
				y: readNumber(position, 'y'),
				z: readNumber(position, 'z'),
			})
		}
	}

	if (envelope.topic === 'mc.player.session.closed') {
		const sessionId = readString(envelope.payload, 'sessionId')
		const uuid = readString(envelope.payload, 'uuid')
		const closedAt =
			parseDate(readString(envelope.payload, 'closedAt')) ??
			parseDate(readString(envelope.payload, 'endedAt')) ??
			observedAt

		if (sessionId) {
			await prisma.serverPlayerSession.updateMany({
				where: {
					serverId,
					sessionId,
				},
				data: {
					closedAt,
					closeReason:
						readString(envelope.payload, 'closeReason') ??
						readString(envelope.payload, 'reason'),
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
					closedAt,
					closeReason:
						readString(envelope.payload, 'closeReason') ??
						readString(envelope.payload, 'reason'),
				},
			})
		}

		if (uuid) {
			await syncMinecraftServerPlayerOnlineState({
				serverId,
				uuid,
				username: readString(envelope.payload, 'username'),
				normalizedUsername: normalizeMinecraftUsername(
					readString(envelope.payload, 'username'),
				),
				uuidSource: 'SESSION_CLOSED',
				observedAt: closedAt,
				online: false,
			})
		}
	}
}
