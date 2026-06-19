import type {
	MinecraftMapBlockPoint,
	MinecraftMapProjection,
	MinecraftMapProvider,
} from '../../core/types'

export interface DynmapProjectionOptions {
	mapZoomIn: number
	mapZoomOut: number
	tileScale: number
	worldToMap: readonly [
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
	]
	mapToWorld: readonly [
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
	]
}

export interface DynmapMapIdentity {
	worldName: string
	mapName: string
	tileBaseUrl: string | null
	tileExtension?: 'png' | 'jpg'
}

export interface DynmapMapDefaults {
	defaultCenter: MinecraftMapBlockPoint
	defaultZoom: number
	minZoom?: number
	maxZoom?: number
}

export interface DynmapMapConfig
	extends DynmapProjectionOptions, DynmapMapIdentity, DynmapMapDefaults {}

export interface DynmapTileInfo {
	chunkX: number
	chunkY: number
	tileX: number
	tileY: number
	zoomPrefix: string
}

export interface DynmapProvider extends MinecraftMapProvider {
	readonly projection: MinecraftMapProjection
	readonly config: DynmapMapConfig
}
