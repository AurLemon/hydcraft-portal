<template>
	<UModal
		:open="open"
		fullscreen
		:close="false"
		:ui="{
			overlay: 'bg-white/78 backdrop-blur-md dark:bg-slate-950/86',
			content: 'bg-transparent shadow-none ring-0',
			body: 'p-0',
		}"
		@update:open="handleOpenChange"
	>
		<template #content="{ close }">
			<div
				v-if="image"
				class="relative flex min-h-dvh items-center justify-center p-3 sm:p-6"
				@click="close"
			>
				<button
					type="button"
					class="absolute top-3 right-3 z-10 flex h-11 w-11 items-center justify-center text-slate-500 transition-colors duration-200 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400 dark:text-slate-400 dark:hover:text-slate-50"
					aria-label="Close image preview"
					@click.stop="close"
				>
					<UIcon name="i-lucide-x" class="text-2xl" />
				</button>

				<figure class="flex flex-col items-center" @click.stop>
					<div
						class="flex items-center justify-center overflow-hidden rounded-xl"
						:style="previewImageFrameStyle"
					>
						<SkeletonImage
							:src="image.src"
							:alt="image.alt"
							class="h-full w-full"
							image-class="block h-full w-full rounded-xl object-contain select-none"
							skeleton-class="rounded-xl"
							loading="eager"
						/>
					</div>

					<figcaption
						v-if="image.caption"
						class="mt-4 max-w-3xl px-3 text-center text-sm lg:text-lg leading-6 text-slate-600 dark:text-slate-300"
						:style="previewCaptionStyle"
					>
						{{ image.caption }}
					</figcaption>
				</figure>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import type { NormalizedContentImageItem } from './utils/content-image'

interface ContentImageLightboxProps {
	open: boolean
	image: NormalizedContentImageItem | null
}

const props = defineProps<ContentImageLightboxProps>()

const emit = defineEmits<{
	'update:open': [value: boolean]
}>()

interface ImageNaturalSize {
	width: number
	height: number
}

const PREVIEW_MAX_WIDTH_PX = 88 * 16
const PREVIEW_DESKTOP_PADDING_PX = 48
const PREVIEW_MOBILE_PADDING_PX = 24
const PREVIEW_VERTICAL_PADDING_PX = 96

const viewportWidth = ref(0)
const viewportHeight = ref(0)
const imageNaturalSize = ref<ImageNaturalSize | null>(null)
let naturalSizeRequestId = 0

const handleOpenChange = (value: boolean): void => {
	emit('update:open', value)
}

const parseDimensionValue = (value: string): number | null => {
	const parsed = Number.parseFloat(value)

	return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const fallbackAspectRatio = computed(() => {
	if (!props.image) {
		return 1
	}

	const width = parseDimensionValue(props.image.width)
	const height = parseDimensionValue(props.image.height)

	if (!width || !height) {
		return 1
	}

	return width / height
})

const previewAspectRatio = computed(() => {
	if (imageNaturalSize.value) {
		return imageNaturalSize.value.width / imageNaturalSize.value.height
	}

	return fallbackAspectRatio.value
})

const previewImageFrameStyle = computed(() => {
	if (!props.image) {
		return undefined
	}

	const horizontalPadding =
		viewportWidth.value >= 640
			? PREVIEW_DESKTOP_PADDING_PX
			: PREVIEW_MOBILE_PADDING_PX
	const maxWidth = Math.max(
		Math.min(viewportWidth.value - horizontalPadding, PREVIEW_MAX_WIDTH_PX),
		0,
	)
	const maxHeight = Math.max(
		viewportHeight.value - PREVIEW_VERTICAL_PADDING_PX,
		0,
	)
	const aspectRatio = Math.max(previewAspectRatio.value, 0.01)

	if (maxWidth === 0 || maxHeight === 0) {
		return {
			maxWidth: 'min(96vw, 88rem)',
			maxHeight: 'calc(100dvh - 6rem)',
			aspectRatio: `${aspectRatio}`,
		}
	}

	const widthByHeight = maxHeight * aspectRatio
	const renderWidth = Math.min(maxWidth, widthByHeight)
	const renderHeight = renderWidth / aspectRatio

	return {
		width: `${renderWidth}px`,
		height: `${renderHeight}px`,
	}
})

const previewCaptionStyle = computed(() => {
	const frameStyle = previewImageFrameStyle.value

	if (!frameStyle?.width) {
		return undefined
	}

	return {
		width: frameStyle.width,
	}
})

const updateViewportSize = (): void => {
	if (!import.meta.client) {
		return
	}

	viewportWidth.value = window.innerWidth
	viewportHeight.value = window.innerHeight
}

const loadImageNaturalSize = (src: string | null): void => {
	imageNaturalSize.value = null

	if (!import.meta.client || !src) {
		return
	}

	const requestId = ++naturalSizeRequestId
	const image = new window.Image()

	image.onload = () => {
		if (requestId !== naturalSizeRequestId) {
			return
		}

		imageNaturalSize.value = {
			width: image.naturalWidth,
			height: image.naturalHeight,
		}
	}

	image.onerror = () => {
		if (requestId !== naturalSizeRequestId) {
			return
		}

		imageNaturalSize.value = null
	}

	image.src = src
}

watch(
	() => props.image?.src ?? null,
	(src) => {
		loadImageNaturalSize(src)
	},
	{ immediate: true },
)

onMounted(() => {
	updateViewportSize()
	window.addEventListener('resize', updateViewportSize, { passive: true })
})

onBeforeUnmount(() => {
	naturalSizeRequestId += 1
	window.removeEventListener('resize', updateViewportSize)
})
</script>
