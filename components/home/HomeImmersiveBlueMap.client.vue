<template>
	<div
		class="relative h-full w-full overflow-hidden bg-slate-950"
		:class="developerControlsActive ? 'cursor-grab active:cursor-grabbing' : ''"
		:data-home-map-status="status"
	>
		<div ref="containerRef" class="h-full w-full" />

		<div
			v-if="status === 'loading'"
			class="pointer-events-none absolute inset-0 bg-slate-950/40"
		>
			<USkeleton class="h-full w-full rounded-none" />
		</div>
		<div
			v-else-if="status === 'error'"
			class="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/75 p-6 text-center text-sm text-white/70"
		>
			{{ t('home.immersive.mapUnavailable') }}
		</div>
	</div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { HomeStoryLayout } from '~/composables/home/useHomeStoryProgress'
import {
	createBlueMapController,
	type BlueMapFocus,
	type BlueMapViewChangedEventPayload,
	type BlueMapWorldPlayerMarker,
	type BlueMapWorldPlayerMarkerClickEventPayload,
} from '~/utils/map'
import { createHomeImmersiveAtmosphereOptions } from '~/utils/home/immersive-atmosphere'
import type {
	HomeImmersiveMapPosition,
	HomeImmersiveSceneCamera,
	HomeImmersiveSceneLighting,
	HomeImmersiveSceneWater,
} from '~/utils/home/immersive-scenes'

interface HomeImmersiveBlueMapProps {
	assetsBaseUrl: string
	camera: HomeImmersiveSceneCamera
	overviewCamera: HomeImmersiveSceneCamera
	mobileOverviewCamera: HomeImmersiveSceneCamera
	outroCamera: HomeImmersiveSceneCamera
	mobileOutroCamera: HomeImmersiveSceneCamera
	storyLayout: HomeStoryLayout
	lighting: HomeImmersiveSceneLighting
	water?: HomeImmersiveSceneWater
	focusPositions: readonly HomeImmersiveMapPosition[]
	communityFocusPosition?: HomeImmersiveMapPosition | null
	playerDetailFocusPosition?: HomeImmersiveMapPosition | null
	renderActive?: boolean
	worldPlayerMarkers?: readonly BlueMapWorldPlayerMarker[]
	markerClicksOnly?: boolean
	developerControlsEnabled?: boolean
	developerControlsActive?: boolean
}

const props = defineProps<HomeImmersiveBlueMapProps>()
const emit = defineEmits<{
	ready: []
	error: []
	'context-lost': []
	'context-restored': []
	'scene-camera-settled': []
	'world-player-marker-click': [
		payload: BlueMapWorldPlayerMarkerClickEventPayload,
	]
}>()
const { t } = useI18n()
const containerRef = ref<HTMLElement | null>(null)
const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const controller = createBlueMapController()
let resizeObserver: ResizeObserver | null = null
let resizeAnimationFrame: number | null = null
let viewportMediaQuery: MediaQueryList | null = null
let reapplyScrollViewAfterResize = false
let unbindReady: (() => void) | null = null
let unbindError: (() => void) | null = null
let unbindWorldPlayerMarkerClick: (() => void) | null = null
let unbindViewChanged: (() => void) | null = null
let scrollProgress = 0
let sceneCameraTransitionPending = false
let sceneCameraTransitionTarget: HomeImmersiveSceneCamera | null = null
let webGlContextLost = false

const handleWebGlContextLost = (event: Event): void => {
	event.preventDefault()
	if (webGlContextLost) return
	webGlContextLost = true
	controller.setRenderActive(false)
	status.value = 'error'
	emit('context-lost')
}

const handleWebGlContextRestored = (): void => {
	if (!webGlContextLost) return
	webGlContextLost = false
	status.value = 'ready'
	controller.setRenderActive(props.renderActive !== false)
	applyScrollProgress(scrollProgress)
	resize()
	emit('context-restored')
}

const SCENE_CAMERA_TRANSITION_SMOOTHING = 0.04
const SCENE_CAMERA_POSITION_EPSILON = 1
const SCENE_CAMERA_ORIENTATION_EPSILON = 0.001
const MOBILE_PLAYER_DETAIL_SCREEN_OFFSET = 2400
const DETAIL_CAMERA_SMOOTHING = 0.04

const handleViewChanged = (view: BlueMapViewChangedEventPayload): void => {
	const target = sceneCameraTransitionTarget
	if (!target) return

	const positionDistance = Math.hypot(
		view.x - target.x,
		view.y - target.y,
		view.z - target.z,
	)
	const orientationDistance = Math.max(
		Math.abs(view.rotation - target.rotation),
		Math.abs(view.angle - target.angle),
		Math.abs(view.tilt - target.tilt),
	)
	if (
		positionDistance > SCENE_CAMERA_POSITION_EPSILON ||
		Math.abs(view.distance - target.distance) > SCENE_CAMERA_POSITION_EPSILON ||
		orientationDistance > SCENE_CAMERA_ORIENTATION_EPSILON
	) {
		return
	}

	sceneCameraTransitionTarget = null
	emit('scene-camera-settled')
}

const interpolate = (start: number, end: number, progress: number): number =>
	start + (end - start) * progress

const smoothStep = (start: number, end: number, value: number): number => {
	const progress = Math.min(Math.max((value - start) / (end - start), 0), 1)
	return progress * progress * (3 - 2 * progress)
}

const interpolateCamera = (
	start: HomeImmersiveSceneCamera,
	end: HomeImmersiveSceneCamera,
	progress: number,
): HomeImmersiveSceneCamera => ({
	x: interpolate(start.x, end.x, progress),
	y: interpolate(start.y, end.y, progress),
	z: interpolate(start.z, end.z, progress),
	distance: start.distance * Math.pow(end.distance / start.distance, progress),
	rotation: interpolate(start.rotation, end.rotation, progress),
	angle: interpolate(start.angle, end.angle, progress),
	tilt: interpolate(start.tilt, end.tilt, progress),
})

const focusCamera = (
	position: HomeImmersiveMapPosition,
	overview: HomeImmersiveSceneCamera,
): HomeImmersiveSceneCamera => ({
	x: position.x,
	y: position.y,
	z: position.z,
	distance: Math.min(7200, Math.max(4200, overview.distance * 0.24)),
	rotation: overview.rotation,
	angle: overview.angle,
	tilt: overview.tilt,
})

const detailFocusCamera = (
	position: HomeImmersiveMapPosition,
	overview: HomeImmersiveSceneCamera,
	mobile: boolean,
): HomeImmersiveSceneCamera => {
	const camera: HomeImmersiveSceneCamera = {
		x: position.x,
		y: position.y,
		z: position.z,
		distance: Math.min(11000, Math.max(5200, overview.distance * 0.42)),
		rotation: overview.rotation + 0.1,
		angle: overview.angle,
		tilt: overview.tilt,
	}
	if (!mobile) return camera

	const horizontalX = Math.sin(camera.rotation)
	const horizontalZ = -Math.cos(camera.rotation)

	return {
		...camera,
		// Shift the target along the camera's screen-down axis, not just world Y.
		x:
			position.x -
			horizontalX * Math.cos(camera.angle) * MOBILE_PLAYER_DETAIL_SCREEN_OFFSET,
		y: position.y - Math.sin(camera.angle) * MOBILE_PLAYER_DETAIL_SCREEN_OFFSET,
		z:
			position.z -
			horizontalZ * Math.cos(camera.angle) * MOBILE_PLAYER_DETAIL_SCREEN_OFFSET,
		distance: camera.distance,
	}
}

const applyScrollProgress = (progress: number): void => {
	scrollProgress = Math.min(Math.max(progress, 0), 1)
	if (props.developerControlsActive) {
		controller.clearScrollDrivenView()
		controller.setHomeAtmosphereProgress(
			smoothStep(
				props.storyLayout.heroExitStart,
				props.storyLayout.atmosphereProgressEnd,
				scrollProgress,
			),
		)
		return
	}
	const overview = viewportMediaQuery?.matches
		? props.mobileOverviewCamera
		: props.overviewCamera
	const outroCamera = viewportMediaQuery?.matches
		? props.mobileOutroCamera
		: props.outroCamera
	const focusEnd = props.storyLayout.focusProgressEnd
	const overviewEnd = Math.min(
		focusEnd + props.storyLayout.overviewTransitionSpan,
		0.94,
	)
	let targetCamera = props.camera

	if (
		props.playerDetailFocusPosition &&
		viewportMediaQuery?.matches &&
		scrollProgress >= props.storyLayout.playerEntryProgressEnd &&
		scrollProgress < props.storyLayout.communityProgressEnd
	) {
		targetCamera = detailFocusCamera(
			props.playerDetailFocusPosition,
			overview,
			true,
		)
	} else if (
		scrollProgress >= props.storyLayout.heroExitStart &&
		scrollProgress < focusEnd &&
		props.focusPositions.length
	) {
		const segment =
			props.storyLayout.playerSegments.find(
				(candidate) => scrollProgress <= candidate.dwellEnd,
			) ?? props.storyLayout.playerSegments.at(-1)
		const segmentIndex = Math.min(
			segment?.index ?? 0,
			props.focusPositions.length - 1,
		)
		const currentPosition = props.focusPositions[segmentIndex]!
		const previousPosition = props.focusPositions[segmentIndex - 1]
		const previousCamera = previousPosition
			? focusCamera(previousPosition, overview)
			: props.camera
		targetCamera = interpolateCamera(
			previousCamera,
			focusCamera(currentPosition, overview),
			smoothStep(
				segment?.index === 0
					? props.storyLayout.heroExitStart
					: (segment?.transitionStart ?? props.storyLayout.heroProgressEnd),
				segment?.focusStart ?? props.storyLayout.playerEntryProgressEnd,
				scrollProgress,
			),
		)
	} else if (scrollProgress >= focusEnd && scrollProgress < overviewEnd) {
		const departureCamera = props.focusPositions.length
			? focusCamera(props.focusPositions.at(-1)!, overview)
			: props.camera
		targetCamera = interpolateCamera(
			departureCamera,
			overview,
			smoothStep(focusEnd, overviewEnd, scrollProgress),
		)
	} else if (
		props.communityFocusPosition &&
		scrollProgress >= overviewEnd &&
		scrollProgress < props.storyLayout.outroProgressStart
	) {
		targetCamera = detailFocusCamera(
			props.communityFocusPosition,
			overview,
			viewportMediaQuery?.matches === true,
		)
	} else if (
		scrollProgress >= props.storyLayout.communityProgressEnd &&
		scrollProgress < props.storyLayout.outroProgressStart
	) {
		targetCamera = interpolateCamera(
			overview,
			outroCamera,
			smoothStep(
				props.storyLayout.communityProgressEnd,
				props.storyLayout.outroProgressStart,
				scrollProgress,
			),
		)
	} else if (scrollProgress >= props.storyLayout.outroProgressStart) {
		targetCamera = outroCamera
	} else if (scrollProgress >= overviewEnd) {
		targetCamera = overview
	}

	controller.setView(targetCamera, {
		smoothing:
			(props.playerDetailFocusPosition && viewportMediaQuery?.matches) ||
			props.communityFocusPosition
				? DETAIL_CAMERA_SMOOTHING
				: sceneCameraTransitionPending
					? SCENE_CAMERA_TRANSITION_SMOOTHING
					: undefined,
	})
	if (sceneCameraTransitionPending) {
		sceneCameraTransitionTarget = { ...targetCamera }
	}
	sceneCameraTransitionPending = false
	controller.setHomeAtmosphereProgress(
		smoothStep(
			props.storyLayout.heroExitStart,
			props.storyLayout.atmosphereProgressEnd,
			scrollProgress,
		),
	)
}

defineExpose({ setScrollProgress: applyScrollProgress })

watch(
	() => props.focusPositions,
	() => {
		if (status.value === 'ready') applyScrollProgress(scrollProgress)
	},
	{ deep: true },
)

watch(
	() => props.communityFocusPosition,
	() => {
		if (status.value === 'ready') applyScrollProgress(scrollProgress)
	},
	{ deep: true },
)

watch(
	() => props.playerDetailFocusPosition,
	() => {
		if (status.value === 'ready') applyScrollProgress(scrollProgress)
	},
	{ deep: true },
)

watch(
	() => props.camera,
	() => {
		sceneCameraTransitionPending = true
		if (status.value === 'ready') applyScrollProgress(scrollProgress)
	},
)

watch(
	[() => props.lighting, () => props.water],
	() =>
		controller.setHomeAtmosphereOptions(
			createHomeImmersiveAtmosphereOptions(props.lighting, props.water),
		),
	{ deep: true },
)

watch(
	() => props.renderActive,
	(active) => controller.setRenderActive(active !== false),
	{ immediate: true },
)

watch(
	() => props.worldPlayerMarkers,
	(markers) => controller.setWorldPlayerMarkers(markers ?? []),
	{ deep: true },
)

watch(
	() => props.developerControlsActive,
	() => {
		if (status.value === 'ready') applyScrollProgress(scrollProgress)
	},
)

const focus = (): BlueMapFocus => ({
	x: props.camera.x,
	y: props.camera.y,
	z: props.camera.z,
})

const resolveAssetsBaseUrl = (): string =>
	new URL(props.assetsBaseUrl, window.location.origin).toString()

const resize = () => {
	if (resizeAnimationFrame !== null) {
		cancelAnimationFrame(resizeAnimationFrame)
	}

	resizeAnimationFrame = requestAnimationFrame(() => {
		resizeAnimationFrame = null
		controller.resize()
		if (reapplyScrollViewAfterResize && status.value === 'ready') {
			reapplyScrollViewAfterResize = false
			applyScrollProgress(scrollProgress)
		}
	})
}

const handleViewportProfileChange = () => {
	reapplyScrollViewAfterResize = status.value === 'ready'
	resize()
}

const mountMap = async () => {
	await nextTick()
	const container = containerRef.value
	if (!container) return

	status.value = 'loading'
	unbindReady = controller.on('ready', () => {
		status.value = 'ready'
		applyScrollProgress(scrollProgress)
		resize()
		emit('ready')
	})
	unbindError = controller.on('error', () => {
		status.value = 'error'
		emit('error')
	})
	unbindWorldPlayerMarkerClick = controller.on(
		'worldPlayerMarkerClick',
		(payload) => emit('world-player-marker-click', payload),
	)
	unbindViewChanged = controller.on('viewChanged', handleViewChanged)
	try {
		await controller.mount({
			container,
			assets: { assetsBaseUrl: resolveAssetsBaseUrl() },
			mode: 'perspective',
			initialDistance: props.camera.distance,
			focus: focus(),
			focusHeightOffset: 0,
			initialOrientation: {
				rotation: props.camera.rotation,
				angle: props.camera.angle,
				tilt: props.camera.tilt,
			},
			unrestrictedPerspectiveAngle: true,
			unrestrictedViewDistance: props.developerControlsEnabled,
			keyboardControls: false,
			postProcessing: createHomeImmersiveAtmosphereOptions(
				props.lighting,
				props.water,
			),
			worldPlayerMarkers: props.worldPlayerMarkers ?? [],
			markerClicksOnly: props.markerClicksOnly,
		})
		controller.setRenderActive(props.renderActive !== false)
	} catch {
		// Controller emits the typed failure event used by this presentation.
	}
}

onMounted(() => {
	void mountMap()
	viewportMediaQuery = window.matchMedia('(max-width: 639px)')
	viewportMediaQuery.addEventListener('change', handleViewportProfileChange)

	const container = containerRef.value
	if (container && typeof ResizeObserver !== 'undefined') {
		resizeObserver = new ResizeObserver(resize)
		resizeObserver.observe(container)
	}
	container?.addEventListener('webglcontextlost', handleWebGlContextLost, true)
	container?.addEventListener(
		'webglcontextrestored',
		handleWebGlContextRestored,
		true,
	)
})

onBeforeUnmount(() => {
	viewportMediaQuery?.removeEventListener('change', handleViewportProfileChange)
	viewportMediaQuery = null
	resizeObserver?.disconnect()
	resizeObserver = null
	containerRef.value?.removeEventListener(
		'webglcontextlost',
		handleWebGlContextLost,
		true,
	)
	containerRef.value?.removeEventListener(
		'webglcontextrestored',
		handleWebGlContextRestored,
		true,
	)
	if (resizeAnimationFrame !== null) {
		cancelAnimationFrame(resizeAnimationFrame)
		resizeAnimationFrame = null
	}
	reapplyScrollViewAfterResize = false
	unbindReady?.()
	unbindError?.()
	unbindWorldPlayerMarkerClick?.()
	unbindViewChanged?.()
	controller.destroy()
})
</script>

<style scoped>
:deep(.home-world-player-marker) {
	position: relative;
	display: flex;
	min-width: 1.5rem;
	transform: translate(-50%, -100%);
	cursor: pointer;
	pointer-events: auto;
	user-select: none;
	flex-direction: column;
	align-items: center;
	transition:
		opacity 320ms cubic-bezier(0.22, 1, 0.36, 1),
		filter 320ms cubic-bezier(0.22, 1, 0.36, 1),
		transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

:deep(.home-world-player-marker:hover),
:deep(.home-world-player-marker:focus-visible),
:deep(.home-world-player-marker[data-home-marker-hovered='true']) {
	filter: brightness(1.08);
}

:deep(.home-world-player-marker:focus-visible) {
	outline: 2px solid rgb(125 211 252);
	outline-offset: 4px;
}

:deep(.home-world-player-marker img) {
	display: block;
	width: 1.5rem;
	height: 1.5rem;
	border: 1px solid rgb(255 255 255 / 0.9);
	border-radius: 0.25rem;
	background: rgb(15 23 42 / 0.84);
	box-shadow: 0 4px 12px rgb(2 6 23 / 0.42);
	image-rendering: pixelated;
}

:deep(.home-world-player-marker[data-home-administrator='true'] img) {
	border-color: rgb(252 211 77);
	box-shadow:
		0 4px 12px rgb(2 6 23 / 0.42),
		0 0 0 1px rgb(245 158 11 / 0.48);
}

:deep(.home-world-player-marker .bm-player-name) {
	position: absolute;
	bottom: calc(100% + 0.375rem);
	left: 50%;
	z-index: 1;
	max-width: 8rem;
	overflow: hidden;
	transform: translate(-50%, 0.25rem);
	border: 1px solid rgb(255 255 255 / 0.14);
	border-radius: 0.375rem;
	background: rgb(2 6 23 / 0.9);
	padding: 0.2rem 0.45rem;
	color: white;
	font-size: 0.75rem;
	font-weight: 600;
	line-height: 1rem;
	opacity: 0;
	pointer-events: none;
	text-align: center;
	text-overflow: ellipsis;
	text-shadow:
		0 1px 3px rgb(2 6 23 / 0.95),
		0 0 10px rgb(2 6 23 / 0.72);
	transition:
		opacity 160ms ease,
		transform 160ms ease;
	white-space: nowrap;
}

:deep(.home-world-player-marker:hover .bm-player-name),
:deep(.home-world-player-marker:focus-visible .bm-player-name),
:deep(
	.home-world-player-marker[data-home-marker-hovered='true'] .bm-player-name
) {
	transform: translate(-50%, 0);
	opacity: 1;
}

@media (max-width: 639px) {
	:deep(.home-world-player-marker) {
		min-width: 1.25rem;
	}

	:deep(.home-world-player-marker img) {
		width: 1.25rem;
		height: 1.25rem;
	}

	:deep(.home-world-player-marker .bm-player-name) {
		max-width: 6rem;
		font-size: 0.6875rem;
	}
}
</style>
