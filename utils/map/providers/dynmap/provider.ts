import type { MinecraftMapProvider } from '../../core/types'
import { createDynmapProjection } from './projection'
import { createPortalDynmapConfig } from './config'
import { resolveDynmapTileUrl } from './tile-resolver'
import type { DynmapMapConfig, DynmapProvider } from './types'

export const createDynmapProvider = (
	config: DynmapMapConfig,
): DynmapProvider => {
	const projection = createDynmapProjection(config)
	const maxZoom = config.maxZoom ?? config.mapZoomIn + config.mapZoomOut

	return {
		id: 'dynmap',
		isConfigured: Boolean(config.tileBaseUrl),
		projection,
		config,
		tileSchema: {
			tileSize: 128 << config.tileScale,
			minZoom: config.minZoom ?? 0,
			maxZoom,
			maxNativeZoom: config.mapZoomOut,
			noWrap: true,
			zoomReverse: true,
		},
		defaultView: {
			center: config.defaultCenter,
			zoom: config.defaultZoom,
		},
		resolveTile(request) {
			const url = resolveDynmapTileUrl(request, config)
			return url ? { url } : null
		},
	}
}

export const createPortalDynmapProvider = (
	overrides: Partial<DynmapMapConfig> = {},
): MinecraftMapProvider =>
	createDynmapProvider(createPortalDynmapConfig(overrides))
