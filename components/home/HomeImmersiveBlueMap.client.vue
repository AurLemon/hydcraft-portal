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
import { createBlueMapController, type BlueMapFocus } from '~/utils/map'
import { createHomeImmersiveAtmosphereOptions } from '~/utils/home/immersive-atmosphere'
import type {
	HomeImmersiveSceneCamera,
	HomeImmersiveSceneLighting,
	HomeImmersiveSceneWater,
} from '~/utils/home/immersive-scenes'

interface HomeImmersiveBlueMapProps {
	assetsBaseUrl: string
	camera: HomeImmersiveSceneCamera
	lighting: HomeImmersiveSceneLighting
	water?: HomeImmersiveSceneWater
}

const props = defineProps<HomeImmersiveBlueMapProps>()
const { t } = useI18n()
const containerRef = ref<HTMLElement | null>(null)
const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const controller = createBlueMapController()
let resizeObserver: ResizeObserver | null = null
let resizeAnimationFrame: number | null = null
let unbindReady: (() => void) | null = null
let unbindError: (() => void) | null = null

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
			keyboardControls: false,
			postProcessing: createHomeImmersiveAtmosphereOptions(
				props.lighting,
				props.water,
			),
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
	controller.destroy()
})
</script>
