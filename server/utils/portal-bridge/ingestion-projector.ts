import type {
	MinecraftServerSnapshotKind,
	Prisma,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { handlePortalBridgeCommandEnvelope } from './ingestion-topic-commands'
import { handlePortalBridgePlayerEnvelope } from './ingestion-topic-players'
import { handlePortalBridgeSyncEnvelope } from './ingestion-topic-sync'
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

export const projectPortalBridgeEnvelope = async (
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

	await handlePortalBridgePlayerEnvelope(serverId, envelope)
	await handlePortalBridgeSyncEnvelope(serverId, envelope)
	await handlePortalBridgeCommandEnvelope(serverId, envelope)
}
