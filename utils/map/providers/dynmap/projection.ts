import type {
	MinecraftMapBlockPoint,
	MinecraftMapProjection,
} from '../../core/types'
import type { DynmapProjectionOptions } from './types'

const BASE_TILE_SIZE = 128

export const createDynmapProjection = (
	options: DynmapProjectionOptions,
): MinecraftMapProjection => {
	const tileSize = BASE_TILE_SIZE << (options.tileScale ?? 0)
	const zoomScale = 1 << options.mapZoomOut

	const toLatLng = (point: MinecraftMapBlockPoint) => {
		const y = 0
		const lat =
			options.worldToMap[3] * point.x +
			options.worldToMap[4] * y +
			options.worldToMap[5] * point.z
		const lng =
			options.worldToMap[0] * point.x +
			options.worldToMap[1] * y +
			options.worldToMap[2] * point.z

		return {
			lat: -((tileSize - lat) / zoomScale),
			lng: lng / zoomScale,
		}
	}

	const fromLatLng = (latlng: { lat: number; lng: number }) => {
		const y = 0
		const lat = tileSize + latlng.lat * zoomScale
		const lng = latlng.lng * zoomScale

		return {
			x:
				options.mapToWorld[0] * lng +
				options.mapToWorld[1] * lat +
				options.mapToWorld[2] * y,
			z:
				options.mapToWorld[6] * lng +
				options.mapToWorld[7] * lat +
				options.mapToWorld[8] * y,
		}
	}

	return {
		toLatLng,
		fromLatLng,
	}
}
