export interface MinecraftMapBlockPoint {
	x: number
	z: number
}

export interface MinecraftMapLatLng {
	lat: number
	lng: number
}

export interface MinecraftMapProjection {
	toLatLng(point: MinecraftMapBlockPoint): MinecraftMapLatLng
	fromLatLng(latlng: MinecraftMapLatLng): MinecraftMapBlockPoint
}

export interface MinecraftMapTileRequest {
	x: number
	y: number
	z: number
}

export interface MinecraftMapTileDescriptor {
	url: string
}

export interface MinecraftMapTileSchema {
	tileSize: number
	minZoom: number
	maxZoom: number
	maxNativeZoom?: number
	noWrap?: boolean
	zoomReverse?: boolean
	attribution?: string
}

export interface MinecraftMapViewState {
	center: MinecraftMapBlockPoint
	zoom: number
}

export interface MinecraftMapProvider {
	readonly id: string
	readonly isConfigured: boolean
	readonly projection: MinecraftMapProjection
	readonly tileSchema: MinecraftMapTileSchema
	readonly defaultView: MinecraftMapViewState

	resolveTile(
		request: MinecraftMapTileRequest,
	): MinecraftMapTileDescriptor | null
}

export interface MinecraftMapMountOptions {
	container: string | HTMLElement
	center?: MinecraftMapBlockPoint
	zoom?: number
	showZoomControl?: boolean
}

export interface MinecraftMapReadyEventPayload {
	providerId: string
}

export interface MinecraftMapDestroyEventPayload {
	providerId: string
}

export interface MinecraftMapMoveEndEventPayload {
	center: MinecraftMapBlockPoint
	zoom: number
}

export interface MinecraftMapPointerMoveEventPayload {
	latlng: MinecraftMapLatLng
	blockPoint: MinecraftMapBlockPoint
}

export interface MinecraftMapEventPayloadMap {
	ready: MinecraftMapReadyEventPayload
	destroy: MinecraftMapDestroyEventPayload
	moveend: MinecraftMapMoveEndEventPayload
	pointermove: MinecraftMapPointerMoveEventPayload
}

export interface MinecraftMapController {
	mount(options: MinecraftMapMountOptions): void
	destroy(): void
	centerOnBlock(point: MinecraftMapBlockPoint, zoom?: number): void
	flyToBlock(point: MinecraftMapBlockPoint, zoom?: number): void
	toLatLng(point: MinecraftMapBlockPoint): MinecraftMapLatLng
	fromLatLng(latlng: MinecraftMapLatLng): MinecraftMapBlockPoint
	on<EventName extends keyof MinecraftMapEventPayloadMap>(
		eventName: EventName,
		handler: (payload: MinecraftMapEventPayloadMap[EventName]) => void,
	): () => void
	off<EventName extends keyof MinecraftMapEventPayloadMap>(
		eventName: EventName,
		handler: (payload: MinecraftMapEventPayloadMap[EventName]) => void,
	): void
	getLeafletInstance(): unknown | null
}
