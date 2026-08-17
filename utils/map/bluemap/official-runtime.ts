import {
	registerCacheBustFreeAssets,
	type ThreeLoadingManager,
} from './loading-manager'
import { createPlayerMarkerSupport } from './player-marker'
import { OfficialBlueMapRuntimeBase } from './runtime-base'
import type { NativeBlueMapWorldPlayerMarker } from './runtime-base'
import { BLUE_MAP_RUNTIME } from './runtime-constants'
import { BlueMapRuntimeError } from './runtime-error'
import { normalizeWebGlInfoLogs } from './webgl-compat'
import type { BlueMapRuntimeMountOptions } from './types'

const HOME_DEVELOPER_LOWRES_VIEW_DISTANCE = 2_000
const HOME_DEVELOPER_CAMERA_FAR = 1_000_000

/**
 * Thin adapter around the vendored BlueMap v5.3 rendering core. The official
 * webapp is a standalone Vue app, so Portal mounts only its MapViewer/Map and
 * controls while keeping Portal's own UI and event contract.
 */
export class OfficialBlueMapRuntime extends OfficialBlueMapRuntimeBase {
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
		this.onWorldPlayerMarkerClick = options.onWorldPlayerMarkerClick ?? null
		this.focusHeightOffset =
			options.focusHeightOffset ?? BLUE_MAP_RUNTIME.PLAYER_MARKER_HEIGHT_OFFSET
		try {
			const [
				,
				{ MapViewer },
				{ Map: BlueMapMap },
				{ MapControls },
				{ FreeFlightControls },
				three,
				skinview3d,
				skinviewUtils,
				{ animate, EasingFunctions },
				{ PlayerMarker: NativePlayerMarker },
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
				import('../../../vendor/bluemap-webapp/v5.3/markers/PlayerMarker.js'),
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
							position?: {
								x?: number
								y?: number
								z?: number
							}
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
					x: Number.isFinite(controls.position?.x)
						? (controls.position?.x ?? 0)
						: 0,
					y: Number.isFinite(controls.position?.y)
						? (controls.position?.y ?? 0)
						: 0,
					z: Number.isFinite(controls.position?.z)
						? (controls.position?.z ?? 0)
						: 0,
					distance: Number.isFinite(controls.distance)
						? (controls.distance ?? 0)
						: 0,
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
			const playerMarkerSupport = createPlayerMarkerSupport(
				three,
				skinview3d,
				skinviewUtils,
				{
					container: options.container,
					onSkinReady: () => this.updatePlayerMarkerAppearance(),
				},
			)
			this.createPlayerMarker = playerMarkerSupport.createPlayerMarker
			this.loadPlayerSkin = playerMarkerSupport.loadPlayerSkin
			this.createWorldPlayerMarker = (definition) => {
				const marker = new NativePlayerMarker(
					`portal-world-player-${encodeURIComponent(definition.id)}`,
					definition.playerId,
					'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
				) as unknown as NativeBlueMapWorldPlayerMarker
				marker.element.classList.add('home-world-player-marker')
				return marker
			}
			if (options.appendCacheBust === false) {
				this.cacheBustFreeAssetsBaseUrl = options.assetsBaseUrl.replace(
					/\/$/,
					'',
				)
				registerCacheBustFreeAssets(
					three.DefaultLoadingManager as ThreeLoadingManager,
					this.cacheBustFreeAssetsBaseUrl,
				)
			}
			const viewer = new MapViewer(options.container, events)
			const unrestrictedViewDistance = options.unrestrictedViewDistance === true
			if (unrestrictedViewDistance) {
				viewer.data.loadedLowresViewDistance =
					HOME_DEVELOPER_LOWRES_VIEW_DISTANCE
			}
			if (options.markerClicksOnly) {
				const markerLayer = (
					viewer as typeof viewer & {
						css2dRenderer?: { domElement?: HTMLElement }
					}
				).css2dRenderer?.domElement
				if (markerLayer) {
					markerLayer.style.pointerEvents = 'auto'
					markerLayer.addEventListener(
						'pointerdown',
						(event) => {
							if (
								(event.target as Element | null)?.closest(
									'.home-world-player-marker',
								)
							) {
								return
							}
							event.stopPropagation()
						},
						true,
					)
					markerLayer.addEventListener(
						'wheel',
						(event) => event.stopPropagation(),
						true,
					)
				}
				this.enableWorldPlayerMarkerHitTesting()
			}
			const map = new BlueMapMap(
				'portal-map',
				`${options.assetsBaseUrl.replace(/\/$/, '')}/`,
				() => Promise.resolve(),
				events,
			)
			this.viewer = viewer
			this.map = map
			if (options.postProcessing?.profile === 'homeAtmosphere') {
				const { createHomeAtmospherePostProcessor } =
					await import('./home-atmosphere-postprocessor')
				this.postProcessor = createHomeAtmospherePostProcessor(
					viewer as unknown as Parameters<
						typeof createHomeAtmospherePostProcessor
					>[0],
					options.postProcessing,
				)
			}
			this.mapControls = new MapControls(
				viewer.renderer.domElement,
				options.container,
			)
			const mapControls = this.mapControls
			if (options.keyboardControls === false) {
				for (const keyboardControl of [
					mapControls.keyMove,
					mapControls.keyRotate,
					mapControls.keyAngle,
					mapControls.keyZoom,
				]) {
					keyboardControl.start = () => undefined
					keyboardControl.reset?.()
				}
			}
			if (options.unrestrictedPerspectiveAngle) {
				// The homepage presents architecture at a fixed wide view, so it opts
				// out of BlueMap's distance-based right-drag perspective limit.
				mapControls.getMaxPerspectiveAngleForDistance = () => Math.PI / 2
			}
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
				if (unrestrictedViewDistance) {
					viewer.camera.far = HOME_DEVELOPER_CAMERA_FAR
					viewer.camera.updateProjectionMatrix()
				}
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
						BLUE_MAP_RUNTIME.PERSPECTIVE_MIN_DISTANCE
					const reachedMaxDistance =
						viewer.controlsManager.distance >= mapControls.maxDistance
					viewer.controlsManager.distance = Math.min(
						mapControls.maxDistance,
						Math.max(
							BLUE_MAP_RUNTIME.PERSPECTIVE_MIN_DISTANCE,
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
				this.updateScrollDrivenView(delta)
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
					requestedInitialDistance ?? BLUE_MAP_RUNTIME.FLAT_VIEW_DISTANCE,
					5,
				)
				controls.rotation = 0
				controls.angle = 0
				controls.tilt = 0
				controls.ortho = 1
				viewer.data.loadedHiresViewDistance = 0
			} else if (options.mode === 'perspective') {
				this.mapControls.minDistance = BLUE_MAP_RUNTIME.PERSPECTIVE_MIN_DISTANCE
				controls.distance = Math.max(
					requestedInitialDistance ??
						BLUE_MAP_RUNTIME.PERSPECTIVE_DEFAULT_DISTANCE,
					BLUE_MAP_RUNTIME.PERSPECTIVE_MIN_DISTANCE,
				)
				controls.ortho = 0
				controls.angle = 0
				viewer.data.loadedHiresViewDistance =
					BLUE_MAP_RUNTIME.HIRES_VIEW_DISTANCE
			} else {
				controls.distance = 0
				controls.ortho = 0
				controls.angle = Math.PI / 2
				controls.tilt = 0
				viewer.data.loadedHiresViewDistance =
					BLUE_MAP_RUNTIME.HIRES_VIEW_DISTANCE
			}
			const initialOrientation = options.initialOrientation
			if (initialOrientation?.rotation !== undefined) {
				controls.rotation = initialOrientation.rotation
			}
			if (initialOrientation?.angle !== undefined) {
				controls.angle = initialOrientation.angle
			}
			if (initialOrientation?.tilt !== undefined) {
				controls.tilt = initialOrientation.tilt
			}
			controls.controls =
				options.mode === 'freeFlight'
					? this.freeFlightControls
					: this.mapControls
			controls.updateCamera()
			await viewer.switchMap(map)
			const voidFillColor =
				options.postProcessing?.profile === 'homeAtmosphere'
					? options.postProcessing.water?.voidFillColor
					: undefined
			if (voidFillColor) {
				map.data.voidColor.setRGB(...voidFillColor)
				viewer.data.uniforms.voidColor.value = map.data.voidColor
			}
			this.setCamera(initialFocus)
			await this.setMode(options.mode, 0)
			this.setPresence(options.player ?? null)
			this.setWorldPlayerMarkers(options.worldPlayerMarkers ?? [])
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
}
