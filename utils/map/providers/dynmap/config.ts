import { useRuntimeConfig } from '#imports'
import type { DynmapMapConfig } from './types'

interface PortalMinecraftMapRuntimeConfig {
	dynmapTileBaseUrl?: string
	dynmapWorldName?: string
	dynmapMapName?: string
	dynmapTileExtension?: string
	defaultCenterX?: string | number
	defaultCenterZ?: string | number
	defaultZoom?: string | number
}

const DEFAULT_WORLD_TO_MAP = [
	4, 0, -2.4492935982947064e-16, -2.4492935982947064e-16, 0, -4, 0, 1, 0,
] as const

const DEFAULT_MAP_TO_WORLD = [
	0.25, -1.5308084989341915e-17, 0, 0, 0, 1, -1.5308084989341915e-17, -0.25, 0,
] as const

export const resolveDynmapTileBaseUrl = (
	value: string | undefined | null,
): string | null => {
	if (!value) {
		return null
	}

	const trimmed = value.trim().replace(/\/+$/, '')
	return trimmed.length > 0 ? trimmed : null
}

export const hydcraftDynmapDefaults: Omit<DynmapMapConfig, 'tileBaseUrl'> = {
	worldName: 'world',
	mapName: 'flat',
	tileExtension: 'jpg',
	defaultCenter: {
		x: 811,
		z: 2933,
	},
	defaultZoom: 0,
	minZoom: 0,
	maxZoom: 6,
	mapZoomIn: 1,
	mapZoomOut: 5,
	tileScale: 0,
	worldToMap: DEFAULT_WORLD_TO_MAP,
	mapToWorld: DEFAULT_MAP_TO_WORLD,
}

export const createPortalDynmapConfig = (
	overrides: Partial<DynmapMapConfig> = {},
): DynmapMapConfig => {
	const runtimeConfig = useRuntimeConfig()
	const publicMapConfig =
		(runtimeConfig.public.minecraftMap as
			| PortalMinecraftMapRuntimeConfig
			| undefined) ?? {}
	const baseConfig: Omit<DynmapMapConfig, 'tileBaseUrl'> = {
		...hydcraftDynmapDefaults,
		worldName:
			publicMapConfig.dynmapWorldName?.trim() ||
			hydcraftDynmapDefaults.worldName,
		mapName:
			publicMapConfig.dynmapMapName?.trim() || hydcraftDynmapDefaults.mapName,
		tileExtension:
			publicMapConfig.dynmapTileExtension === 'png' ? 'png' : 'jpg',
		defaultCenter: {
			x: Number(
				publicMapConfig.defaultCenterX ??
					hydcraftDynmapDefaults.defaultCenter.x,
			),
			z: Number(
				publicMapConfig.defaultCenterZ ??
					hydcraftDynmapDefaults.defaultCenter.z,
			),
		},
		defaultZoom: Number(
			publicMapConfig.defaultZoom ?? hydcraftDynmapDefaults.defaultZoom,
		),
	}
	const resolvedTileBaseUrl = resolveDynmapTileBaseUrl(
		overrides.tileBaseUrl ?? publicMapConfig.dynmapTileBaseUrl ?? null,
	)

	return {
		...baseConfig,
		...overrides,
		tileBaseUrl: resolvedTileBaseUrl,
	}
}
