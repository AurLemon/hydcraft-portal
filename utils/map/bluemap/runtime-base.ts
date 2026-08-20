import { unregisterCacheBustFreeAssets } from './loading-manager'
import { BlueMapRuntimeMarkerManager } from './runtime-marker-manager'
import { BLUE_MAP_RUNTIME } from './runtime-constants'
import { BlueMapRuntimeViewController } from './runtime-view-controller'
import type {
	BlueMapRuntimeAnimationScheduler,
	BlueMapRuntimeEasing,
	BlueMapRuntimeFollowRelease,
	BlueMapRuntimeMap,
	BlueMapRuntimeMapControls,
	BlueMapRuntimePostProcessor,
	BlueMapRuntimeViewer,
	BlueMapRuntimeFreeFlightControls,
	BlueMapRuntimePlayerMarkerFactory,
	BlueMapRuntimePlayerSkinLoader,
	BlueMapRuntimeWorldMarkerFactory,
	NativeBlueMapWorldPlayerMarker,
} from './runtime-types'
import type { PlayerPresenceMarker } from './player-marker'
import type {
	BlueMapFocus,
	BlueMapHomeAtmospherePostProcessing,
	BlueMapPlayerMarker,
	BlueMapRuntime,
	BlueMapRuntimeMountOptions,
	BlueMapScrollViewOptions,
	BlueMapViewChangedEventPayload,
	BlueMapViewMode,
	BlueMapViewPreset,
	BlueMapWorldPlayerMarker,
	BlueMapWorldPlayerMarkerClickEventPayload,
} from './types'

interface BlueMapRenderLoopController {
	renderLoop(now: number): void
	lastFrame: number
}

export type { NativeBlueMapWorldPlayerMarker }

/**
 * Shared lifecycle shell for the official BlueMap adapter. Marker and camera
 * state live in focused collaborators so the adapter remains an API boundary.
 */
export abstract class OfficialBlueMapRuntimeBase implements BlueMapRuntime {
	protected viewer: BlueMapRuntimeViewer | null = null
	protected map: BlueMapRuntimeMap | null = null
	protected mapControls: BlueMapRuntimeMapControls | null = null
	protected freeFlightControls: BlueMapRuntimeFreeFlightControls | null = null
	protected container: HTMLElement | null = null
	protected mode: BlueMapViewMode = 'flat'
	protected animationScheduler: BlueMapRuntimeAnimationScheduler | null = null
	protected easing: BlueMapRuntimeEasing | null = null
	protected focusHeightOffset: number =
		BLUE_MAP_RUNTIME.PLAYER_MARKER_HEIGHT_OFFSET
	protected postProcessor: BlueMapRuntimePostProcessor | null = null
	protected cacheBustFreeAssetsBaseUrl: string | null = null
	private renderLoopGate: {
		setActive(active: boolean): void
		dispose(): void
	} | null = null
	protected onViewChanged:
		| ((view: BlueMapViewChangedEventPayload) => void)
		| null = null
	private _createPlayerMarker: BlueMapRuntimePlayerMarkerFactory | null = null
	private _loadPlayerSkin: BlueMapRuntimePlayerSkinLoader | null = null
	private _createWorldPlayerMarker: BlueMapRuntimeWorldMarkerFactory | null =
		null
	private _onWorldPlayerMarkerClick:
		| ((payload: BlueMapWorldPlayerMarkerClickEventPayload) => void)
		| null = null
	protected readonly markerManager: BlueMapRuntimeMarkerManager
	protected readonly viewController: BlueMapRuntimeViewController

	constructor() {
		this.markerManager = new BlueMapRuntimeMarkerManager({
			getViewer: () => this.viewer,
			getContainer: () => this.container,
			getMapControls: () => this.mapControls,
			getMode: () => this.mode,
			getTerrainHeight: (x, z) => this.getTerrainHeight(x, z),
			getAnimationScheduler: () => this.animationScheduler,
			getEasing: () => this.easing,
		})
		this.viewController = new BlueMapRuntimeViewController({
			getViewer: () => this.viewer,
			getMapControls: () => this.mapControls,
			getFreeFlightControls: () => this.freeFlightControls,
			getAnimationScheduler: () => this.animationScheduler,
			getEasing: () => this.easing,
			getMode: () => this.mode,
			setMode: (mode) => {
				this.mode = mode
			},
			getFocusHeightOffset: () => this.focusHeightOffset,
			getPlayerMarker: () => this.playerMarker,
			getTerrainHeight: (x, z) => this.getTerrainHeight(x, z),
			getPostProcessor: () => this.postProcessor,
			updateLoadedMapArea: () => this.updateLoadedMapArea(),
		})
	}

	protected get createPlayerMarker(): BlueMapRuntimePlayerMarkerFactory | null {
		return this._createPlayerMarker
	}
	protected set createPlayerMarker(
		factory: BlueMapRuntimePlayerMarkerFactory | null,
	) {
		this._createPlayerMarker = factory
		this.markerManager.setPlayerMarkerFactory(factory)
	}
	protected get loadPlayerSkin(): BlueMapRuntimePlayerSkinLoader | null {
		return this._loadPlayerSkin
	}
	protected set loadPlayerSkin(loader: BlueMapRuntimePlayerSkinLoader | null) {
		this._loadPlayerSkin = loader
		this.markerManager.setPlayerSkinLoader(loader)
	}
	protected get createWorldPlayerMarker(): BlueMapRuntimeWorldMarkerFactory | null {
		return this._createWorldPlayerMarker
	}
	protected set createWorldPlayerMarker(
		factory: BlueMapRuntimeWorldMarkerFactory | null,
	) {
		this._createWorldPlayerMarker = factory
		this.markerManager.setWorldPlayerMarkerFactory(factory)
	}
	protected get playerMarker(): PlayerPresenceMarker | null {
		return this.markerManager.playerMarker
	}
	protected get playerPresence(): BlueMapPlayerMarker | null {
		return this.markerManager.playerPresence
	}
	protected get onWorldPlayerMarkerClick():
		| ((payload: BlueMapWorldPlayerMarkerClickEventPayload) => void)
		| null {
		return this._onWorldPlayerMarkerClick
	}
	protected set onWorldPlayerMarkerClick(
		handler:
			| ((payload: BlueMapWorldPlayerMarkerClickEventPayload) => void)
			| null,
	) {
		this._onWorldPlayerMarkerClick = handler
		this.markerManager.setWorldPlayerMarkerClickHandler(handler)
	}
	protected get followingPlayer(): boolean {
		return this.viewController.followingPlayer
	}
	protected get preservedTargetY(): number | null {
		return this.viewController.preservedTargetY
	}
	protected set preservedTargetY(value: number | null) {
		this.viewController.preservedTargetY = value
	}
	protected get followRelease(): BlueMapRuntimeFollowRelease | null {
		return this.viewController.followRelease
	}
	protected set followRelease(value: BlueMapRuntimeFollowRelease | null) {
		this.viewController.followRelease = value
	}

	abstract mount(options: BlueMapRuntimeMountOptions): Promise<void>

	resize(): void {
		this.viewer?.handleContainerResize()
		this.postProcessor?.resize()
	}

	setHomeAtmosphereProgress(progress: number): void {
		this.postProcessor?.setAtmosphereProgress(progress)
	}

	setHomeAtmosphereOptions(options: BlueMapHomeAtmospherePostProcessing): void {
		this.postProcessor?.setOptions(options)
	}

	setRenderActive(active: boolean): void {
		this.postProcessor?.setRenderActive(active)
		const viewer = this.viewer
		if (!viewer) return
		this.renderLoopGate?.setActive(active)
		if (active) viewer.redraw()
	}

	protected installRenderLoopGate(): void {
		const viewer = this.viewer
		if (!viewer || this.renderLoopGate) return

		const controlledViewer = viewer as BlueMapRuntimeViewer &
			BlueMapRenderLoopController
		const nativeRenderLoop = controlledViewer.renderLoop
		let active = true
		let lastTimestamp = Number.NEGATIVE_INFINITY
		const controlledRenderLoop = (now: number): void => {
			if (now === lastTimestamp) return
			lastTimestamp = now
			if (!active) return
			nativeRenderLoop(now)
		}
		controlledViewer.renderLoop = controlledRenderLoop
		this.renderLoopGate = {
			setActive: (nextActive) => {
				if (active === nextActive) return
				active = nextActive
				if (!active) return
				controlledViewer.lastFrame = 0
				window.requestAnimationFrame(controlledRenderLoop)
			},
			dispose: () => {
				active = false
				controlledViewer.renderLoop = nativeRenderLoop
			},
		}
	}

	setMode(
		mode: BlueMapViewMode,
		transitionMs: number = BLUE_MAP_RUNTIME.MODE_TRANSITION_MS,
	): void {
		this.viewController.setMode(mode, transitionMs)
	}
	focus(focus: BlueMapFocus): void {
		this.viewController.focus(focus)
	}
	focusPlayer(focus: BlueMapFocus): void {
		this.viewController.focusPlayer(focus)
	}
	cancelFocus(): void {
		this.viewController.cancelFocus()
	}
	setPresence(player: BlueMapPlayerMarker | null): void {
		this.markerManager.setPresence(player)
	}
	setWorldPlayerMarkers(markers: readonly BlueMapWorldPlayerMarker[]): void {
		this.markerManager.setWorldPlayerMarkers(markers)
	}
	enableWorldPlayerMarkerHitTesting(): void {
		this.markerManager.enableWorldPlayerMarkerHitTesting()
	}
	updatePlayerMarkerAppearance(distance?: number): void {
		this.markerManager.updatePlayerMarkerAppearance(distance)
	}
	getPlayerViewingMinAngle(distance: number): number {
		return this.markerManager.getPlayerViewingMinAngle(distance)
	}
	protected setCamera(focus: BlueMapFocus): void {
		this.viewController.setCamera(focus)
	}
	protected beginFollowingPlayer(): void {
		this.viewController.beginFollowingPlayer()
	}
	alignNorth(): void {
		this.viewController.alignNorth()
	}
	resetView(): void {
		this.viewController.resetView()
	}
	restoreView(view: BlueMapViewPreset): void {
		this.viewController.restoreView(view)
	}
	setView(view: BlueMapViewPreset, options?: BlueMapScrollViewOptions): void {
		this.viewController.setView(view, options)
	}
	clearScrollDrivenView(): void {
		this.viewController.clearScrollDrivenView()
	}
	updateScrollDrivenView(delta: number): void {
		this.viewController.updateScrollDrivenView(delta)
	}

	protected updateLoadedMapArea(): void {
		const viewer = this.viewer
		if (!viewer) return
		viewer.loadMapArea(
			viewer.controlsManager.position.x,
			viewer.controlsManager.position.z,
			this.mode === 'flat' ? 0 : BLUE_MAP_RUNTIME.HIRES_VIEW_DISTANCE,
			viewer.data.loadedLowresViewDistance,
		)
	}

	destroy(): void {
		this.markerManager.dispose()
		this.renderLoopGate?.dispose()
		this.renderLoopGate = null
		this.postProcessor?.dispose()
		this.postProcessor = null
		unregisterCacheBustFreeAssets(this.cacheBustFreeAssetsBaseUrl)
		this.cacheBustFreeAssetsBaseUrl = null
		this.viewController.dispose()
		const viewer = this.viewer
		this.map?.dispose()
		if (viewer) {
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
		this.createWorldPlayerMarker = null
		this.onWorldPlayerMarkerClick = null
		this.focusHeightOffset = BLUE_MAP_RUNTIME.PLAYER_MARKER_HEIGHT_OFFSET
		this.onViewChanged = null
	}

	protected getTerrainHeight(x: number, z: number): number {
		try {
			const terrainHeight = this.map?.terrainHeightAt(x, z)
			if (typeof terrainHeight === 'number' && Number.isFinite(terrainHeight)) {
				return terrainHeight + 3
			}
		} catch {
			// Hires tiles may not have arrived yet; controls refine the height later.
		}
		return 3
	}
}
