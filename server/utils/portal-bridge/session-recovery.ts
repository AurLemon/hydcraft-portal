import { randomUUID } from 'node:crypto'
import { prisma } from '../db/prisma'
import { normalizeMinecraftUsername } from '../minecraft/normalize'
import { syncMinecraftServerPlayerOnlineState } from '../minecraft/server-player'

export const BRIDGE_CONNECTION_LOST_CLOSE_REASON = 'BRIDGE_CONNECTION_LOST'
export const BRIDGE_RECOVERY_OBSERVED_SOURCE = 'BRIDGE_RECOVERY_OBSERVED'

export interface PortalBridgeRecoveryOnlinePlayer {
	uuid: string
	username: string | null
	worldName: string | null
	dimension: string | null
	x: number | null
	y: number | null
	z: number | null
	observedAt: Date
}

export const reconcileRecoveredServerPlayerSessions = async (input: {
	serverId: string
	gapStartedAt: Date
	currentOnlinePlayers: PortalBridgeRecoveryOnlinePlayer[]
}): Promise<void> => {
	const openSessions = await prisma.serverPlayerSession.findMany({
		where: {
			serverId: input.serverId,
			closedAt: null,
		},
		orderBy: {
			openedAt: 'asc',
		},
	})

	const onlinePlayerByUuid = new Map<string, PortalBridgeRecoveryOnlinePlayer>()

	for (const player of input.currentOnlinePlayers) {
		onlinePlayerByUuid.set(player.uuid, player)
	}

	if (openSessions.length > 0) {
		await prisma.serverPlayerSession.updateMany({
			where: {
				serverId: input.serverId,
				closedAt: null,
			},
			data: {
				closedAt: input.gapStartedAt,
				closeReason: BRIDGE_CONNECTION_LOST_CLOSE_REASON,
			},
		})
	}

	for (const session of openSessions) {
		if (onlinePlayerByUuid.has(session.uuid)) {
			continue
		}

		await syncMinecraftServerPlayerOnlineState({
			serverId: input.serverId,
			uuid: session.uuid,
			username: session.username,
			normalizedUsername: session.normalizedUsername,
			uuidSource: BRIDGE_CONNECTION_LOST_CLOSE_REASON,
			observedAt: input.gapStartedAt,
			online: false,
		})
	}

	for (const player of onlinePlayerByUuid.values()) {
		await syncMinecraftServerPlayerOnlineState({
			serverId: input.serverId,
			uuid: player.uuid,
			username: player.username,
			normalizedUsername: normalizeMinecraftUsername(player.username),
			uuidSource: BRIDGE_RECOVERY_OBSERVED_SOURCE,
			observedAt: player.observedAt,
			online: true,
			worldName: player.worldName,
			dimension: player.dimension,
			x: player.x,
			y: player.y,
			z: player.z,
		})

		await prisma.serverPlayerSession.create({
			data: {
				serverId: input.serverId,
				sessionId: randomUUID(),
				uuid: player.uuid,
				username: player.username,
				normalizedUsername: normalizeMinecraftUsername(player.username),
				openedAt: player.observedAt,
			},
		})
	}
}
