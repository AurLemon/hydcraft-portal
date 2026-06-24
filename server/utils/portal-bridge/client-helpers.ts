import type { ExternalSyncSource } from '~/generated/prisma/client'

export const normalizeCoreSyncIntervalMinutes = (value: number): number =>
	Math.max(1, Math.floor(value || 30))

export const readEnvelopePlayers = (payload: unknown): unknown[] => {
	if (!payload || typeof payload !== 'object') {
		return []
	}

	const value = (payload as Record<string, unknown>)['players']

	return Array.isArray(value) ? value : []
}

export const readPlayerString = (
	player: unknown,
	key: string,
): string | null => {
	if (!player || typeof player !== 'object') {
		return null
	}

	const value = (player as Record<string, unknown>)[key]

	return typeof value === 'string' ? value : null
}

export const readPlayerBoolean = (
	player: unknown,
	key: string,
): boolean | null => {
	if (!player || typeof player !== 'object') {
		return null
	}

	const value = (player as Record<string, unknown>)[key]

	return typeof value === 'boolean' ? value : null
}

export const getPortalBridgeTaskKey = (
	serverId: string,
	source: ExternalSyncSource,
): string => `${serverId}:${source.toLowerCase()}`

export const getPortalBridgeCoreRoundJobKey = (serverId: string): string =>
	`${serverId}:portal-bridge-core-round`

export const describeBridgeContext = (input: {
	serverId: string
	bridgeId: string
	module: string
}): string =>
	`Bridge connection [server=${input.serverId}] [bridge=${input.bridgeId}] [module=${input.module}]`

export const describeCloseEvent = (event: {
	code?: number
	reason?: string
}): string => {
	const parts: string[] = []

	if (typeof event.code === 'number' && Number.isFinite(event.code)) {
		parts.push(`code=${event.code}`)
	}

	if (typeof event.reason === 'string' && event.reason.trim().length > 0) {
		parts.push(`reason=${event.reason.trim()}`)
	}

	return parts.length > 0 ? parts.join(', ') : 'no close reason'
}

export const logBridgeInfo = (
	message: string,
	level: 'info' | 'success' | 'error' = 'info',
	error?: unknown,
): void => {
	if (level === 'success') {
		console.log(`✔ [bridge] ${message}`)
		return
	}

	if (level === 'error') {
		console.error(`✖ [bridge] ${message}`)
		if (error !== undefined) {
			console.error(error)
		}
		return
	}

	console.info(`[bridge] ${message}`)
}
