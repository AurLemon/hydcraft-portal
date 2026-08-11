import { unregisterCacheBustFreeAssets } from './loading-manager'
import { BLUE_MAP_RUNTIME } from './runtime-constants'
import type { PlayerPresenceMarker } from './player-marker'
import type {
	BlueMapFocus,
	BlueMapPlayerMarker,
	BlueMapRuntime,
	BlueMapRuntimeMountOptions,
	BlueMapViewChangedEventPayload,
	BlueMapViewMode,
} from './types'

export abstract class OfficialBlueMapRuntimeBase implements BlueMapRuntime {
	protected viewer: {
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
	protected map: {
		data: { startPos: { x: number; z: number } }
		dispose(): void
		terrainHeightAt(x: number, z: number): number | boolean
	} | null = null
	protected mapControls: {
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
	protected freeFlightControls: { stop?(): void } | null = null
	protected container: HTMLElement | null = null
	protected mode: BlueMapViewMode = 'flat'
	protected viewAnimation: { cancel(): void } | null = null
	protected focusAnimation: { cancel(): void } | null = null
	protected playerAnimation: { cancel(): void } | null = null
	protected animationScheduler:
		| ((
				animationFrame: (progress: number) => void,
				durationMs: number,
				postAnimation: (finished: boolean) => void,
		  ) => { cancel(): void })
		| null = null
	protected easing: { easeInOutQuad(progress: number): number } | null = null
	protected createPlayerMarker: (() => PlayerPresenceMarker) | null = null
	protected loadPlayerSkin:
		| ((marker: PlayerPresenceMarker, skinUrl: string) => void)
		| null = null
	protected playerMarker: PlayerPresenceMarker | null = null
	protected playerPresence: BlueMapPlayerMarker | null = null
	protected followingPlayer = false
	protected preservedTargetY: number | null = null
	protected followRelease: {
		elapsed: number
		from: { x: number; y: number; z: number }
		desired: { x: number; y: number; z: number }
	} | null = null
	protected focusHeightOffset = BLUE_MAP_RUNTIME.PLAYER_MARKER_HEIGHT_OFFSET
	protected cacheBustFreeAssetsBaseUrl: string | null = null
	protected onViewChanged:
		| ((view: BlueMapViewChangedEventPayload) => void)
		| null = null

	abstract mount(options: BlueMapRuntimeMountOptions): Promise<void>

	resize() {
		this.viewer?.handleContainerResize()
	}

	setMode(
		mode: BlueMapViewMode,
		transitionMs: number = BLUE_MAP_RUNTIME.MODE_TRANSITION_MS,
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
				BLUE_MAP_RUNTIME.FLAT_VIEW_DISTANCE,
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
				BLUE_MAP_RUNTIME.PERSPECTIVE_MIN_DISTANCE,
				currentDistance,
			)
			if (this.mapControls) {
				this.mapControls.minDistance = BLUE_MAP_RUNTIME.PERSPECTIVE_MIN_DISTANCE
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
				BLUE_MAP_RUNTIME.HIRES_VIEW_DISTANCE,
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

	protected focusTarget(focus: BlueMapFocus, followPlayer: boolean) {
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
			this.mode === 'flat' ? 0 : BLUE_MAP_RUNTIME.HIRES_VIEW_DISTANCE,
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
			y: savedY + BLUE_MAP_RUNTIME.PLAYER_MARKER_HEIGHT_OFFSET,
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

	protected updatePlayerMarkerAppearance(distance?: number) {
		const marker = this.playerMarker
		const cameraDistance = distance ?? this.viewer?.controlsManager.distance
		if (!marker || !Number.isFinite(cameraDistance)) return

		const modelOpacity = marker.skinReady
			? Math.max(
					0,
					Math.min(
						1,
						(BLUE_MAP_RUNTIME.PLAYER_MODEL_HIDDEN_DISTANCE -
							(cameraDistance ?? Number.POSITIVE_INFINITY)) /
							(BLUE_MAP_RUNTIME.PLAYER_MODEL_HIDDEN_DISTANCE -
								BLUE_MAP_RUNTIME.PLAYER_MODEL_SWITCH_DISTANCE),
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

		marker.modelAnchor.scale.setScalar(BLUE_MAP_RUNTIME.PLAYER_MODEL_SCALE)
	}

	protected getPlayerViewingMinAngle(distance: number) {
		const progress = Math.max(
			0,
			Math.min(
				1,
				(BLUE_MAP_RUNTIME.PLAYER_MODEL_HIDDEN_DISTANCE - distance) /
					(BLUE_MAP_RUNTIME.PLAYER_MODEL_HIDDEN_DISTANCE -
						BLUE_MAP_RUNTIME.PERSPECTIVE_MIN_DISTANCE),
			),
		)
		return progress * BLUE_MAP_RUNTIME.PLAYER_VIEW_MAX_ANGLE
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
		this.focusHeightOffset = BLUE_MAP_RUNTIME.PLAYER_MARKER_HEIGHT_OFFSET
		this.onViewChanged = null
	}

	protected animateViewOrientation(target: {
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
			BLUE_MAP_RUNTIME.MODE_TRANSITION_MS,
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

	protected setCamera(focus: BlueMapFocus) {
		const viewer = this.viewer
		if (!viewer) return
		const controls = viewer.controlsManager
		const target = this.getCameraTarget(focus)
		controls.position.set(target.x, target.y, target.z)
		controls.distance = target.distance
		controls.updateCamera()
		this.updateLoadedMapArea()
	}

	protected getCameraTarget(focus: BlueMapFocus) {
		const controls = this.viewer?.controlsManager
		let distance = controls?.distance ?? 300
		if (typeof focus.zoom === 'number' && Number.isFinite(focus.zoom)) {
			distance = Math.min(100000, Math.max(5, 1500 / Math.pow(2, focus.zoom)))
		}
		if (this.mode === 'flat') {
			distance = Math.max(distance, BLUE_MAP_RUNTIME.FLAT_VIEW_DISTANCE)
		}

		const y = Number.isFinite(focus.y)
			? (focus.y ?? 0) + this.focusHeightOffset
			: 0

		return { x: focus.x, y, z: focus.z, distance }
	}

	protected beginFollowingPlayer() {
		if (!this.playerMarker) return
		this.followingPlayer = true
		this.preservedTargetY = null
		this.followRelease = null
		this.mapControls?.followPlayerMarker?.(this.playerMarker)
	}

	protected stopFollowingPlayer(preserveTargetHeight = false) {
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

	protected updateLoadedMapArea() {
		const viewer = this.viewer
		if (!viewer) return

		viewer.loadMapArea(
			viewer.controlsManager.position.x,
			viewer.controlsManager.position.z,
			this.mode === 'flat' ? 0 : BLUE_MAP_RUNTIME.HIRES_VIEW_DISTANCE,
			viewer.data.loadedLowresViewDistance,
		)
	}

	protected getTerrainHeight(x: number, z: number) {
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
