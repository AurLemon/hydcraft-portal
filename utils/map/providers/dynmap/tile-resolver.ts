import type { MinecraftMapTileRequest } from '../../core/types'
import type { DynmapMapConfig, DynmapTileInfo } from './types'

const resolveDynmapTileInfo = (
	request: MinecraftMapTileRequest,
	config: Pick<DynmapMapConfig, 'mapZoomIn'>,
): DynmapTileInfo => {
	const zoomOutLevel = Math.max(0, request.z - config.mapZoomIn)
	const scale = 1 << zoomOutLevel
	const scaledX = scale * request.x
	const scaledY = scale * request.y
	const invertedY = -scaledY

	return {
		chunkX: scaledX >> 5,
		chunkY: invertedY >> 5,
		tileX: scaledX,
		tileY: invertedY,
		zoomPrefix: zoomOutLevel === 0 ? '' : `${'z'.repeat(zoomOutLevel)}_`,
	}
}

export const resolveDynmapTileUrl = (
	request: MinecraftMapTileRequest,
	config: DynmapMapConfig,
): string | null => {
	if (!config.tileBaseUrl) {
		return null
	}

	const info = resolveDynmapTileInfo(request, config)
	const extension = config.tileExtension ?? 'jpg'
	const fileName = `${info.zoomPrefix}${info.tileX}_${info.tileY}.${extension}`
	const chunkPath = `${info.chunkX}_${info.chunkY}`

	return [
		config.tileBaseUrl,
		config.worldName,
		config.mapName,
		chunkPath,
		fileName,
	]
		.filter(Boolean)
		.join('/')
}
