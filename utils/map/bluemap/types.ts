export type BlueMapViewMode = 'flat' | 'perspective' | 'freeFlight'

export interface BlueMapAssetsSource {
	assetsBaseUrl: string
}

export interface BlueMapFocus {
	x: number
	y?: number | null
	z: number
	zoom?: number
}

export interface BlueMapViewOrientation {
	rotation?: number
	angle?: number
	tilt?: number
}

export interface BlueMapHomeWaterPostProcessing {
	rippleStrength: number
	reflectionStrength: number
	reflectionWidth: number
	animationSpeed: number
	waveSeed: number
	irregularity: number
	voidFillColor: [number, number, number]
	tintColor: [number, number, number]
	tintStrength: number
	transmissionStrength: number
	glintStrength: number
	glintDensity: number
	glintSharpness: number
	glintSpeed: number
	bloomStrength: number
	bloomRadius: number
}

export interface BlueMapHomeAtmospherePostProcessing {
	profile: 'homeAtmosphere'
	sunX: number
	sunY: number
	intensity: number
	blurStrength: number
	beamStrength: number
	beamAngle: number
	beamSpread: number
	desktopBeamWidth: number
	mobileBeamWidth: number
	scanXAmplitude: number
	scanPeriodSeconds: number
	hazeStrength: number
	animationSpeed: number
	desktopQualityScale: number
	mobileQualityScale: number
	water?: BlueMapHomeWaterPostProcessing
}

export type BlueMapPostProcessingOptions = BlueMapHomeAtmospherePostProcessing

export interface BlueMapPlayerMarker extends BlueMapFocus {
	id: string
	label?: string
	color?: string
	yaw?: number | null
	skinUrl?: string | null
	detailLabels?: {
		coordinates: string
		direction: string
		playerId: string
	}
}

export interface BlueMapWorldPlayerMarker {
	id: string
	playerId: string
	label: string
	avatarUrl: string
	isAdministrator?: boolean
	isFocused?: boolean
	x: number
	y: number
	z: number
}

export interface BlueMapWorldPlayerMarkerClickEventPayload {
	marker: BlueMapWorldPlayerMarker
}

export interface BlueMapMapSettings {
	name?: string
	startPos?: [number, number]
	flatView: boolean
	perspectiveView: boolean
	freeFlightView: boolean
	hires?: BlueMapHiresSettings
	lowres?: BlueMapLowresSettings
}

export interface BlueMapHiresSettings {
	tileSize: [number, number]
	scale: [number, number]
	translate: [number, number]
}

export interface BlueMapLowresSettings {
	tileSize: [number, number]
	lodFactor: number
	lodCount: number
}

export interface BlueMapCapabilities {
	flat: boolean
	perspective: boolean
	freeFlight: boolean
}

export interface BlueMapReadyEventPayload {
	assetsBaseUrl: string
	settings: BlueMapMapSettings
	capabilities: BlueMapCapabilities
}

export interface BlueMapModeChangedEventPayload {
	mode: BlueMapViewMode
}

export interface BlueMapFocusChangedEventPayload {
	focus: BlueMapFocus
}

export interface BlueMapViewChangedEventPayload {
	x: number
	y: number
	z: number
	distance: number
	rotation: number
	angle: number
	tilt: number
}

export type BlueMapViewPreset = BlueMapViewChangedEventPayload

export interface BlueMapErrorEventPayload {
	code:
		| 'INVALID_ASSETS_BASE_URL'
		| 'ASSETS_SETTINGS_NOT_FOUND'
		| 'ASSETS_SETTINGS_INVALID'
		| 'MAP_MODE_UNAVAILABLE'
		| 'WEBAPP_RUNTIME_UNAVAILABLE'
		| 'MAP_RENDER_FAILED'
	message: string
	error?: unknown
}

export interface BlueMapEventPayloadMap {
	ready: BlueMapReadyEventPayload
	modeChanged: BlueMapModeChangedEventPayload
	focusChanged: BlueMapFocusChangedEventPayload
	viewChanged: BlueMapViewChangedEventPayload
	worldPlayerMarkerClick: BlueMapWorldPlayerMarkerClickEventPayload
	error: BlueMapErrorEventPayload
	destroy: Record<string, never>
}

export interface BlueMapRuntimeMountOptions {
	container: HTMLElement
	assetsBaseUrl: string
	settings: BlueMapMapSettings
	mode: BlueMapViewMode
	appendCacheBust?: boolean
	initialDistance?: number
	initialFocus?: BlueMapFocus
	focusHeightOffset?: number
	initialOrientation?: BlueMapViewOrientation
	unrestrictedPerspectiveAngle?: boolean
	unrestrictedViewDistance?: boolean
	keyboardControls?: boolean
	postProcessing?: BlueMapPostProcessingOptions
	player?: BlueMapPlayerMarker | null
	worldPlayerMarkers?: readonly BlueMapWorldPlayerMarker[]
	markerClicksOnly?: boolean
	onViewChanged?: (view: BlueMapViewChangedEventPayload) => void
	onWorldPlayerMarkerClick?: (
		payload: BlueMapWorldPlayerMarkerClickEventPayload,
	) => void
}

export interface BlueMapRuntime {
	mount(options: BlueMapRuntimeMountOptions): void | Promise<void>
	resize(): void
	setMode(mode: BlueMapViewMode): void | Promise<void>
	focus(focus: BlueMapFocus): void | Promise<void>
	focusPlayer(focus: BlueMapFocus): void | Promise<void>
	cancelFocus(): void
	setPresence(player: BlueMapPlayerMarker | null): void
	setWorldPlayerMarkers(markers: readonly BlueMapWorldPlayerMarker[]): void
	alignNorth(): void | Promise<void>
	resetView(): void | Promise<void>
	restoreView(view: BlueMapViewPreset): void | Promise<void>
	setView(view: BlueMapViewPreset): void
	clearScrollDrivenView(): void
	setHomeAtmosphereProgress(progress: number): void
	destroy(): void
}

export interface BlueMapRuntimeFactory {
	create(): BlueMapRuntime
}

export interface BlueMapController {
	mount(options: {
		container: HTMLElement
		assets: BlueMapAssetsSource
		mode?: BlueMapViewMode
		appendCacheBust?: boolean
		initialDistance?: number
		focus?: BlueMapFocus
		focusHeightOffset?: number
		initialOrientation?: BlueMapViewOrientation
		unrestrictedPerspectiveAngle?: boolean
		unrestrictedViewDistance?: boolean
		keyboardControls?: boolean
		postProcessing?: BlueMapPostProcessingOptions
		player?: BlueMapPlayerMarker | null
		worldPlayerMarkers?: readonly BlueMapWorldPlayerMarker[]
		markerClicksOnly?: boolean
	}): Promise<void>
	resize(): void
	setMode(mode: BlueMapViewMode): Promise<void>
	focus(focus: BlueMapFocus): Promise<void>
	focusPlayer(focus: BlueMapFocus): Promise<void>
	cancelFocus(): void
	setPresence(player: BlueMapPlayerMarker | null): void
	setWorldPlayerMarkers(markers: readonly BlueMapWorldPlayerMarker[]): void
	alignNorth(): Promise<void>
	resetView(): Promise<void>
	restoreView(view: BlueMapViewPreset): Promise<void>
	setView(view: BlueMapViewPreset): void
	clearScrollDrivenView(): void
	setHomeAtmosphereProgress(progress: number): void
	destroy(): void
	getSettings(): BlueMapMapSettings | null
	getCapabilities(): BlueMapCapabilities
	on<EventName extends keyof BlueMapEventPayloadMap>(
		eventName: EventName,
		handler: (payload: BlueMapEventPayloadMap[EventName]) => void,
	): () => void
}
