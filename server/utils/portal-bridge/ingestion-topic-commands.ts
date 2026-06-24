import {
	getBridgeEnvelopeLatencyMs,
	parseDate,
	readBoolean,
	readString,
} from './ingestion-readers'
import {
	readCommandSource,
	updateCommandAndSyncTask,
	updateCommandStatus,
} from './ingestion-sync-state'
import type { PortalBridgeEnvelope } from './protocol'

export const handlePortalBridgeCommandEnvelope = async (
	serverId: string,
	envelope: PortalBridgeEnvelope,
): Promise<void> => {
	const observedAt = new Date(envelope.observedAt)

	if (envelope.topic === 'command.accepted') {
		const commandId = readString(envelope.payload, 'commandId')

		if (commandId) {
			await updateCommandStatus({
				commandId,
				status: 'ACCEPTED',
				errorMessage: null,
			})
		}
	}

	if (envelope.topic === 'command.rejected') {
		const commandId = readString(envelope.payload, 'commandId')
		const message =
			readString(envelope.payload, 'message') ?? 'PortalBridge command rejected'

		if (commandId) {
			await updateCommandAndSyncTask({
				serverId,
				commandId,
				status: 'REJECTED',
				completedAt: observedAt,
				errorMessage: message,
				latencyMs: getBridgeEnvelopeLatencyMs(envelope),
			})
		}
	}

	if (envelope.topic === 'command.result') {
		const commandId = readString(envelope.payload, 'commandId')
		const status = readString(envelope.payload, 'status')
		const message = readString(envelope.payload, 'message')
		const success = readBoolean(envelope.payload, 'success')
		const completedAt =
			parseDate(readString(envelope.payload, 'completedAt')) ?? observedAt

		if (commandId) {
			const source = await readCommandSource(commandId)
			const isOk = success !== false && status === 'OK'
			const shouldFinishOnResult = source === 'PORTAL_BRIDGE_PLAYERS'

			await updateCommandAndSyncTask({
				serverId,
				commandId,
				status: isOk ? 'COMPLETED' : 'FAILED',
				completedAt,
				errorMessage: isOk
					? null
					: (message ?? status ?? 'PortalBridge command failed'),
				finishSync: isOk && shouldFinishOnResult,
				latencyMs: getBridgeEnvelopeLatencyMs(envelope),
			})
		}
	}
}
