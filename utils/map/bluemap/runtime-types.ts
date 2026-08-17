import type { PlayerPresenceMarker } from './player-marker'
import type {
	BlueMapHomeAtmospherePostProcessing,
	BlueMapWorldPlayerMarker,
} from './types'

export interface BlueMapRuntimeKeyboardControl {
	start(...args: unknown[]): void
	reset?(): void
}

export interface NativeBlueMapWorldPlayerMarker {
	position: { x: number; y: number; z: number }
	visible: boolean
	element: HTMLElement
	playerHeadElement: HTMLImageElement
	playerNameElement: HTMLElement
	updateFromData(data: {
		uuid: string
		name: string
		foreign: boolean
		position: { x: number; y: number; z: number }
		rotation: { yaw: number; pitch: number; roll: number }
	}): void
	dispose(): void
}

export interface WorldPlayerMarkerEntry {
	definition: BlueMapWorldPlayerMarker
	marker: NativeBlueMapWorldPlayerMarker
	unbind: () => void
}

export interface BlueMapRuntimeViewer {
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
	camera: {
		quaternion: unknown
		far: number
		updateProjectionMatrix(): void
	}
	renderer: {
		debug: { checkShaderErrors: boolean }
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
	redraw(): void
}

export interface BlueMapRuntimeMap {
	data: { startPos: { x: number; z: number } }
	dispose(): void
	terrainHeightAt(x: number, z: number): number | boolean
}

export interface BlueMapRuntimeMapControls {
	stop?(): void
	reset?(): void
	followPlayerMarker?(marker: unknown): void
	stopFollowingPlayerMarker?(): void
	mouseZoom?: { deltaZoom: number; reset(): void }
	keyMove: BlueMapRuntimeKeyboardControl
	keyRotate: BlueMapRuntimeKeyboardControl
	keyAngle: BlueMapRuntimeKeyboardControl
	keyZoom: BlueMapRuntimeKeyboardControl
	minDistance: number
	maxDistance: number
	update(delta: number, map: unknown): void
	getMaxPerspectiveAngleForDistance?(distance: number): number
}

export interface BlueMapRuntimeFreeFlightControls {
	stop?(): void
}

export type BlueMapRuntimeAnimationScheduler = (
	animationFrame: (progress: number) => void,
	durationMs: number,
	postAnimation: (finished: boolean) => void,
) => { cancel(): void }

export interface BlueMapRuntimeEasing {
	easeInOutQuad(progress: number): number
}

export interface BlueMapRuntimePostProcessor {
	resize(): void
	invalidateWorldAnchors(): void
	setAtmosphereProgress(progress: number): void
	setOptions(options: BlueMapHomeAtmospherePostProcessing): void
	setRenderActive(active: boolean): void
	dispose(): void
}

export type BlueMapRuntimePlayerMarkerFactory = () => PlayerPresenceMarker
export type BlueMapRuntimePlayerSkinLoader = (
	marker: PlayerPresenceMarker,
	skinUrl: string,
) => void
export type BlueMapRuntimeWorldMarkerFactory = (
	definition: BlueMapWorldPlayerMarker,
) => NativeBlueMapWorldPlayerMarker

export interface BlueMapRuntimeFollowRelease {
	elapsed: number
	from: { x: number; y: number; z: number }
	desired: { x: number; y: number; z: number }
}
