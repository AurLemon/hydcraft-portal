interface PortalBridgeConnectionGap {
	bridgeConfigId: string
	serverId: string
	startedAt: Date
}

const gapByBridgeConfigId = new Map<string, PortalBridgeConnectionGap>()

export const markPortalBridgeConnectionGap = (input: {
	bridgeConfigId: string
	serverId: string
	startedAt: Date
}): PortalBridgeConnectionGap => {
	const existing = gapByBridgeConfigId.get(input.bridgeConfigId)

	if (existing) {
		if (input.startedAt.getTime() < existing.startedAt.getTime()) {
			existing.startedAt = input.startedAt
		}

		return existing
	}

	const gap: PortalBridgeConnectionGap = {
		bridgeConfigId: input.bridgeConfigId,
		serverId: input.serverId,
		startedAt: input.startedAt,
	}

	gapByBridgeConfigId.set(input.bridgeConfigId, gap)

	return gap
}

export const getPortalBridgeConnectionGap = (
	bridgeConfigId: string,
): PortalBridgeConnectionGap | null =>
	gapByBridgeConfigId.get(bridgeConfigId) ?? null

export const clearPortalBridgeConnectionGap = (
	bridgeConfigId: string,
): void => {
	gapByBridgeConfigId.delete(bridgeConfigId)
}
