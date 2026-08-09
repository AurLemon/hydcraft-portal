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
import type { IdleAnimation, NameTagObject, PlayerObject } from 'skinview3d'
import type { Material } from 'three'

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
	dot: {
		visible: boolean
		material: { opacity: number }
	}
	modelAnchor: {
		visible: boolean
		rotation: { y: number }
		scale: { setScalar(scale: number): void }
	}
	detailAnchor: {
		visible: boolean
		quaternion: { copy(quaternion: unknown): void }
	}
	directionArrow: {
		visible: boolean
		setDirection(direction: { x: number; y: number; z: number }): void
	}
	detailLabels: {
		coordinates: NameTagObject
		direction: NameTagObject
		playerId: NameTagObject
	}
	setDetailLabels(labels: {
		coordinates: string
		direction: string
		playerId: string
	}): void
	setDirection(yawRadians: number): void
	setPresentationOpacity(opacity: number): void
	playerModel: PlayerObject
	idleAnimation: IdleAnimation
	skinTexture: { dispose(): void } | null
	skinUrl: string | null
	skinReady: boolean
	skinLoadGeneration: number
	dispose(): void
}

interface ThreeLoadingManager {
	urlModifier?: (url: string) => string
	setURLModifier(transform: (url: string) => string): void
}

interface PlayerRenderMaterial extends Material {
	map?: unknown
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
	private static readonly PERSPECTIVE_MIN_DISTANCE = 35
	private static readonly MODE_TRANSITION_MS = 520
	private static readonly PLAYER_MODEL_HIDDEN_DISTANCE = 460
	private static readonly PLAYER_MODEL_SWITCH_DISTANCE = 360
	private static readonly PLAYER_MODEL_SCALE = 0.65
	private static readonly PLAYER_VIEW_MAX_ANGLE = Math.PI / 5
	private static readonly PLAYER_MARKER_HEIGHT_OFFSET = 8
	private static readonly PLAYER_DIRECTION_LENGTH = 18

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
		camera: { quaternion: unknown }
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
		followPlayerMarker?(marker: unknown): void
		stopFollowingPlayerMarker?(): void
		mouseZoom?: {
			deltaZoom: number
			reset(): void
		}
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
	private loadPlayerSkin:
		| ((marker: PlayerPresenceMarker, skinUrl: string) => void)
		| null = null
	private playerMarker: PlayerPresenceMarker | null = null
	private playerPresence: BlueMapPlayerMarker | null = null
	private followingPlayer = false
	private preservedTargetY: number | null = null
	private followRelease: {
		elapsed: number
		from: { x: number; y: number; z: number }
		desired: { x: number; y: number; z: number }
	} | null = null
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
					AmbientLight,
					ArrowHelper,
					Points,
					PointsMaterial,
					BufferGeometry,
					Float32BufferAttribute,
					CanvasTexture,
					DefaultLoadingManager,
					Group,
					LinearFilter,
					Mesh,
					NearestFilter,
					SRGBColorSpace,
					Vector3,
				},
				{ PlayerObject, IdleAnimation, NameTagObject },
				{ inferModelType, loadImage, loadSkinToCanvas },
				{ animate, EasingFunctions },
			] = await Promise.all([
				import('./blue-map-bridge'),
				import('../../../vendor/bluemap-webapp/v5.3/MapViewer.js'),
				import('../../../vendor/bluemap-webapp/v5.3/map/Map.js'),
				import('../../../vendor/bluemap-webapp/v5.3/controls/map/MapControls.js'),
				import('../../../vendor/bluemap-webapp/v5.3/controls/freeflight/FreeFlightControls.js'),
				import('three'),
				import('skinview3d'),
				import('skinview-utils'),
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
							distance?: number
						}
					}>
				).detail
				const controls = detail?.controlsManager
				if (!controls) return

				if (Number.isFinite(controls.distance)) {
					this.updatePlayerMarkerAppearance(controls.distance ?? 0)
				}
				if (!this.onViewChanged) return

				this.onViewChanged({
					rotation: Number.isFinite(controls.rotation)
						? (controls.rotation ?? 0)
						: 0,
					angle: Number.isFinite(controls.angle) ? (controls.angle ?? 0) : 0,
					tilt: Number.isFinite(controls.tilt) ? (controls.tilt ?? 0) : 0,
				})
			})
			events.addEventListener('bluemapRenderFrame', (event) => {
				const marker = this.playerMarker
				if (!marker?.modelAnchor.visible) return
				marker.detailAnchor.quaternion.copy(this.viewer?.camera.quaternion)
				const delta = (event as CustomEvent<{ delta?: number }>).detail?.delta
				if (!Number.isFinite(delta)) return
				marker.idleAnimation.update(marker.playerModel, (delta ?? 0) / 1000)
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
			const portalFontFamily =
				getComputedStyle(options.container).fontFamily || 'sans-serif'
			const labelTextureScale = Math.min(
				3,
				Math.max(2, Math.ceil(window.devicePixelRatio || 1)),
			)
			const createWorldLabel = (
				text: string,
				textStyle = '#ffffff',
				height = 3.2,
				compact = false,
			) => {
				const label = new NameTagObject(text || ' ', {
					font: `${compact ? 500 : 600} ${42 * labelTextureScale}px ${portalFontFamily}`,
					margin: (compact ? [0, 0, 0, 0] : [3, 5, 3, 5]).map(
						(value) => value * labelTextureScale,
					) as [number, number, number, number],
					textStyle,
					backgroundStyle: 'rgba(0, 0, 0, 0)',
					height,
				})
				label.material.depthTest = false
				label.material.depthWrite = false
				label.material.map!.colorSpace = SRGBColorSpace
				label.material.map!.magFilter = LinearFilter
				label.material.map!.minFilter = LinearFilter
				label.material.map!.needsUpdate = true
				label.renderOrder = 1000
				label.userData.labelText = text
				return label
			}
			const setWorldLabelPosition = (
				label: NameTagObject,
				x: number,
				y: number,
				z: number,
			) => {
				label.position.set(x, y, z)
			}
			const setWorldLabelVisible = (label: NameTagObject, visible: boolean) => {
				label.visible = visible
			}
			const setWorldLabelOpacity = (label: NameTagObject, opacity: number) => {
				label.material.opacity = opacity
			}
			const disposeWorldLabel = (label: NameTagObject) => {
				label.material.map?.dispose()
				label.material.dispose()
			}
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

				const root = new Group()
				root.add(point)
				const modelAnchor = new Group()
				modelAnchor.visible = false
				modelAnchor.position.y = -8
				const playerModel = new PlayerObject()
				playerModel.position.y = 16
				playerModel.cape.visible = false
				playerModel.elytra.visible = false
				playerModel.ears.visible = false
				modelAnchor.add(playerModel)
				root.add(modelAnchor)
				root.add(new AmbientLight(0xffffff, 1))

				const depthResetGeometry = new BufferGeometry()
				depthResetGeometry.setAttribute(
					'position',
					new Float32BufferAttribute([0, 0, 0], 3),
				)
				const depthResetMaterial = new PointsMaterial({
					size: 1,
					sizeAttenuation: false,
					depthTest: false,
					depthWrite: false,
				})
				depthResetMaterial.colorWrite = false
				const depthResetPoint = new Points(
					depthResetGeometry,
					depthResetMaterial,
				)
				depthResetPoint.frustumCulled = false
				depthResetPoint.renderOrder = 999
				depthResetPoint.onBeforeRender = (renderer) => renderer.clearDepth()
				modelAnchor.add(depthResetPoint)

				const modelGeometries = new Set<{ dispose(): void }>()
				const modelMaterialStates = new Map<
					PlayerRenderMaterial,
					{ opacity: number; transparent: boolean }
				>()
				const playerMeshes: InstanceType<typeof Mesh>[] = []
				playerModel.traverse((object) => {
					if (!(object instanceof Mesh)) return
					playerMeshes.push(object)
					modelGeometries.add(object.geometry)
				})
				for (const mesh of playerMeshes) {
					const sourceMaterials = (
						Array.isArray(mesh.material) ? mesh.material : [mesh.material]
					) as PlayerRenderMaterial[]
					for (const source of sourceMaterials) {
						if (!modelMaterialStates.has(source)) {
							modelMaterialStates.set(source, {
								opacity: source.opacity,
								transparent: source.transparent,
							})
						}
					}
					mesh.renderOrder = 1000
				}

				const createDirectionArrow = () => {
					const arrow = new ArrowHelper(
						new Vector3(0, 0, 1),
						new Vector3(0, -7.7, 0),
						OfficialBlueMapRuntime.PLAYER_DIRECTION_LENGTH,
						0x38bdf8,
						4,
						2,
					)
					arrow.visible = false
					arrow.line.renderOrder = 1000
					arrow.cone.renderOrder = 1000
					for (const material of [
						arrow.line.material,
						arrow.cone.material,
					].flat()) {
						material.depthTest = false
						material.depthWrite = false
						material.opacity = 0
						material.transparent = true
					}
					return arrow
				}
				const directionArrow = createDirectionArrow()
				root.add(directionArrow)

				const detailAnchor = new Group()
				detailAnchor.position.y = 8
				detailAnchor.visible = false
				const coordinateLabel = createWorldLabel(' ')
				setWorldLabelPosition(coordinateLabel, -18, 0, 0)
				const playerIdLabel = createWorldLabel(' ')
				setWorldLabelPosition(playerIdLabel, 18, 0, 0)
				detailAnchor.add(coordinateLabel, playerIdLabel)
				root.add(detailAnchor)

				const directionLabel = createWorldLabel(' ', '#bae6fd', 2.25, true)
				setWorldLabelPosition(directionLabel, 0, -7.55, 9)
				setWorldLabelVisible(directionLabel, false)
				root.add(directionLabel)

				const marker = root as unknown as PlayerPresenceMarker
				marker.dot = point
				marker.modelAnchor = modelAnchor
				marker.detailAnchor = detailAnchor
				marker.directionArrow = directionArrow
				marker.detailLabels = {
					coordinates: coordinateLabel,
					direction: directionLabel,
					playerId: playerIdLabel,
				}
				marker.setDetailLabels = (labels) => {
					const replaceLabel = (
						key: keyof PlayerPresenceMarker['detailLabels'],
						text: string,
						parent: typeof root,
						position: { x: number; y: number; z: number },
						textStyle = '#ffffff',
						height = 3.2,
						compact = false,
					) => {
						const current = marker.detailLabels[key]
						if (current.userData.labelText === text) return
						parent.remove(current)
						disposeWorldLabel(current)
						const next = createWorldLabel(text, textStyle, height, compact)
						setWorldLabelPosition(next, position.x, position.y, position.z)
						parent.add(next)
						marker.detailLabels[key] = next
					}

					replaceLabel('coordinates', labels.coordinates, detailAnchor, {
						x: -18,
						y: 0,
						z: 0,
					})
					replaceLabel('playerId', labels.playerId, detailAnchor, {
						x: 18,
						y: 0,
						z: 0,
					})
					replaceLabel(
						'direction',
						labels.direction,
						root,
						marker.detailLabels.direction.position,
						'#bae6fd',
						2.25,
						true,
					)
				}
				marker.setDirection = (yawRadians) => {
					const x = -Math.sin(yawRadians)
					const z = Math.cos(yawRadians)
					directionArrow.setDirection(new Vector3(x, 0, z))
					setWorldLabelPosition(
						marker.detailLabels.direction,
						x * (OfficialBlueMapRuntime.PLAYER_DIRECTION_LENGTH / 2),
						-7.55,
						z * (OfficialBlueMapRuntime.PLAYER_DIRECTION_LENGTH / 2),
					)
				}
				marker.setPresentationOpacity = (opacity) => {
					const visible = opacity > 0.001
					setWorldLabelVisible(marker.detailLabels.direction, visible)
					for (const [material, state] of modelMaterialStates) {
						material.opacity = state.opacity * opacity
						const transparent = state.transparent || opacity < 0.999
						if (material.transparent !== transparent) {
							material.transparent = transparent
							material.needsUpdate = true
						}
					}
					for (const label of Object.values(marker.detailLabels)) {
						setWorldLabelOpacity(label, opacity)
					}
					for (const material of [
						directionArrow.line.material,
						directionArrow.cone.material,
					].flat()) {
						material.opacity = opacity
					}
				}
				marker.playerModel = playerModel
				marker.idleAnimation = new IdleAnimation()
				marker.skinTexture = null
				marker.skinUrl = null
				marker.skinReady = false
				marker.skinLoadGeneration = 0
				marker.dispose = () => {
					marker.skinLoadGeneration += 1
					marker.skinTexture?.dispose()
					for (const label of Object.values(marker.detailLabels)) {
						disposeWorldLabel(label)
					}
					directionArrow.dispose()
					point.material.map?.dispose()
					point.material.dispose()
					point.geometry.dispose()
					depthResetMaterial.dispose()
					depthResetGeometry.dispose()
					for (const material of modelMaterialStates.keys()) material.dispose()
					for (const modelGeometry of modelGeometries) modelGeometry.dispose()
				}
				return marker
			}
			this.loadPlayerSkin = (marker, skinUrl) => {
				if (marker.skinUrl === skinUrl) return
				marker.skinUrl = skinUrl
				marker.skinReady = false
				marker.modelAnchor.visible = false
				marker.dot.visible = true
				marker.dot.material.opacity = 1
				const generation = ++marker.skinLoadGeneration

				void (async () => {
					try {
						const image = await loadImage(skinUrl)
						if (generation !== marker.skinLoadGeneration) return
						const skinCanvas = document.createElement('canvas')
						skinCanvas.width = 64
						skinCanvas.height = 64
						loadSkinToCanvas(skinCanvas, image)
						const texture = new CanvasTexture(skinCanvas)
						texture.magFilter = NearestFilter
						texture.minFilter = NearestFilter
						texture.colorSpace = SRGBColorSpace
						marker.skinTexture?.dispose()
						marker.skinTexture = texture
						marker.playerModel.skin.map = texture
						marker.playerModel.skin.modelType = inferModelType(skinCanvas)
						marker.skinReady = true
						this.updatePlayerMarkerAppearance()
					} catch {
						if (generation !== marker.skinLoadGeneration) return
						marker.skinReady = false
						marker.modelAnchor.visible = false
					}
				})()
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
			const mapControls = this.mapControls
			const nativeMapControlsUpdate = mapControls.update.bind(mapControls)
			mapControls.update = (delta, loadedMap) => {
				const release = this.followRelease
				if (release) {
					viewer.controlsManager.position.set(
						release.desired.x,
						release.desired.y,
						release.desired.z,
					)
				}
				nativeMapControlsUpdate(delta, loadedMap)
				if (this.followingPlayer && this.playerMarker) {
					viewer.controlsManager.position.y = this.playerMarker.position.y
				} else if (
					this.mode === 'perspective' &&
					this.preservedTargetY !== null
				) {
					viewer.controlsManager.position.y = this.preservedTargetY
				}
				if (release) {
					release.desired = {
						x: viewer.controlsManager.position.x,
						y: viewer.controlsManager.position.y,
						z: viewer.controlsManager.position.z,
					}
					release.elapsed += delta
					const progress = Math.min(1, release.elapsed / 260)
					const eased = 1 - Math.pow(1 - progress, 3)
					viewer.controlsManager.position.set(
						release.from.x + (release.desired.x - release.from.x) * eased,
						release.from.y + (release.desired.y - release.from.y) * eased,
						release.from.z + (release.desired.z - release.from.z) * eased,
					)
					if (progress >= 1) this.followRelease = null
				}
				if (this.mode === 'perspective') {
					const reachedMinDistance =
						viewer.controlsManager.distance <=
						OfficialBlueMapRuntime.PERSPECTIVE_MIN_DISTANCE
					const reachedMaxDistance =
						viewer.controlsManager.distance >= mapControls.maxDistance
					viewer.controlsManager.distance = Math.min(
						mapControls.maxDistance,
						Math.max(
							OfficialBlueMapRuntime.PERSPECTIVE_MIN_DISTANCE,
							viewer.controlsManager.distance,
						),
					)
					if (
						(reachedMinDistance &&
							(mapControls.mouseZoom?.deltaZoom ?? 0) < 0) ||
						(reachedMaxDistance && (mapControls.mouseZoom?.deltaZoom ?? 0) > 0)
					) {
						mapControls.mouseZoom?.reset()
					}
					if (this.playerPresence) {
						viewer.controlsManager.angle = Math.max(
							viewer.controlsManager.angle,
							this.getPlayerViewingMinAngle(viewer.controlsManager.distance),
						)
					}
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
			if (options.player) this.beginFollowingPlayer()
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
		this.focusTarget(focus, false)
	}

	focusPlayer(focus: BlueMapFocus) {
		this.focusTarget(focus, true)
	}

	private focusTarget(focus: BlueMapFocus, followPlayer: boolean) {
		const viewer = this.viewer
		const animate = this.animationScheduler
		const easing = this.easing
		this.stopFollowingPlayer()
		if (!viewer || !animate || !easing) {
			this.setCamera(focus)
			if (followPlayer) this.beginFollowingPlayer()
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
			if (followPlayer) this.beginFollowingPlayer()
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
				if (followPlayer) this.beginFollowingPlayer()
			},
		)
	}

	cancelFocus() {
		this.focusAnimation?.cancel()
		this.focusAnimation = null
		this.stopFollowingPlayer(true)
	}

	setPresence(player: BlueMapPlayerMarker | null) {
		this.playerPresence = player
		const viewer = this.viewer
		if (!viewer) return
		if (!player) {
			this.stopFollowingPlayer()
			this.playerAnimation?.cancel()
			this.playerAnimation = null
			if (this.playerMarker) {
				viewer.markers.remove(this.playerMarker)
				this.playerMarker.dispose()
			}
			this.playerMarker = null
			return
		}

		if (!this.playerMarker && this.createPlayerMarker) {
			this.playerMarker = this.createPlayerMarker()
			viewer.markers.add(this.playerMarker)
		}
		const marker = this.playerMarker
		if (!marker) return
		const yaw = Number.isFinite(player.yaw) ? (player.yaw ?? 0) : 0
		const yawRadians = (yaw * Math.PI) / 180
		marker.modelAnchor.rotation.y = -yawRadians
		marker.setDetailLabels({
			coordinates: player.detailLabels?.coordinates ?? '',
			direction: player.detailLabels?.direction ?? '',
			playerId: player.detailLabels?.playerId ?? player.label ?? '',
		})
		marker.setDirection(yawRadians)
		if (player.skinUrl) this.loadPlayerSkin?.(marker, player.skinUrl)
		this.updatePlayerMarkerAppearance()
		const savedY = Number.isFinite(player.y)
			? (player.y ?? 0)
			: this.getTerrainHeight(player.x, player.z)
		const target = {
			x: player.x,
			y: savedY + OfficialBlueMapRuntime.PLAYER_MARKER_HEIGHT_OFFSET,
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

	private updatePlayerMarkerAppearance(distance?: number) {
		const marker = this.playerMarker
		const cameraDistance = distance ?? this.viewer?.controlsManager.distance
		if (!marker || !Number.isFinite(cameraDistance)) return

		const modelOpacity = marker.skinReady
			? Math.max(
					0,
					Math.min(
						1,
						(OfficialBlueMapRuntime.PLAYER_MODEL_HIDDEN_DISTANCE -
							(cameraDistance ?? Number.POSITIVE_INFINITY)) /
							(OfficialBlueMapRuntime.PLAYER_MODEL_HIDDEN_DISTANCE -
								OfficialBlueMapRuntime.PLAYER_MODEL_SWITCH_DISTANCE),
					),
				)
			: 0
		const modelVisible = modelOpacity > 0.001
		marker.modelAnchor.visible = modelVisible
		marker.detailAnchor.visible = modelVisible
		marker.directionArrow.visible = modelVisible
		marker.setPresentationOpacity(modelOpacity)
		marker.dot.material.opacity = 1 - modelOpacity
		marker.dot.visible = marker.dot.material.opacity > 0.001
		if (!marker.modelAnchor.visible) return

		marker.modelAnchor.scale.setScalar(
			OfficialBlueMapRuntime.PLAYER_MODEL_SCALE,
		)
	}

	private getPlayerViewingMinAngle(distance: number) {
		const progress = Math.max(
			0,
			Math.min(
				1,
				(OfficialBlueMapRuntime.PLAYER_MODEL_HIDDEN_DISTANCE - distance) /
					(OfficialBlueMapRuntime.PLAYER_MODEL_HIDDEN_DISTANCE -
						OfficialBlueMapRuntime.PERSPECTIVE_MIN_DISTANCE),
			),
		)
		return progress * OfficialBlueMapRuntime.PLAYER_VIEW_MAX_ANGLE
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
		this.loadPlayerSkin = null
		this.playerMarker?.dispose()
		this.playerMarker = null
		this.playerPresence = null
		this.followingPlayer = false
		this.preservedTargetY = null
		this.followRelease = null
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

		const y = Number.isFinite(focus.y)
			? (focus.y ?? 0) + OfficialBlueMapRuntime.PLAYER_MARKER_HEIGHT_OFFSET
			: 0

		return { x: focus.x, y, z: focus.z, distance }
	}

	private beginFollowingPlayer() {
		if (!this.playerMarker) return
		this.followingPlayer = true
		this.preservedTargetY = null
		this.followRelease = null
		this.mapControls?.followPlayerMarker?.(this.playerMarker)
	}

	private stopFollowingPlayer(preserveTargetHeight = false) {
		this.followingPlayer = false
		if (
			preserveTargetHeight &&
			this.playerMarker &&
			this.mode === 'perspective' &&
			this.viewer
		) {
			const position = this.viewer.controlsManager.position
			this.preservedTargetY = position.y
			this.followRelease = {
				elapsed: 0,
				from: { x: position.x, y: position.y, z: position.z },
				desired: { x: position.x, y: position.y, z: position.z },
			}
		} else if (!preserveTargetHeight) {
			this.preservedTargetY = null
			this.followRelease = null
		}
		this.mapControls?.stopFollowingPlayerMarker?.()
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

	async focusPlayer(focus: BlueMapFocus) {
		if (!this.runtime) return
		await this.runtime.focusPlayer(focus)
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
