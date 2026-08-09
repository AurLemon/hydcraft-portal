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
	rotation: number
	angle: number
	tilt: number
}

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
	player?: BlueMapPlayerMarker | null
	onViewChanged?: (view: BlueMapViewChangedEventPayload) => void
}

export interface BlueMapRuntime {
	mount(options: BlueMapRuntimeMountOptions): void | Promise<void>
	setMode(mode: BlueMapViewMode): void | Promise<void>
	focus(focus: BlueMapFocus): void | Promise<void>
	focusPlayer(focus: BlueMapFocus): void | Promise<void>
	cancelFocus(): void
	setPresence(player: BlueMapPlayerMarker | null): void
	alignNorth(): void | Promise<void>
	resetView(): void | Promise<void>
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
		player?: BlueMapPlayerMarker | null
	}): Promise<void>
	setMode(mode: BlueMapViewMode): Promise<void>
	focus(focus: BlueMapFocus): Promise<void>
	focusPlayer(focus: BlueMapFocus): Promise<void>
	cancelFocus(): void
	setPresence(player: BlueMapPlayerMarker | null): void
	alignNorth(): Promise<void>
	resetView(): Promise<void>
	destroy(): void
	getSettings(): BlueMapMapSettings | null
	getCapabilities(): BlueMapCapabilities
	on<EventName extends keyof BlueMapEventPayloadMap>(
		eventName: EventName,
		handler: (payload: BlueMapEventPayloadMap[EventName]) => void,
	): () => void
}
