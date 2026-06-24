import type { PortalBridgeEnvelope } from './protocol'

export const readString = (payload: unknown, key: string): string | null => {
	if (!payload || typeof payload !== 'object') {
		return null
	}

	const value = (payload as Record<string, unknown>)[key]

	return typeof value === 'string' ? value : null
}

export const readBoolean = (payload: unknown, key: string): boolean | null => {
	if (!payload || typeof payload !== 'object') {
		return null
	}

	const value = (payload as Record<string, unknown>)[key]

	return typeof value === 'boolean' ? value : null
}

export const readNumber = (payload: unknown, key: string): number | null => {
	if (!payload || typeof payload !== 'object') {
		return null
	}

	const value = (payload as Record<string, unknown>)[key]

	return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export const readObject = (
	payload: unknown,
	key: string,
): Record<string, unknown> | null => {
	if (!payload || typeof payload !== 'object') {
		return null
	}

	const value = (payload as Record<string, unknown>)[key]

	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null
}

export const readArray = (payload: unknown, key: string): unknown[] => {
	if (!payload || typeof payload !== 'object') {
		return []
	}

	const value = (payload as Record<string, unknown>)[key]

	return Array.isArray(value) ? value : []
}

export const parseDate = (value: string | null | undefined): Date | null => {
	if (!value) {
		return null
	}

	if (/^\d+$/.test(value)) {
		const timestamp = Number(value)
		const date = new Date(timestamp)

		return Number.isNaN(date.getTime()) ? null : date
	}

	const date = new Date(value)

	return Number.isNaN(date.getTime()) ? null : date
}

export const getEarliestDate = (
	left: Date | null | undefined,
	right: Date | null | undefined,
): Date | null => {
	if (!left) {
		return right ?? null
	}

	if (!right) {
		return left
	}

	return left.getTime() <= right.getTime() ? left : right
}

export const getBridgeEnvelopeLatencyMs = (
	envelope: PortalBridgeEnvelope,
): number | null => {
	if (!envelope.sentAt) {
		return null
	}

	const sentAt = new Date(envelope.sentAt)
	const observedAt = new Date(envelope.observedAt)

	if (Number.isNaN(sentAt.getTime()) || Number.isNaN(observedAt.getTime())) {
		return null
	}

	return Math.max(0, observedAt.getTime() - sentAt.getTime())
}
