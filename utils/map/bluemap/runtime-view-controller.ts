import { BLUE_MAP_RUNTIME } from './runtime-constants'
import type {
	BlueMapRuntimeAnimationScheduler,
	BlueMapRuntimeEasing,
	BlueMapRuntimeFreeFlightControls,
	BlueMapRuntimeFollowRelease,
	BlueMapRuntimeMapControls,
	BlueMapRuntimePostProcessor,
	BlueMapRuntimeViewer,
} from './runtime-types'
import type {
	BlueMapFocus,
	BlueMapScrollViewOptions,
	BlueMapViewMode,
	BlueMapViewPreset,
} from './types'

interface ViewControllerDependencies {
	getViewer: () => BlueMapRuntimeViewer | null
	getMapControls: () => BlueMapRuntimeMapControls | null
	getFreeFlightControls: () => BlueMapRuntimeFreeFlightControls | null
	getAnimationScheduler: () => BlueMapRuntimeAnimationScheduler | null
	getEasing: () => BlueMapRuntimeEasing | null
	getMode: () => BlueMapViewMode
	setMode: (mode: BlueMapViewMode) => void
	getFocusHeightOffset: () => number
	getPlayerMarker: () => unknown
	getTerrainHeight: (x: number, z: number) => number
	getPostProcessor: () => BlueMapRuntimePostProcessor | null
	updateLoadedMapArea: () => void
}

export class BlueMapRuntimeViewController {
	private readonly dependencies: ViewControllerDependencies
	private viewAnimation: { cancel(): void } | null = null
	private focusAnimation: { cancel(): void } | null = null
	private scrollViewTarget: BlueMapViewPreset | null = null
	private scrollViewSmoothing = 0.2
	followingPlayer = false
	preservedTargetY: number | null = null
	followRelease: BlueMapRuntimeFollowRelease | null = null

	constructor(dependencies: ViewControllerDependencies) {
		this.dependencies = dependencies
	}

	setMode(
		mode: BlueMapViewMode,
		transitionMs: number = BLUE_MAP_RUNTIME.MODE_TRANSITION_MS,
	): void {
		const viewer = this.dependencies.getViewer()
		const animate = this.dependencies.getAnimationScheduler()
		const easing = this.dependencies.getEasing()
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
		const terrainHeight = this.dependencies.getTerrainHeight(
			controls.position.x,
			controls.position.z,
		)
		const target = { ...start }
		this.viewAnimation?.cancel()
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
			const targetDistance = Math.max(
				BLUE_MAP_RUNTIME.PERSPECTIVE_MIN_DISTANCE,
				currentDistance,
			)
			const mapControls = this.dependencies.getMapControls()
			if (mapControls)
				mapControls.minDistance = BLUE_MAP_RUNTIME.PERSPECTIVE_MIN_DISTANCE
			target.y = terrainHeight * Math.max(0, 1 - targetDistance / 500)
			target.distance = targetDistance
			target.ortho = 0
			target.tilt = 0
			const maxAngle =
				mapControls?.getMaxPerspectiveAngleForDistance?.(targetDistance) ??
				Math.PI / 2
			target.angle = Math.min(Math.PI / 2, start.angle, maxAngle)
		} else {
			const mapControls = this.dependencies.getMapControls()
			if (mapControls) mapControls.minDistance = 5
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
				this.dependencies.setMode(mode)
				this.dependencies.getMapControls()?.reset?.()
				controls.controls =
					mode === 'freeFlight'
						? this.dependencies.getFreeFlightControls()
						: this.dependencies.getMapControls()
				controls.updateCamera()
				this.dependencies.updateLoadedMapArea()
			},
		)
	}

	focus(focus: BlueMapFocus): void {
		this.focusTarget(focus, false)
	}

	focusPlayer(focus: BlueMapFocus): void {
		this.focusTarget(focus, true)
	}

	private focusTarget(focus: BlueMapFocus, followPlayer: boolean): void {
		const viewer = this.dependencies.getViewer()
		const animate = this.dependencies.getAnimationScheduler()
		const easing = this.dependencies.getEasing()
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
			this.dependencies.getMode() === 'flat'
				? 0
				: BLUE_MAP_RUNTIME.HIRES_VIEW_DISTANCE,
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
				this.dependencies.updateLoadedMapArea()
				if (followPlayer) this.beginFollowingPlayer()
			},
		)
	}

	cancelFocus(): void {
		this.focusAnimation?.cancel()
		this.focusAnimation = null
		this.stopFollowingPlayer(true)
	}

	alignNorth(): void {
		this.animateViewOrientation({ rotation: 0 })
	}

	resetView(): void {
		this.animateViewOrientation({ rotation: 0, angle: 0, tilt: 0 })
	}

	restoreView(target: BlueMapViewPreset): void {
		const viewer = this.dependencies.getViewer()
		const animate = this.dependencies.getAnimationScheduler()
		const easing = this.dependencies.getEasing()
		if (!viewer || !animate || !easing) return
		const controls = viewer.controlsManager
		const start: BlueMapViewPreset = {
			x: controls.position.x,
			y: controls.position.y,
			z: controls.position.z,
			distance: controls.distance,
			rotation: controls.rotation,
			angle: controls.angle,
			tilt: controls.tilt,
		}
		this.focusAnimation?.cancel()
		this.focusAnimation = null
		this.viewAnimation?.cancel()
		controls.controls = null
		viewer.loadMapArea(
			target.x,
			target.z,
			BLUE_MAP_RUNTIME.HIRES_VIEW_DISTANCE,
			viewer.data.loadedLowresViewDistance,
		)
		this.viewAnimation = animate(
			(progress) => {
				const eased = easing.easeInOutQuad(progress)
				controls.position.set(
					start.x + (target.x - start.x) * eased,
					start.y + (target.y - start.y) * eased,
					start.z + (target.z - start.z) * eased,
				)
				controls.distance =
					start.distance + (target.distance - start.distance) * eased
				controls.rotation =
					start.rotation + (target.rotation - start.rotation) * eased
				controls.angle = start.angle + (target.angle - start.angle) * eased
				controls.tilt = start.tilt + (target.tilt - start.tilt) * eased
				controls.updateCamera()
			},
			BLUE_MAP_RUNTIME.MODE_TRANSITION_MS,
			(finished) => {
				if (!finished) return
				this.viewAnimation = null
				controls.position.set(target.x, target.y, target.z)
				controls.distance = target.distance
				controls.rotation = target.rotation
				controls.angle = target.angle
				controls.tilt = target.tilt
				this.dependencies.getMapControls()?.reset?.()
				controls.controls =
					this.dependencies.getMode() === 'freeFlight'
						? this.dependencies.getFreeFlightControls()
						: this.dependencies.getMapControls()
				controls.updateCamera()
				this.dependencies.getPostProcessor()?.invalidateWorldAnchors()
				this.dependencies.updateLoadedMapArea()
			},
		)
	}

	setView(target: BlueMapViewPreset, options?: BlueMapScrollViewOptions): void {
		this.focusAnimation?.cancel()
		this.focusAnimation = null
		this.viewAnimation?.cancel()
		this.viewAnimation = null
		this.scrollViewTarget = { ...target }
		this.scrollViewSmoothing = Math.min(
			1,
			Math.max(0.01, options?.smoothing ?? 0.2),
		)
	}

	clearScrollDrivenView(): void {
		this.scrollViewTarget = null
		this.scrollViewSmoothing = 0.2
	}

	updateScrollDrivenView(delta: number): void {
		const viewer = this.dependencies.getViewer()
		const target = this.scrollViewTarget
		if (!viewer || !target) return
		const controls = viewer.controlsManager
		const frameRatio = Math.min(Math.max(delta / 16.666, 0), 4)
		const smoothing = 1 - Math.pow(1 - this.scrollViewSmoothing, frameRatio)
		controls.position.set(
			controls.position.x + (target.x - controls.position.x) * smoothing,
			controls.position.y + (target.y - controls.position.y) * smoothing,
			controls.position.z + (target.z - controls.position.z) * smoothing,
		)
		controls.distance += (target.distance - controls.distance) * smoothing
		controls.rotation += (target.rotation - controls.rotation) * smoothing
		controls.angle += (target.angle - controls.angle) * smoothing
		controls.tilt += (target.tilt - controls.tilt) * smoothing
		controls.updateCamera()
		this.dependencies.getPostProcessor()?.invalidateWorldAnchors()
	}

	setCamera(focus: BlueMapFocus): void {
		const viewer = this.dependencies.getViewer()
		if (!viewer) return
		const controls = viewer.controlsManager
		const target = this.getCameraTarget(focus)
		controls.position.set(target.x, target.y, target.z)
		controls.distance = target.distance
		controls.updateCamera()
		this.dependencies.updateLoadedMapArea()
	}

	private getCameraTarget(focus: BlueMapFocus) {
		const controls = this.dependencies.getViewer()?.controlsManager
		let distance = controls?.distance ?? 300
		if (typeof focus.zoom === 'number' && Number.isFinite(focus.zoom)) {
			distance = Math.min(100000, Math.max(5, 1500 / Math.pow(2, focus.zoom)))
		}
		if (this.dependencies.getMode() === 'flat') {
			distance = Math.max(distance, BLUE_MAP_RUNTIME.FLAT_VIEW_DISTANCE)
		}
		const y = Number.isFinite(focus.y)
			? (focus.y ?? 0) + this.dependencies.getFocusHeightOffset()
			: 0
		return { x: focus.x, y, z: focus.z, distance }
	}

	beginFollowingPlayer(): void {
		const marker = this.dependencies.getPlayerMarker()
		if (!marker) return
		this.followingPlayer = true
		this.preservedTargetY = null
		this.followRelease = null
		this.dependencies.getMapControls()?.followPlayerMarker?.(marker)
	}

	private animateViewOrientation(target: {
		rotation?: number
		angle?: number
		tilt?: number
	}): void {
		const viewer = this.dependencies.getViewer()
		const animate = this.dependencies.getAnimationScheduler()
		const easing = this.dependencies.getEasing()
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
				this.dependencies.getMapControls()?.reset?.()
				controls.controls =
					this.dependencies.getMode() === 'freeFlight'
						? this.dependencies.getFreeFlightControls()
						: this.dependencies.getMapControls()
				controls.updateCamera()
			},
		)
	}

	private stopFollowingPlayer(preserveTargetHeight = false): void {
		const marker = this.dependencies.getPlayerMarker() as {
			position: { x: number; y: number; z: number }
		} | null
		const viewer = this.dependencies.getViewer()
		this.followingPlayer = false
		if (
			preserveTargetHeight &&
			marker &&
			this.dependencies.getMode() === 'perspective' &&
			viewer
		) {
			const position = viewer.controlsManager.position
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
		this.dependencies.getMapControls()?.stopFollowingPlayerMarker?.()
	}

	getPlayerViewingMinAngle(distance: number): number {
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

	dispose(): void {
		this.viewAnimation?.cancel()
		this.focusAnimation?.cancel()
		this.viewAnimation = null
		this.focusAnimation = null
		this.dependencies.getMapControls()?.stop?.()
		this.dependencies.getFreeFlightControls()?.stop?.()
		this.followingPlayer = false
		this.preservedTargetY = null
		this.followRelease = null
		this.scrollViewTarget = null
	}
}
