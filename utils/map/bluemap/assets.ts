import type {
	BlueMapAssetsSource,
	BlueMapCapabilities,
	BlueMapMapSettings,
	BlueMapViewMode,
} from './types'

export class BlueMapAssetsError extends Error {
	readonly code:
		| 'INVALID_ASSETS_BASE_URL'
		| 'ASSETS_SETTINGS_NOT_FOUND'
		| 'ASSETS_SETTINGS_INVALID'

	constructor(
		code: BlueMapAssetsError['code'],
		message: string,
		options?: { cause?: unknown },
	) {
		super(message, options)
		this.name = 'BlueMapAssetsError'
		this.code = code
	}
}

const asPair = (
	value: unknown,
	fallback: [number, number],
): [number, number] => {
	if (
		Array.isArray(value) &&
		value.length >= 2 &&
		typeof value[0] === 'number' &&
		typeof value[1] === 'number' &&
		Number.isFinite(value[0]) &&
		Number.isFinite(value[1])
	) {
		return [value[0], value[1]]
	}

	return fallback
}

const parseSettings = (value: unknown): BlueMapMapSettings => {
	if (!value || typeof value !== 'object') {
		throw new BlueMapAssetsError(
			'ASSETS_SETTINGS_INVALID',
			'BlueMap settings.json 不是有效对象。',
		)
	}

	const raw = value as Record<string, unknown>
	const flatView = raw.flatView !== false
	const perspectiveView = raw.perspectiveView === true
	const freeFlightView = raw.freeFlightView === true
	const lowresRaw =
		raw.lowres && typeof raw.lowres === 'object'
			? (raw.lowres as Record<string, unknown>)
			: null
	const hiresRaw =
		raw.hires && typeof raw.hires === 'object'
			? (raw.hires as Record<string, unknown>)
			: null

	const settings: BlueMapMapSettings = {
		name: typeof raw.name === 'string' ? raw.name : undefined,
		startPos: asPair(raw.startPos, [0, 0]),
		flatView,
		perspectiveView,
		freeFlightView,
	}

	if (lowresRaw) {
		const tileSize = asPair(lowresRaw.tileSize, [500, 500])
		const lodFactor =
			typeof lowresRaw.lodFactor === 'number' && lowresRaw.lodFactor > 1
				? lowresRaw.lodFactor
				: 5
		const lodCount =
			typeof lowresRaw.lodCount === 'number' && lowresRaw.lodCount > 0
				? Math.floor(lowresRaw.lodCount)
				: 1
		settings.lowres = { tileSize, lodFactor, lodCount }
	}

	if (hiresRaw) {
		settings.hires = {
			tileSize: asPair(hiresRaw.tileSize, [32, 32]),
			scale: asPair(hiresRaw.scale, [1, 1]),
			translate: asPair(hiresRaw.translate, [0, 0]),
		}
	}

	return settings
}

export const normalizeBlueMapAssetsBaseUrl = (value: string): string => {
	try {
		const url = new URL(value.trim())
		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			throw new Error('unsupported protocol')
		}
		return url.toString().replace(/\/$/, '')
	} catch (error) {
		throw new BlueMapAssetsError(
			'INVALID_ASSETS_BASE_URL',
			'BlueMap assets 地址必须是 http(s) URL。',
			{ cause: error },
		)
	}
}

export const resolveBlueMapAssetUrl = (
	assetsBaseUrl: string,
	assetPath: string,
): string => {
	const baseUrl = normalizeBlueMapAssetsBaseUrl(assetsBaseUrl)
	return `${baseUrl}/${assetPath.replace(/^\/+/, '')}`
}

export const loadBlueMapSettings = async (
	assets: BlueMapAssetsSource,
	options?: { signal?: AbortSignal },
): Promise<{ assetsBaseUrl: string; settings: BlueMapMapSettings }> => {
	const assetsBaseUrl = normalizeBlueMapAssetsBaseUrl(assets.assetsBaseUrl)
	const settingsUrl = resolveBlueMapAssetUrl(assetsBaseUrl, 'settings.json')
	let response: Response

	try {
		response = await fetch(settingsUrl, { signal: options?.signal })
	} catch (error) {
		throw new BlueMapAssetsError(
			'ASSETS_SETTINGS_NOT_FOUND',
			'无法读取 BlueMap settings.json。',
			{ cause: error },
		)
	}

	if (!response.ok) {
		throw new BlueMapAssetsError(
			'ASSETS_SETTINGS_NOT_FOUND',
			`BlueMap settings.json 请求失败（HTTP ${response.status}）。`,
		)
	}

	let value: unknown
	try {
		value = await response.json()
	} catch (error) {
		throw new BlueMapAssetsError(
			'ASSETS_SETTINGS_INVALID',
			'BlueMap settings.json 不是有效 JSON。',
			{ cause: error },
		)
	}

	return { assetsBaseUrl, settings: parseSettings(value) }
}

export const getBlueMapCapabilities = (
	settings: BlueMapMapSettings,
): BlueMapCapabilities => ({
	flat: settings.flatView && Boolean(settings.lowres),
	perspective: settings.perspectiveView && Boolean(settings.hires),
	freeFlight: settings.freeFlightView && Boolean(settings.hires),
})

export const isBlueMapModeEnabled = (
	capabilities: BlueMapCapabilities,
	mode: BlueMapViewMode,
): boolean => capabilities[mode]

export const pathFromBlueMapTileCoords = (x: number, z: number): string => {
	const split = (value: number) => {
		const absolute = Math.abs(Math.trunc(value))
		const prefix = value < 0 ? '-' : ''
		return `${prefix}${String(absolute).split('').join('/')}/`
	}

	return `x${split(x)}z${split(z)}`.slice(0, -1)
}
