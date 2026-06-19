import L from 'leaflet'
import type {
	MinecraftMapBlockPoint,
	MinecraftMapController,
	MinecraftMapEventPayloadMap,
	MinecraftMapLatLng,
	MinecraftMapMountOptions,
	MinecraftMapProvider,
	MinecraftMapTileDescriptor,
} from './types'

interface ProviderTileLayerOptions extends L.TileLayerOptions {
	provider: MinecraftMapProvider
}

class ProviderTileLayer extends L.TileLayer {
	declare options: ProviderTileLayerOptions

	constructor(provider: MinecraftMapProvider) {
		const options = {
			provider,
			tileSize: provider.tileSchema.tileSize,
			minZoom: provider.tileSchema.minZoom,
			maxZoom: provider.tileSchema.maxZoom,
			maxNativeZoom: provider.tileSchema.maxNativeZoom,
			noWrap: provider.tileSchema.noWrap ?? true,
			zoomReverse: provider.tileSchema.zoomReverse ?? false,
			attribution: provider.tileSchema.attribution,
		} as ProviderTileLayerOptions

		super('', options)
	}

	override getTileUrl(coords: L.Coords): string {
		const descriptor: MinecraftMapTileDescriptor | null =
			this.options.provider.resolveTile({
				x: coords.x,
				y: coords.y,
				z: this._getZoomForUrl(),
			})

		return (
			descriptor?.url ??
			'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
		)
	}
}

export class LeafletMinecraftMapController implements MinecraftMapController {
	private map: L.Map | null = null
	private tileLayer: ProviderTileLayer | null = null
	private readonly provider: MinecraftMapProvider
	private readonly listeners: {
		[K in keyof MinecraftMapEventPayloadMap]: Set<
			(payload: MinecraftMapEventPayloadMap[K]) => void
		>
	} = {
		ready: new Set(),
		destroy: new Set(),
		moveend: new Set(),
		pointermove: new Set(),
	}

	constructor(provider: MinecraftMapProvider) {
		this.provider = provider
	}

	mount(options: MinecraftMapMountOptions) {
		const target = this.resolveContainer(options.container)
		if (!target) {
			throw new Error('地图容器不存在或尚未挂载。')
		}

		const initialCenter = options.center ?? this.provider.defaultView.center
		const initialZoom = options.zoom ?? this.provider.defaultView.zoom
		const tileSchema = this.provider.tileSchema

		const map = L.map(target, {
			crs: L.CRS.Simple,
			minZoom: tileSchema.minZoom,
			maxZoom: tileSchema.maxZoom,
			zoom: initialZoom,
			center: this.toLeafletLatLng(initialCenter),
			preferCanvas: true,
			zoomControl: options.showZoomControl ?? true,
			attributionControl: false,
			scrollWheelZoom: true,
		})

		if (this.provider.isConfigured) {
			const tileLayer = new ProviderTileLayer(this.provider)
			tileLayer.addTo(map)
			this.tileLayer = tileLayer
		}

		map.whenReady(() => {
			this.emit('ready', {
				providerId: this.provider.id,
			})
		})

		map.on('moveend', () => {
			this.emit('moveend', {
				center: this.fromLeafletLatLng(map.getCenter()),
				zoom: map.getZoom(),
			})
		})

		map.on('mousemove', (event) => {
			this.emit('pointermove', {
				latlng: {
					lat: event.latlng.lat,
					lng: event.latlng.lng,
				},
				blockPoint: this.fromLeafletLatLng(event.latlng),
			})
		})

		this.map = map
	}

	destroy() {
		this.tileLayer = null
		if (this.map) {
			this.map.off()
			this.map.remove()
			this.map = null
		}

		this.emit('destroy', {
			providerId: this.provider.id,
		})
	}

	centerOnBlock(point: MinecraftMapBlockPoint, zoom?: number) {
		if (!this.map) {
			return
		}

		const target = this.toLeafletLatLng(point)
		if (typeof zoom === 'number') {
			this.map.setView(target, zoom)
			return
		}

		this.map.panTo(target)
	}

	flyToBlock(point: MinecraftMapBlockPoint, zoom?: number) {
		if (!this.map) {
			return
		}

		const target = this.toLeafletLatLng(point)
		if (typeof zoom === 'number') {
			this.map.flyTo(target, zoom)
			return
		}

		this.map.flyTo(target)
	}

	toLatLng(point: MinecraftMapBlockPoint): MinecraftMapLatLng {
		return this.provider.projection.toLatLng(point)
	}

	fromLatLng(latlng: MinecraftMapLatLng): MinecraftMapBlockPoint {
		return this.provider.projection.fromLatLng(latlng)
	}

	on<EventName extends keyof MinecraftMapEventPayloadMap>(
		eventName: EventName,
		handler: (payload: MinecraftMapEventPayloadMap[EventName]) => void,
	) {
		this.listeners[eventName].add(handler)
		return () => {
			this.off(eventName, handler)
		}
	}

	off<EventName extends keyof MinecraftMapEventPayloadMap>(
		eventName: EventName,
		handler: (payload: MinecraftMapEventPayloadMap[EventName]) => void,
	) {
		this.listeners[eventName].delete(handler)
	}

	getLeafletInstance() {
		return this.map
	}

	private emit<EventName extends keyof MinecraftMapEventPayloadMap>(
		eventName: EventName,
		payload: MinecraftMapEventPayloadMap[EventName],
	) {
		for (const handler of this.listeners[eventName]) {
			handler(payload)
		}
	}

	private toLeafletLatLng(point: MinecraftMapBlockPoint) {
		const latlng = this.toLatLng(point)
		return L.latLng(latlng.lat, latlng.lng)
	}

	private fromLeafletLatLng(latlng: L.LatLng): MinecraftMapBlockPoint {
		return this.fromLatLng({
			lat: latlng.lat,
			lng: latlng.lng,
		})
	}

	private resolveContainer(
		target: MinecraftMapMountOptions['container'],
	): HTMLElement | null {
		if (typeof target === 'string') {
			return document.querySelector<HTMLElement>(target)
		}

		return target
	}
}

export const createLeafletMapController = (
	provider: MinecraftMapProvider,
): MinecraftMapController => new LeafletMinecraftMapController(provider)
