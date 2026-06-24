import type { Prisma } from '~/generated/prisma/client'
import { createServerPlayerIdentityEvidence } from '../minecraft/identity-evidence'
import {
	syncMinecraftServerPlayerAdvancementsSnapshot,
	syncMinecraftServerPlayerData,
	syncMinecraftServerPlayerStatsSnapshot,
} from '../minecraft/server-player'
import {
	getBridgeEnvelopeLatencyMs,
	getEarliestDate,
	parseDate,
	readArray,
	readBoolean,
	readNumber,
	readObject,
	readString,
} from './ingestion-readers'
import {
	updateCommandAndSyncTask,
	updateSyncTaskProgress,
} from './ingestion-sync-state'
import type { PortalBridgeEnvelope } from './protocol'

export const handlePortalBridgeSyncEnvelope = async (
	serverId: string,
	envelope: PortalBridgeEnvelope,
): Promise<void> => {
	const observedAt = new Date(envelope.observedAt)

	if (envelope.topic === 'mc.player.snapshot') {
		const playerCount = readArray(envelope.payload, 'players').length

		if (playerCount >= 0) {
			await updateSyncTaskProgress({
				serverId,
				source: 'PORTAL_BRIDGE_PLAYERS',
				rowsRead: playerCount,
				rowsMatchedDelta: playerCount,
				rowsChangedDelta: playerCount,
			})
		}
	}

	if (envelope.topic === 'mc.playerdata.scan.chunk') {
		let matchedRows = 0
		let changedRows = 0
		const playersByUuid = new Map<
			string,
			{
				uuid: string
				playerDataFile: string | null
				lastModifiedAt: Date | null
				hasStatsFile: boolean
				hasAdvancementsFile: boolean
				lastKnownName: string | null
				firstPlayedAt: Date | null
				lastPlayedAt: Date | null
				lastWorldName: string | null
				lastDimension: string | null
				lastX: number | null
				lastY: number | null
				lastZ: number | null
				lastYaw: number | null
				lastPitch: number | null
			}
		>()

		for (const player of readArray(envelope.payload, 'players')) {
			const uuid = readString(player, 'uuid')

			if (!uuid) {
				continue
			}

			await createServerPlayerIdentityEvidence({
				source: 'PLAYERDATA_SCAN',
				sourceMessageId: `${envelope.id}:${uuid}`,
				serverId,
				uuid,
				username: readString(player, 'lastKnownName'),
				uuidSource: 'PLAYERDATA_SCAN',
				observedAt:
					parseDate(readString(player, 'lastModifiedAt')) ?? observedAt,
				payload: player as Prisma.InputJsonValue,
			})

			const existing = playersByUuid.get(uuid)
			const lastModifiedAt = parseDate(readString(player, 'lastModifiedAt'))
			const position = readObject(player, 'position')
			const next = {
				uuid,
				playerDataFile:
					readString(player, 'playerDataFile') ??
					existing?.playerDataFile ??
					null,
				lastModifiedAt: getEarliestDate(
					existing?.lastModifiedAt,
					lastModifiedAt,
				),
				hasStatsFile:
					(existing?.hasStatsFile ?? false) ||
					(readBoolean(player, 'hasStatsFile') ?? false),
				hasAdvancementsFile:
					(existing?.hasAdvancementsFile ?? false) ||
					(readBoolean(player, 'hasAdvancementsFile') ?? false),
				lastKnownName:
					readString(player, 'lastKnownName') ??
					existing?.lastKnownName ??
					null,
				firstPlayedAt:
					parseDate(readString(player, 'firstPlayedAt')) ??
					existing?.firstPlayedAt ??
					null,
				lastPlayedAt:
					parseDate(readString(player, 'lastPlayedAt')) ??
					existing?.lastPlayedAt ??
					null,
				lastWorldName:
					readString(player, 'worldName') ?? existing?.lastWorldName ?? null,
				lastDimension:
					readString(player, 'dimension') ?? existing?.lastDimension ?? null,
				lastX: readNumber(position, 'x') ?? existing?.lastX ?? null,
				lastY: readNumber(position, 'y') ?? existing?.lastY ?? null,
				lastZ: readNumber(position, 'z') ?? existing?.lastZ ?? null,
				lastYaw: readNumber(player, 'yaw') ?? existing?.lastYaw ?? null,
				lastPitch: readNumber(player, 'pitch') ?? existing?.lastPitch ?? null,
			}

			playersByUuid.set(uuid, next)
		}

		for (const player of playersByUuid.values()) {
			const result = await syncMinecraftServerPlayerData({
				serverId,
				uuid: player.uuid,
				playerDataFile: player.playerDataFile,
				lastModifiedAt: player.lastModifiedAt,
				hasStatsFile: player.hasStatsFile,
				hasAdvancementsFile: player.hasAdvancementsFile,
				lastKnownName: player.lastKnownName,
				firstPlayedAt: player.firstPlayedAt,
				lastPlayedAt: player.lastPlayedAt,
				lastWorldName: player.lastWorldName,
				lastDimension: player.lastDimension,
				lastX: player.lastX,
				lastY: player.lastY,
				lastZ: player.lastZ,
				lastYaw: player.lastYaw,
				lastPitch: player.lastPitch,
				syncedAt: observedAt,
			})

			if (result.matched) {
				matchedRows += 1
			}

			if (result.changed) {
				changedRows += 1
			}
		}

		if (matchedRows > 0) {
			await updateSyncTaskProgress({
				serverId,
				source: 'PORTAL_BRIDGE_PLAYERDATA',
				rowsMatchedDelta: matchedRows,
				rowsChangedDelta: changedRows,
				rowsSkippedDelta: Math.max(0, matchedRows - changedRows),
			})
		}
	}

	if (envelope.topic === 'mc.playerdata.scan.completed') {
		const commandId = readString(envelope.payload, 'commandId')
		const playersObserved = readNumber(envelope.payload, 'playersObserved')

		await updateSyncTaskProgress({
			serverId,
			source: 'PORTAL_BRIDGE_PLAYERDATA',
			rowsRead: playersObserved ?? 0,
			finish: 'success',
			finishedAt:
				parseDate(readString(envelope.payload, 'completedAt')) ?? observedAt,
			latencyMs: getBridgeEnvelopeLatencyMs(envelope),
		})

		if (commandId) {
			await updateCommandAndSyncTask({
				serverId,
				commandId,
				status: 'COMPLETED',
				completedAt: parseDate(readString(envelope.payload, 'completedAt')),
			})
		}
	}

	if (envelope.topic === 'mc.stats.snapshot.chunk') {
		const snapshotId = readString(envelope.payload, 'snapshotId')

		if (snapshotId) {
			let matchedRows = 0
			let changedRows = 0

			for (const player of readArray(envelope.payload, 'players')) {
				const uuid = readString(player, 'uuid')

				if (!uuid || !player || typeof player !== 'object') {
					continue
				}

				const stats = (player as Record<string, unknown>).stats

				const result = await syncMinecraftServerPlayerStatsSnapshot({
					serverId,
					uuid,
					snapshotId,
					statsHash: readString(player, 'statsHash'),
					observedAt:
						parseDate(readString(player, 'lastScannedAt')) ?? observedAt,
					lastScannedAt: parseDate(readString(player, 'lastScannedAt')),
					stats: (stats ?? {}) as Prisma.InputJsonValue,
					payloadOmitted: readBoolean(player, 'payloadOmitted') ?? false,
				})

				if (result.matched) {
					matchedRows += 1
				}

				if (result.changed) {
					changedRows += 1
				}
			}

			if (matchedRows > 0) {
				await updateSyncTaskProgress({
					serverId,
					source: 'PORTAL_BRIDGE_STATS',
					rowsMatchedDelta: matchedRows,
					rowsChangedDelta: changedRows,
					rowsSkippedDelta: Math.max(0, matchedRows - changedRows),
				})
			}
		}
	}

	if (envelope.topic === 'mc.stats.snapshot.completed') {
		const commandId = readString(envelope.payload, 'commandId')
		const playerCount = readNumber(envelope.payload, 'playerCount')

		await updateSyncTaskProgress({
			serverId,
			source: 'PORTAL_BRIDGE_STATS',
			rowsRead: playerCount ?? 0,
			finish: 'success',
			finishedAt:
				parseDate(readString(envelope.payload, 'completedAt')) ?? observedAt,
			latencyMs: getBridgeEnvelopeLatencyMs(envelope),
		})

		if (commandId) {
			await updateCommandAndSyncTask({
				serverId,
				commandId,
				status: 'COMPLETED',
				completedAt: parseDate(readString(envelope.payload, 'completedAt')),
			})
		}
	}

	if (envelope.topic === 'mc.advancements.snapshot.chunk') {
		const snapshotId = readString(envelope.payload, 'snapshotId')

		if (snapshotId) {
			let matchedRows = 0
			let changedRows = 0

			for (const player of readArray(envelope.payload, 'players')) {
				const uuid = readString(player, 'uuid')

				if (!uuid || !player || typeof player !== 'object') {
					continue
				}

				const advancements = (player as Record<string, unknown>).advancements

				const result = await syncMinecraftServerPlayerAdvancementsSnapshot({
					serverId,
					uuid,
					snapshotId,
					advancementsHash: readString(player, 'advancementsHash'),
					observedAt:
						parseDate(readString(player, 'lastScannedAt')) ?? observedAt,
					lastScannedAt: parseDate(readString(player, 'lastScannedAt')),
					advancements: (advancements ?? {}) as Prisma.InputJsonValue,
					payloadOmitted: readBoolean(player, 'payloadOmitted') ?? false,
				})

				if (result.matched) {
					matchedRows += 1
				}

				if (result.changed) {
					changedRows += 1
				}
			}

			if (matchedRows > 0) {
				await updateSyncTaskProgress({
					serverId,
					source: 'PORTAL_BRIDGE_ADVANCEMENTS',
					rowsMatchedDelta: matchedRows,
					rowsChangedDelta: changedRows,
					rowsSkippedDelta: Math.max(0, matchedRows - changedRows),
				})
			}
		}
	}

	if (envelope.topic === 'mc.advancements.snapshot.completed') {
		const commandId = readString(envelope.payload, 'commandId')
		const playerCount = readNumber(envelope.payload, 'playerCount')

		await updateSyncTaskProgress({
			serverId,
			source: 'PORTAL_BRIDGE_ADVANCEMENTS',
			rowsRead: playerCount ?? 0,
			finish: 'success',
			finishedAt:
				parseDate(readString(envelope.payload, 'completedAt')) ?? observedAt,
			latencyMs: getBridgeEnvelopeLatencyMs(envelope),
		})

		if (commandId) {
			await updateCommandAndSyncTask({
				serverId,
				commandId,
				status: 'COMPLETED',
				completedAt: parseDate(readString(envelope.payload, 'completedAt')),
			})
		}
	}
}
