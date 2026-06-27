<template>
	<article
		class="relative overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
	>
		<div ref="viewportRef" class="relative h-80 w-full overflow-hidden">
			<USkeleton
				v-if="!imageReady"
				class="absolute inset-0 h-full w-full rounded-none"
			/>
			<img
				ref="imageRef"
				:src="imageSrc"
				:alt="imageAlt"
				class="server-overview-preview-image absolute inset-x-0 max-w-none object-cover transition-opacity duration-300"
				:class="imageReady ? 'opacity-100' : 'opacity-0'"
				:style="imageMotionStyle"
				loading="lazy"
				decoding="async"
				@load="handleImageLoad"
				@error="handleImageLoad"
			/>
		</div>

		<div
			class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(148,163,184,0.06)_24%,rgba(100,116,139,0.18)_48%,rgba(51,65,85,0.44)_100%)] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.06)_0%,rgba(15,23,42,0.14)_24%,rgba(30,41,59,0.3)_48%,rgba(2,6,23,0.62)_100%)]"
		/>
		<div
			class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-42 bg-linear-to-t from-slate-500/82 via-slate-500/34 to-transparent backdrop-blur-[26px] dark:from-slate-950/88 dark:via-slate-950/42 dark:to-transparent mask-[linear-gradient(to_top,black_0%,rgba(0,0,0,0.94)_24%,rgba(0,0,0,0.72)_46%,rgba(0,0,0,0.28)_72%,transparent_100%)]"
		/>

		<div
			class="absolute inset-0 z-20 flex flex-col items-center justify-end px-5 py-7 text-center sm:px-6 sm:py-8"
		>
			<div class="max-w-xl">
				<h3
					class="font-arkpixel text-3xl leading-none tracking-wide text-white [text-shadow:0_2px_12px_rgba(15,23,42,0.6)] sm:text-4xl"
				>
					{{ headline }}
				</h3>
				<p
					class="mt-3 text-sm leading-7 text-slate-100 [text-shadow:0_1px_4px_rgba(15,23,42,0.48)] sm:text-base"
				>
					{{ description }}
				</p>
			</div>
		</div>
	</article>
</template>

<script setup lang="ts">
interface Props {
	imageSrc: string
	imageAlt: string
	headline: string
	description: string
}

const props = defineProps<Props>()

const viewportRef = ref<HTMLElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)
const imageReady = ref(false)
const naturalSize = ref({
	width: 0,
	height: 0,
})
const viewportSize = ref({
	width: 0,
	height: 0,
})
const currentOffsetPx = ref(0)
const motionDirection = ref<1 | -1>(1)

let resizeObserver: ResizeObserver | null = null
let motionFrameId = 0
let lastMotionTimestamp = 0

const MOTION_SPEED_PX_PER_SECOND = 6

const imageAspectRatio = computed(() => {
	if (naturalSize.value.width <= 0 || naturalSize.value.height <= 0) {
		return null
	}

	return naturalSize.value.width / naturalSize.value.height
})

const renderedImageHeight = computed(() => {
	const aspectRatio = imageAspectRatio.value

	if (
		!aspectRatio ||
		viewportSize.value.width <= 0 ||
		viewportSize.value.height <= 0
	) {
		return viewportSize.value.height
	}

	return Math.max(
		viewportSize.value.height,
		viewportSize.value.width / aspectRatio,
	)
})

const motionDistance = computed(() =>
	Math.max(renderedImageHeight.value - viewportSize.value.height, 0),
)

const imageMotionStyle = computed(() => {
	const height = renderedImageHeight.value
	const offset = motionDistance.value

	return {
		top: `${-offset}px`,
		height: `${height}px`,
		width: '100%',
		transform: `translate3d(0, ${currentOffsetPx.value}px, 0)`,
	}
})

const stopMotion = () => {
	if (motionFrameId) {
		cancelAnimationFrame(motionFrameId)
		motionFrameId = 0
	}
	lastMotionTimestamp = 0
}

const stepMotion = (timestamp: number) => {
	const distance = motionDistance.value

	if (distance <= 0) {
		currentOffsetPx.value = 0
		lastMotionTimestamp = timestamp
		motionFrameId = requestAnimationFrame(stepMotion)
		return
	}

	if (!lastMotionTimestamp) {
		lastMotionTimestamp = timestamp
	}

	const deltaSeconds = (timestamp - lastMotionTimestamp) / 1000
	lastMotionTimestamp = timestamp
	const stepDistance =
		deltaSeconds * MOTION_SPEED_PX_PER_SECOND * motionDirection.value
	const nextOffset = currentOffsetPx.value + stepDistance

	if (nextOffset >= distance) {
		currentOffsetPx.value = distance
		motionDirection.value = -1
	} else if (nextOffset <= 0) {
		currentOffsetPx.value = 0
		motionDirection.value = 1
	} else {
		currentOffsetPx.value = nextOffset
	}

	motionFrameId = requestAnimationFrame(stepMotion)
}

const startMotion = () => {
	stopMotion()
	currentOffsetPx.value = 0
	motionDirection.value = 1
	motionFrameId = requestAnimationFrame(stepMotion)
}

const syncViewportSize = () => {
	const viewport = viewportRef.value

	if (!viewport) {
		return
	}

	viewportSize.value = {
		width: viewport.clientWidth,
		height: viewport.clientHeight,
	}
}

const handleImageLoad = () => {
	const image = imageRef.value

	if (!image) {
		return
	}

	naturalSize.value = {
		width: image.naturalWidth || image.width || 0,
		height: image.naturalHeight || image.height || 0,
	}
	imageReady.value = true
	syncViewportSize()
	startMotion()
}

watch(
	() => props.imageSrc,
	() => {
		stopMotion()
		currentOffsetPx.value = 0
		imageReady.value = false
		naturalSize.value = {
			width: 0,
			height: 0,
		}
	},
)

onMounted(() => {
	syncViewportSize()

	if (typeof ResizeObserver !== 'undefined' && viewportRef.value) {
		resizeObserver = new ResizeObserver(() => {
			syncViewportSize()
		})
		resizeObserver.observe(viewportRef.value)
	}

	if (imageRef.value?.complete) {
		handleImageLoad()
	}
})

onBeforeUnmount(() => {
	stopMotion()
	resizeObserver?.disconnect()
	resizeObserver = null
})
</script>
