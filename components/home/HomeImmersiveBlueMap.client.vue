<template>
	<div
		class="relative h-full w-full overflow-hidden bg-slate-950"
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
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import {
	createBlueMapController,
	type BlueMapFocus,
	type BlueMapViewChangedEventPayload,
} from '~/utils/map'
import type { HomeImmersiveSceneCamera } from '~/utils/home/immersive-scenes'

interface HomeImmersiveBlueMapProps {
	assetsBaseUrl: string
	camera: HomeImmersiveSceneCamera
	debugEnabled?: boolean
}

const props = defineProps<HomeImmersiveBlueMapProps>()
const emit = defineEmits<{
	cameraChanged: [camera: HomeImmersiveSceneCamera]
}>()
const { t } = useI18n()
const containerRef = ref<HTMLElement | null>(null)
const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const controller = createBlueMapController()
let resizeObserver: ResizeObserver | null = null
let resizeAnimationFrame: number | null = null
let unbindReady: (() => void) | null = null
let unbindError: (() => void) | null = null
let unbindViewChanged: (() => void) | null = null
let debugLogTimer: ReturnType<typeof setTimeout> | null = null

const focus = (): BlueMapFocus => ({
	x: props.camera.x,
	y: props.camera.y,
	z: props.camera.z,
})

const resolveAssetsBaseUrl = (): string =>
	new URL(props.assetsBaseUrl, window.location.origin).toString()

const normalizeCamera = (
	view: BlueMapViewChangedEventPayload,
): HomeImmersiveSceneCamera => ({
	x: Number(view.x.toFixed(2)),
	y: Number(view.y.toFixed(2)),
	z: Number(view.z.toFixed(2)),
	distance: Number(view.distance.toFixed(2)),
	rotation: Number(view.rotation.toFixed(4)),
	angle: Number(view.angle.toFixed(4)),
	tilt: Number(view.tilt.toFixed(4)),
})

const reportCameraChanged = (view: BlueMapViewChangedEventPayload) => {
	const camera = normalizeCamera(view)
	emit('cameraChanged', camera)
	if (!props.debugEnabled) return

	if (debugLogTimer) clearTimeout(debugLogTimer)
	debugLogTimer = setTimeout(() => {
		console.info('[debug] Home BlueMap camera', camera)
		debugLogTimer = null
	}, 220)
}

const resize = () => {
	if (resizeAnimationFrame !== null) {
		cancelAnimationFrame(resizeAnimationFrame)
	}

	resizeAnimationFrame = requestAnimationFrame(() => {
		resizeAnimationFrame = null
		controller.resize()
	})
}

const mountMap = async () => {
	await nextTick()
	const container = containerRef.value
	if (!container) return

	status.value = 'loading'
	unbindReady = controller.on('ready', () => {
		status.value = 'ready'
		resize()
	})
	unbindError = controller.on('error', () => {
		status.value = 'error'
	})
	unbindViewChanged = controller.on('viewChanged', reportCameraChanged)

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
		})
	} catch {
		// Controller emits the typed failure event used by this presentation.
	}
}

onMounted(() => {
	void mountMap()

	const container = containerRef.value
	if (container && typeof ResizeObserver !== 'undefined') {
		resizeObserver = new ResizeObserver(resize)
		resizeObserver.observe(container)
	}
})

onBeforeUnmount(() => {
	resizeObserver?.disconnect()
	resizeObserver = null
	if (resizeAnimationFrame !== null) {
		cancelAnimationFrame(resizeAnimationFrame)
		resizeAnimationFrame = null
	}
	unbindReady?.()
	unbindError?.()
	unbindViewChanged?.()
	if (debugLogTimer) clearTimeout(debugLogTimer)
	controller.destroy()
})
</script>
