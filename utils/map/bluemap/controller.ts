import {
	BlueMapAssetsError,
	getBlueMapCapabilities,
	isBlueMapModeEnabled,
	loadBlueMapSettings,
} from './assets'
import type {
	BlueMapAssetsSource,
	BlueMapCapabilities,
	BlueMapController,
	BlueMapErrorEventPayload,
	BlueMapEventPayloadMap,
	BlueMapFocus,
	BlueMapMapSettings,
	BlueMapPlayerMarker,
	BlueMapRuntime,
	BlueMapRuntimeFactory,
	BlueMapRuntimeMountOptions,
	BlueMapViewChangedEventPayload,
	BlueMapViewMode,
} from './types'

const WEBGL_INFO_LOG_NORMALIZED = Symbol.for(
	'hydcraft.bluemap.webgl-info-log-normalized',
)

/**
 * Three r147 calls `.trim()` on WebGL diagnostic results. Chromium can return
 * `null` for an empty info log, even though the corresponding program is
 * usable. Normalize that browser edge case while keeping Three's actual shader
 * error reporting enabled.
 */
const normalizeWebGlInfoLogs = () => {
	const contextTypes = [
		window.WebGLRenderingContext,
		window.WebGL2RenderingContext,
	]

	for (const contextType of contextTypes) {
		if (!contextType) continue
		const prototype = contextType.prototype
		if (Reflect.get(prototype, WEBGL_INFO_LOG_NORMALIZED)) continue

		for (const method of ['getProgramInfoLog', 'getShaderInfoLog'] as const) {
			const original = Reflect.get(prototype, method)
			if (typeof original !== 'function') continue

			Reflect.set(
				prototype,
				method,
				function (this: unknown, ...args: unknown[]) {
					return Reflect.apply(original, this, args) ?? ''
				},
			)
		}

		Reflect.set(prototype, WEBGL_INFO_LOG_NORMALIZED, true)
	}
}

class BlueMapRuntimeError extends Error {
	readonly code: BlueMapErrorEventPayload['code']

	constructor(
		message: string,
		code: BlueMapErrorEventPayload['code'] = 'WEBAPP_RUNTIME_UNAVAILABLE',
	) {
		super(message)
		this.name = 'BlueMapRuntimeError'
		this.code = code
	}
}

interface PlayerPresenceMarker {
	position: {
		x: number
		y: number
		z: number
		set(x: number, y: number, z: number): void
	}
	renderOrder: number
	geometry: { dispose(): void }
	material: {
		map?: { dispose(): void }
		dispose(): void
	}
}

interface ThreeLoadingManager {
	urlModifier?: (url: string) => string
	setURLModifier(transform: (url: string) => string): void
}

const cacheBustFreeAssets = new Map<string, number>()
let cacheBustUrlModifierInstalled = false

const stripBlueMapCacheBust = (url: string): string => {
	try {
		const assetUrl = new URL(url, window.location.href)
		if (!/^\?\d+$/.test(assetUrl.search)) return url

		const assetBaseUrl = `${assetUrl.origin}${assetUrl.pathname}`
		const matchesRegisteredBase = Array.from(cacheBustFreeAssets.keys()).some(
			(baseUrl) =>
				assetBaseUrl === baseUrl || assetBaseUrl.startsWith(`${baseUrl}/`),
		)
		if (!matchesRegisteredBase) return url

		assetUrl.search = ''
		return assetUrl.toString()
	} catch {
		return url
	}
}

const registerCacheBustFreeAssets = (
	manager: ThreeLoadingManager,
	assetsBaseUrl: string,
) => {
	if (!cacheBustUrlModifierInstalled) {
		const existingModifier = manager.urlModifier
		manager.setURLModifier((url) =>
			stripBlueMapCacheBust(existingModifier ? existingModifier(url) : url),
		)
		cacheBustUrlModifierInstalled = true
	}

	cacheBustFreeAssets.set(
		assetsBaseUrl,
		(cacheBustFreeAssets.get(assetsBaseUrl) ?? 0) + 1,
	)
}

const unregisterCacheBustFreeAssets = (assetsBaseUrl: string | null) => {
	if (!assetsBaseUrl) return
	const instances = cacheBustFreeAssets.get(assetsBaseUrl) ?? 0
	if (instances <= 1) {
		cacheBustFreeAssets.delete(assetsBaseUrl)
		return
	}
	cacheBustFreeAssets.set(assetsBaseUrl, instances - 1)
}

/**
 * Thin adapter around the vendored BlueMap v5.3 rendering core. The official
 * webapp is a standalone Vue app, so Portal mounts only its MapViewer/Map and
 * controls while keeping Portal's own UI and event contract.
 */
class OfficialBlueMapRuntime implements BlueMapRuntime {
	/**
	 * BlueMap's published site starts 3D rendering at a 100-block hires
	 * radius. Portal must never use this budget while it is only presenting a
	 * flat overview.
	 */
	private static readonly HIRES_VIEW_DISTANCE = 100
	private static readonly FLAT_VIEW_DISTANCE = 1500
	private static readonly PERSPECTIVE_DEFAULT_DISTANCE = 1200
	private static readonly PERSPECTIVE_MIN_DISTANCE = 120
	private static readonly MODE_TRANSITION_MS = 520

	private viewer: {
		data: {
			loadedHiresViewDistance: number
			loadedLowresViewDistance: number
		}
		map: {
			data: { startPos: { x: number; z: number } }
			dispose(): void
		}
		controlsManager: {
			controls: unknown
			position: {
				x: number
				y: number
				z: number
				set(x: number, y: number, z: number): void
			}
			distance: number
			angle: number
			rotation: number
			ortho: number
			tilt: number
			updateCamera(): void
		}
		renderer: {
			debug: {
				checkShaderErrors: boolean
			}
			dispose(): void
			forceContextLoss?: () => void
			domElement: HTMLElement
		}
		css2dRenderer: { domElement: HTMLElement }
		handleContainerResize(): void
		loadMapArea(
			x: number,
			z: number,
			hiresViewDistance?: number,
			lowresViewDistance?: number,
		): void
		switchMap(map: unknown): Promise<void>
		updateLoadedMapArea(): void
		rootElement: Element
		markers: {
			add(marker: unknown): void
			remove(marker: unknown): void
		}
	} | null = null
	private map: {
		data: { startPos: { x: number; z: number } }
		dispose(): void
		terrainHeightAt(x: number, z: number): number | boolean
	} | null = null
	private mapControls: {
		stop?(): void
		reset?(): void
		minDistance: number
		maxDistance: number
		update(delta: number, map: unknown): void
		getMaxPerspectiveAngleForDistance?(distance: number): number
	} | null = null
	private freeFlightControls: { stop?(): void } | null = null
	private container: HTMLElement | null = null
	private mode: BlueMapViewMode = 'flat'
	private viewAnimation: { cancel(): void } | null = null
	private focusAnimation: { cancel(): void } | null = null
	private playerAnimation: { cancel(): void } | null = null
	private animationScheduler:
		| ((
				animationFrame: (progress: number) => void,
				durationMs: number,
				postAnimation: (finished: boolean) => void,
		  ) => { cancel(): void })
		| null = null
	private easing: { easeInOutQuad(progress: number): number } | null = null
	private createPlayerMarker: (() => PlayerPresenceMarker) | null = null
	private playerMarker: PlayerPresenceMarker | null = null
	private playerPresence: BlueMapPlayerMarker | null = null
	private cacheBustFreeAssetsBaseUrl: string | null = null
	private onViewChanged:
		| ((view: BlueMapViewChangedEventPayload) => void)
		| null = null

	async mount(options: BlueMapRuntimeMountOptions) {
		this.destroy()
		if (options.mode === 'perspective' && !options.settings.hires) {
			throw new BlueMapRuntimeError(
				'当前地图缺少 hires 资产，无法渲染 Perspective。',
			)
		}
		if (options.mode === 'freeFlight' && !options.settings.hires) {
			throw new BlueMapRuntimeError(
				'当前地图缺少 hires 资产，无法渲染 FreeFlight。',
			)
		}

		this.container = options.container
		this.onViewChanged = options.onViewChanged ?? null
		try {
			const [
				,
				{ MapViewer },
				{ Map: BlueMapMap },
				{ MapControls },
				{ FreeFlightControls },
				{
					Points,
					PointsMaterial,
					BufferGeometry,
					Float32BufferAttribute,
					CanvasTexture,
					DefaultLoadingManager,
				},
				{ animate, EasingFunctions },
			] = await Promise.all([
				import('./blue-map-bridge'),
				import('../../../vendor/bluemap-webapp/v5.3/MapViewer.js'),
				import('../../../vendor/bluemap-webapp/v5.3/map/Map.js'),
				import('../../../vendor/bluemap-webapp/v5.3/controls/map/MapControls.js'),
				import('../../../vendor/bluemap-webapp/v5.3/controls/freeflight/FreeFlightControls.js'),
				import('three'),
				import('../../../vendor/bluemap-webapp/v5.3/util/Utils.js'),
			])

			const events = new EventTarget()
			events.addEventListener('bluemapCameraMoved', (event) => {
				const detail = (
					event as CustomEvent<{
						controlsManager?: {
							rotation?: number
							angle?: number
							tilt?: number
						}
					}>
				).detail
				const controls = detail?.controlsManager
				if (!controls || !this.onViewChanged) return

				this.onViewChanged({
					rotation: Number.isFinite(controls.rotation)
						? (controls.rotation ?? 0)
						: 0,
					angle: Number.isFinite(controls.angle) ? (controls.angle ?? 0) : 0,
					tilt: Number.isFinite(controls.tilt) ? (controls.tilt ?? 0) : 0,
				})
			})
			events.addEventListener('bluemapTileLoaded', () => {
				if (this.playerPresence) this.setPresence(this.playerPresence)
			})
			events.addEventListener('bluemapAlert', (event) => {
				const detail = (
					event as CustomEvent<{
						level?: string
						message?: unknown
					}>
				).detail
				const message =
					typeof detail?.message === 'string' ? detail.message : ''
				const expectedMissingImage =
					/(?:404|not found|failed to load).*(?:png|jpe?g|webp|gif|image)/i.test(
						message,
					)
				if (detail?.level === 'fine' || expectedMissingImage) {
					event.preventDefault()
				}
			})
			normalizeWebGlInfoLogs()
			this.animationScheduler = animate as unknown as NonNullable<
				typeof this.animationScheduler
			>
			this.easing = EasingFunctions
			this.createPlayerMarker = () => {
				const canvas = document.createElement('canvas')
				canvas.width = 96
				canvas.height = 96
				const context = canvas.getContext('2d')
				if (!context) throw new Error('PLAYER_MARKER_CANVAS_UNAVAILABLE')
				context.beginPath()
				context.arc(48, 48, 30, 0, Math.PI * 2)
				context.fillStyle = 'rgba(255, 255, 255, 0.42)'
				context.fill()
				context.beginPath()
				context.arc(48, 48, 18, 0, Math.PI * 2)
				context.fillStyle = '#0ea5e9'
				context.fill()
				context.lineWidth = 7
				context.strokeStyle = '#ffffff'
				context.stroke()

				const geometry = new BufferGeometry()
				geometry.setAttribute(
					'position',
					new Float32BufferAttribute([0, 0, 0], 3),
				)
				const point = new Points(
					geometry,
					new PointsMaterial({
						map: new CanvasTexture(canvas),
						transparent: true,
						alphaTest: 0.01,
						size: 32,
						sizeAttenuation: false,
						depthTest: false,
						depthWrite: false,
					}),
				)
				point.renderOrder = 1000
				return point as unknown as PlayerPresenceMarker
			}
			if (options.appendCacheBust === false) {
				this.cacheBustFreeAssetsBaseUrl = options.assetsBaseUrl.replace(
					/\/$/,
					'',
				)
				registerCacheBustFreeAssets(
					DefaultLoadingManager as ThreeLoadingManager,
					this.cacheBustFreeAssetsBaseUrl,
				)
			}
			const viewer = new MapViewer(options.container, events)
			const map = new BlueMapMap(
				'portal-map',
				`${options.assetsBaseUrl.replace(/\/$/, '')}/`,
				() => Promise.resolve(),
				events,
			)
			this.viewer = viewer
			this.map = map
			this.mapControls = new MapControls(
				viewer.renderer.domElement,
				options.container,
			)
			const nativeMapControlsUpdate = this.mapControls.update.bind(
				this.mapControls,
			)
			this.mapControls.update = (delta, loadedMap) => {
				nativeMapControlsUpdate(delta, loadedMap)
				if (this.mode === 'perspective') {
					viewer.controlsManager.distance = Math.max(
						OfficialBlueMapRuntime.PERSPECTIVE_MIN_DISTANCE,
						viewer.controlsManager.distance,
					)
				}
			}
			this.freeFlightControls = new FreeFlightControls(
				viewer.renderer.domElement,
			)
			const initialFocus = options.initialFocus ?? {
				x: options.settings.startPos?.[0] ?? 0,
				z: options.settings.startPos?.[1] ?? 0,
			}
			const requestedInitialDistance =
				typeof options.initialDistance === 'number' &&
				Number.isFinite(options.initialDistance)
					? options.initialDistance
					: null

			// MapViewer starts its render loop in the constructor and switchMap()
			// schedules the first tile load. Its own default distance is 300, which
			// would request hires .prbm files before Portal gets a chance to set the
			// selected mode. Configure the very first frame ahead of switchMap().
			this.mode = options.mode
			const controls = viewer.controlsManager
			controls.position.set(initialFocus.x, 3, initialFocus.z)
			if (options.mode === 'flat') {
				controls.distance = Math.max(
					requestedInitialDistance ?? OfficialBlueMapRuntime.FLAT_VIEW_DISTANCE,
					5,
				)
				controls.rotation = 0
				controls.angle = 0
				controls.tilt = 0
				controls.ortho = 1
				viewer.data.loadedHiresViewDistance = 0
			} else if (options.mode === 'perspective') {
				this.mapControls.minDistance =
					OfficialBlueMapRuntime.PERSPECTIVE_MIN_DISTANCE
				controls.distance = Math.max(
					requestedInitialDistance ??
						OfficialBlueMapRuntime.PERSPECTIVE_DEFAULT_DISTANCE,
					OfficialBlueMapRuntime.PERSPECTIVE_MIN_DISTANCE,
				)
				controls.ortho = 0
				controls.angle = 0
				viewer.data.loadedHiresViewDistance =
					OfficialBlueMapRuntime.HIRES_VIEW_DISTANCE
			} else {
				controls.distance = 0
				controls.ortho = 0
				controls.angle = Math.PI / 2
				controls.tilt = 0
				viewer.data.loadedHiresViewDistance =
					OfficialBlueMapRuntime.HIRES_VIEW_DISTANCE
			}
			controls.controls =
				options.mode === 'freeFlight'
					? this.freeFlightControls
					: this.mapControls
			controls.updateCamera()
			await viewer.switchMap(map)
			this.setCamera(initialFocus)
			await this.setMode(options.mode, 0)
			this.setPresence(options.player ?? null)
		} catch (error) {
			this.destroy()
			if (error instanceof BlueMapRuntimeError) throw error
			throw new BlueMapRuntimeError(
				error instanceof Error
					? `BlueMap WebApp v5.3 初始化失败：${error.message}`
					: 'BlueMap WebApp v5.3 初始化失败。',
			)
		}
	}

	setMode(
		mode: BlueMapViewMode,
		transitionMs = OfficialBlueMapRuntime.MODE_TRANSITION_MS,
	) {
		const viewer = this.viewer
		const animate = this.animationScheduler
		const easing = this.easing
		if (!viewer || !animate || !easing) return
		const controls = viewer.controlsManager
		const currentDistance = Math.max(5, controls.distance || 300)
		const start = {
			distance: controls.distance,
			y: controls.position.y,
			rotation: controls.rotation,
			angle: controls.angle,
			ortho: controls.ortho,
			tilt: controls.tilt,
		}
		const terrainHeight = this.getTerrainHeight(
			controls.position.x,
			controls.position.z,
		)
		const target = { ...start }

		this.viewAnimation?.cancel()
		// The official WebApp detaches controls during a view animation. This
		// keeps user input from overwriting the interpolated camera state.
		controls.controls = null
		if (mode === 'flat') {
			target.distance = Math.max(
				OfficialBlueMapRuntime.FLAT_VIEW_DISTANCE,
				currentDistance,
			)
			target.y = 0
			target.rotation = 0
			target.angle = 0
			target.tilt = 0
			target.ortho = 1
		} else if (mode === 'perspective') {
			// Mirror the official WebApp: preserve the framing selected in flat
			// mode and interpolate the projection only. Terrain approach is driven
			// by a later user zoom, not by changing the view mode itself.
			const targetDistance = Math.max(
				OfficialBlueMapRuntime.PERSPECTIVE_MIN_DISTANCE,
				currentDistance,
			)
			if (this.mapControls) {
				this.mapControls.minDistance =
					OfficialBlueMapRuntime.PERSPECTIVE_MIN_DISTANCE
			}
			target.y = terrainHeight * Math.max(0, 1 - targetDistance / 500)
			target.distance = targetDistance
			target.ortho = 0
			target.tilt = 0
			const maxAngle =
				this.mapControls?.getMaxPerspectiveAngleForDistance?.(targetDistance) ??
				Math.PI / 2
			target.angle = Math.min(Math.PI / 2, start.angle, maxAngle)
		} else {
			if (this.mapControls) this.mapControls.minDistance = 5
			target.y = terrainHeight
			target.distance = 0
			target.ortho = 0
			target.angle = Math.PI / 2
			target.tilt = 0
		}

		if (mode !== 'flat' && target.distance < 1000) {
			viewer.loadMapArea(
				controls.position.x,
				controls.position.z,
				OfficialBlueMapRuntime.HIRES_VIEW_DISTANCE,
				viewer.data.loadedLowresViewDistance,
			)
		}

		this.viewAnimation = animate(
			(progress) => {
				const eased = easing.easeInOutQuad(progress)
				controls.position.y = start.y + (target.y - start.y) * eased
				controls.distance =
					start.distance + (target.distance - start.distance) * eased
				controls.rotation =
					start.rotation + (target.rotation - start.rotation) * eased
				controls.angle = start.angle + (target.angle - start.angle) * eased
				controls.ortho = start.ortho + (target.ortho - start.ortho) * progress
				controls.tilt = start.tilt + (target.tilt - start.tilt) * eased
			},
			transitionMs,
			(finished) => {
				if (!finished) return
				this.viewAnimation = null
				this.mode = mode
				this.mapControls?.reset?.()
				controls.controls =
					mode === 'freeFlight' ? this.freeFlightControls : this.mapControls
				controls.updateCamera()
				this.updateLoadedMapArea()
			},
		)
	}

	focus(focus: BlueMapFocus) {
		const viewer = this.viewer
		const animate = this.animationScheduler
		const easing = this.easing
		if (!viewer || !animate || !easing) {
			this.setCamera(focus)
			return
		}

		const controls = viewer.controlsManager
		const start = {
			x: controls.position.x,
			y: controls.position.y,
			z: controls.position.z,
			distance: controls.distance,
		}
		const target = this.getCameraTarget(focus)
		if (
			start.x === target.x &&
			start.y === target.y &&
			start.z === target.z &&
			start.distance === target.distance
		) {
			return
		}

		this.focusAnimation?.cancel()
		viewer.loadMapArea(
			target.x,
			target.z,
			this.mode === 'flat' ? 0 : OfficialBlueMapRuntime.HIRES_VIEW_DISTANCE,
			viewer.data.loadedLowresViewDistance,
		)
		this.focusAnimation = animate(
			(progress) => {
				const eased = easing.easeInOutQuad(progress)
				controls.position.set(
					start.x + (target.x - start.x) * eased,
					start.y + (target.y - start.y) * eased,
					start.z + (target.z - start.z) * eased,
				)
				controls.distance =
					start.distance + (target.distance - start.distance) * eased
				controls.updateCamera()
			},
			620,
			(finished) => {
				if (!finished) return
				this.focusAnimation = null
				controls.position.set(target.x, target.y, target.z)
				controls.distance = target.distance
				controls.updateCamera()
				this.updateLoadedMapArea()
			},
		)
	}

	cancelFocus() {
		this.focusAnimation?.cancel()
		this.focusAnimation = null
	}

	setPresence(player: BlueMapPlayerMarker | null) {
		this.playerPresence = player
		const viewer = this.viewer
		if (!viewer) return
		if (!player) {
			this.playerAnimation?.cancel()
			this.playerAnimation = null
			if (this.playerMarker) viewer.markers.remove(this.playerMarker)
			this.playerMarker = null
			return
		}

		if (!this.playerMarker && this.createPlayerMarker) {
			this.playerMarker = this.createPlayerMarker()
			viewer.markers.add(this.playerMarker)
		}
		const marker = this.playerMarker
		if (!marker) return
		const target = {
			x: player.x,
			y: this.getTerrainHeight(player.x, player.z) + 8,
			z: player.z,
		}
		const isNewMarker =
			marker.position.x === 0 &&
			marker.position.y === 0 &&
			marker.position.z === 0
		if (isNewMarker || !this.animationScheduler || !this.easing) {
			marker.position.set(target.x, target.y, target.z)
			return
		}
		if (
			Math.abs(marker.position.x - target.x) < 0.01 &&
			Math.abs(marker.position.y - target.y) < 0.01 &&
			Math.abs(marker.position.z - target.z) < 0.01
		) {
			return
		}

		const start = { ...marker.position }
		this.playerAnimation?.cancel()
		this.playerAnimation = this.animationScheduler(
			(progress) => {
				const eased = this.easing?.easeInOutQuad(progress) ?? progress
				marker.position.set(
					start.x + (target.x - start.x) * eased,
					start.y + (target.y - start.y) * eased,
					start.z + (target.z - start.z) * eased,
				)
			},
			520,
			(finished) => {
				if (!finished) return
				this.playerAnimation = null
				marker.position.set(target.x, target.y, target.z)
			},
		)
	}

	alignNorth() {
		this.animateViewOrientation({ rotation: 0 })
	}

	resetView() {
		this.animateViewOrientation({ rotation: 0, angle: 0, tilt: 0 })
	}

	destroy() {
		const viewer = this.viewer
		unregisterCacheBustFreeAssets(this.cacheBustFreeAssetsBaseUrl)
		this.cacheBustFreeAssetsBaseUrl = null
		this.viewAnimation?.cancel()
		this.viewAnimation = null
		this.focusAnimation?.cancel()
		this.focusAnimation = null
		this.playerAnimation?.cancel()
		this.playerAnimation = null
		this.mapControls?.stop?.()
		this.freeFlightControls?.stop?.()
		this.map?.dispose()
		if (viewer) {
			// MapViewer schedules its render loop recursively. Replacing the callback
			// prevents the next frame from scheduling another frame after unmount.
			;(viewer as unknown as { renderLoop: () => void }).renderLoop = () =>
				undefined
			window.removeEventListener('resize', viewer.handleContainerResize)
			viewer.renderer.forceContextLoss?.()
			viewer.renderer.dispose()
			viewer.rootElement.replaceChildren()
		}
		this.container?.replaceChildren()
		this.viewer = null
		this.map = null
		this.mapControls = null
		this.freeFlightControls = null
		this.container = null
		this.mode = 'flat'
		this.animationScheduler = null
		this.easing = null
		this.createPlayerMarker = null
		this.playerMarker?.material.map?.dispose()
		this.playerMarker?.material.dispose()
		this.playerMarker?.geometry.dispose()
		this.playerMarker = null
		this.playerPresence = null
		this.onViewChanged = null
	}

	private animateViewOrientation(target: {
		rotation?: number
		angle?: number
		tilt?: number
	}) {
		const viewer = this.viewer
		const animate = this.animationScheduler
		const easing = this.easing
		if (!viewer || !animate || !easing) return

		const controls = viewer.controlsManager
		const start = {
			rotation: controls.rotation,
			angle: controls.angle,
			tilt: controls.tilt,
		}
		const end = {
			rotation: target.rotation ?? start.rotation,
			angle: target.angle ?? start.angle,
			tilt: target.tilt ?? start.tilt,
		}

		this.viewAnimation?.cancel()
		controls.controls = null
		this.viewAnimation = animate(
			(progress) => {
				const eased = easing.easeInOutQuad(progress)
				controls.rotation =
					start.rotation + (end.rotation - start.rotation) * eased
				controls.angle = start.angle + (end.angle - start.angle) * eased
				controls.tilt = start.tilt + (end.tilt - start.tilt) * eased
				controls.updateCamera()
			},
			OfficialBlueMapRuntime.MODE_TRANSITION_MS,
			(finished) => {
				if (!finished) return
				this.viewAnimation = null
				controls.rotation = end.rotation
				controls.angle = end.angle
				controls.tilt = end.tilt
				this.mapControls?.reset?.()
				controls.controls =
					this.mode === 'freeFlight'
						? this.freeFlightControls
						: this.mapControls
				controls.updateCamera()
			},
		)
	}

	private setCamera(focus: BlueMapFocus) {
		const viewer = this.viewer
		if (!viewer) return
		const controls = viewer.controlsManager
		const target = this.getCameraTarget(focus)
		controls.position.set(target.x, target.y, target.z)
		controls.distance = target.distance
		controls.updateCamera()
		this.updateLoadedMapArea()
	}

	private getCameraTarget(focus: BlueMapFocus) {
		const controls = this.viewer?.controlsManager
		let distance = controls?.distance ?? 300
		if (typeof focus.zoom === 'number' && Number.isFinite(focus.zoom)) {
			distance = Math.min(100000, Math.max(5, 1500 / Math.pow(2, focus.zoom)))
		}
		if (this.mode === 'flat') {
			distance = Math.max(distance, OfficialBlueMapRuntime.FLAT_VIEW_DISTANCE)
		}

		return { x: focus.x, y: 0, z: focus.z, distance }
	}

	private updateLoadedMapArea() {
		const viewer = this.viewer
		if (!viewer) return

		viewer.loadMapArea(
			viewer.controlsManager.position.x,
			viewer.controlsManager.position.z,
			this.mode === 'flat' ? 0 : OfficialBlueMapRuntime.HIRES_VIEW_DISTANCE,
			viewer.data.loadedLowresViewDistance,
		)
	}

	private getTerrainHeight(x: number, z: number) {
		try {
			const terrainHeight = this.map?.terrainHeightAt(x, z)
			if (typeof terrainHeight === 'number' && Number.isFinite(terrainHeight)) {
				return terrainHeight + 3
			}
		} catch {
			// Hires tiles may not have arrived yet. MapControls will refine the
			// height after the focused area has loaded.
		}

		return 3
	}
}

const defaultRuntimeFactory: BlueMapRuntimeFactory = {
	create: () => new OfficialBlueMapRuntime(),
}

export class BlueMapControllerImpl implements BlueMapController {
	private readonly runtimeFactory: BlueMapRuntimeFactory
	private runtime: BlueMapRuntime | null = null
	private mountGeneration = 0
	private settings: BlueMapMapSettings | null = null
	private capabilities: BlueMapCapabilities = {
		flat: false,
		perspective: false,
		freeFlight: false,
	}
	private assetsBaseUrl = ''
	private readonly listeners: {
		[K in keyof BlueMapEventPayloadMap]: Set<
			(payload: BlueMapEventPayloadMap[K]) => void
		>
	} = {
		ready: new Set(),
		modeChanged: new Set(),
		focusChanged: new Set(),
		viewChanged: new Set(),
		error: new Set(),
		destroy: new Set(),
	}

	constructor(runtimeFactory: BlueMapRuntimeFactory = defaultRuntimeFactory) {
		this.runtimeFactory = runtimeFactory
	}

	async mount(options: {
		container: HTMLElement
		assets: BlueMapAssetsSource
		mode?: BlueMapViewMode
		appendCacheBust?: boolean
		initialDistance?: number
		focus?: BlueMapFocus
		player?: BlueMapPlayerMarker | null
	}) {
		const mountGeneration = ++this.mountGeneration
		this.destroyRuntime()
		try {
			const loaded = await loadBlueMapSettings(options.assets)
			if (!this.isCurrentMount(mountGeneration)) return
			this.assetsBaseUrl = loaded.assetsBaseUrl
			this.settings = loaded.settings
			this.capabilities = getBlueMapCapabilities(loaded.settings)
			const mode = options.mode ?? 'perspective'
			if (!isBlueMapModeEnabled(this.capabilities, mode)) {
				throw new BlueMapRuntimeError(
					`BlueMap 当前地图未启用 ${mode} 模式。`,
					'MAP_MODE_UNAVAILABLE',
				)
			}

			const runtime = this.runtimeFactory.create()
			const runtimeOptions: BlueMapRuntimeMountOptions = {
				container: options.container,
				assetsBaseUrl: this.assetsBaseUrl,
				settings: loaded.settings,
				mode,
				appendCacheBust: options.appendCacheBust ?? false,
				initialDistance: options.initialDistance,
				initialFocus: options.focus,
				player: options.player,
				onViewChanged: (view) => this.emit('viewChanged', view),
			}
			await runtime.mount(runtimeOptions)
			if (!this.isCurrentMount(mountGeneration)) {
				runtime.destroy()
				return
			}
			this.runtime = runtime
			this.emit('ready', {
				assetsBaseUrl: this.assetsBaseUrl,
				settings: loaded.settings,
				capabilities: this.capabilities,
			})
		} catch (error) {
			if (!this.isCurrentMount(mountGeneration)) return
			this.emit('error', this.toErrorPayload(error))
			throw error
		}
	}

	async setMode(mode: BlueMapViewMode) {
		if (!isBlueMapModeEnabled(this.capabilities, mode)) {
			const error = new BlueMapRuntimeError(
				`BlueMap 当前地图未启用 ${mode} 模式。`,
				'MAP_MODE_UNAVAILABLE',
			)
			this.emit('error', this.toErrorPayload(error))
			throw error
		}
		if (!this.runtime) return
		try {
			await this.runtime.setMode(mode)
			this.emit('modeChanged', { mode })
		} catch (error) {
			this.emit('error', this.toErrorPayload(error))
			throw error
		}
	}

	async focus(focus: BlueMapFocus) {
		if (!this.runtime) return
		await this.runtime.focus(focus)
		this.emit('focusChanged', { focus })
	}

	cancelFocus() {
		this.runtime?.cancelFocus()
	}

	setPresence(player: BlueMapPlayerMarker | null) {
		this.runtime?.setPresence(player)
	}

	async alignNorth() {
		await this.runtime?.alignNorth()
	}

	async resetView() {
		await this.runtime?.resetView()
	}

	destroy() {
		this.mountGeneration++
		this.destroyRuntime()
		this.emit('destroy', {})
	}

	getSettings() {
		return this.settings
	}

	getCapabilities() {
		return this.capabilities
	}

	on<EventName extends keyof BlueMapEventPayloadMap>(
		eventName: EventName,
		handler: (payload: BlueMapEventPayloadMap[EventName]) => void,
	) {
		this.listeners[eventName].add(handler)
		return () => this.listeners[eventName].delete(handler)
	}

	private destroyRuntime() {
		this.runtime?.destroy()
		this.runtime = null
		this.settings = null
		this.assetsBaseUrl = ''
		this.capabilities = { flat: false, perspective: false, freeFlight: false }
	}

	private isCurrentMount(mountGeneration: number): boolean {
		return mountGeneration === this.mountGeneration
	}

	private emit<EventName extends keyof BlueMapEventPayloadMap>(
		eventName: EventName,
		payload: BlueMapEventPayloadMap[EventName],
	) {
		for (const listener of this.listeners[eventName]) listener(payload)
	}

	private toErrorPayload(error: unknown): BlueMapErrorEventPayload {
		if (error instanceof BlueMapAssetsError) {
			return { code: error.code, message: error.message, error }
		}
		if (error instanceof BlueMapRuntimeError) {
			return { code: error.code, message: error.message, error }
		}
		return {
			code: 'MAP_RENDER_FAILED',
			message:
				error instanceof Error ? error.message : 'BlueMap 地图渲染失败。',
			error,
		}
	}
}

export const createBlueMapController = (
	runtimeFactory?: BlueMapRuntimeFactory,
): BlueMapController => new BlueMapControllerImpl(runtimeFactory)
