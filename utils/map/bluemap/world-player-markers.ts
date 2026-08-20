import type { BlueMapWorldPlayerMarker } from './types'

export const areWorldPlayerMarkersEqual = (
	previous: readonly BlueMapWorldPlayerMarker[],
	next: readonly BlueMapWorldPlayerMarker[],
): boolean =>
	previous.length === next.length &&
	previous.every((marker, index) => {
		const candidate = next[index]
		return (
			candidate !== undefined &&
			marker.id === candidate.id &&
			marker.playerId === candidate.playerId &&
			marker.label === candidate.label &&
			marker.avatarUrl === candidate.avatarUrl &&
			marker.isAdministrator === candidate.isAdministrator &&
			marker.isFocused === candidate.isFocused &&
			marker.x === candidate.x &&
			marker.y === candidate.y &&
			marker.z === candidate.z
		)
	})
