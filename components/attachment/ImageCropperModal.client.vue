<template>
	<UModal
		:open="open"
		:ui="{ content: 'max-w-5xl', body: 'p-0' }"
		@update:open="handleOpenChange"
	>
		<template #content>
			<div class="grid max-h-[88dvh] overflow-hidden p-5 sm:p-6">
				<div class="flex items-start justify-between gap-4">
					<div>
						<h2 class="text-xl font-semibold text-slate-950 dark:text-white">
							{{ title || t('attachments.crop.title') }}
						</h2>
					</div>
					<UButton
						type="button"
						color="neutral"
						variant="ghost"
						icon="i-lucide-x"
						:aria-label="t('attachments.crop.cancel')"
						@click="cancel"
					/>
				</div>

				<div class="mt-5 grid min-h-0 gap-5">
					<div
						ref="cropperContainer"
						class="image-cropper-canvas h-[min(54dvh,32rem)] min-h-80 overflow-hidden rounded-lg border border-slate-200 bg-slate-950 dark:border-slate-800"
					/>
				</div>

				<div
					class="mt-5 flex flex-row-reverse justify-center gap-3 sm:flex-row sm:justify-end"
				>
					<UButton
						class="justify-center w-32 lg:w-auto"
						type="button"
						color="neutral"
						variant="ghost"
						@click="cancel"
					>
						{{ t('common.cancel') }}
					</UButton>
					<UButton
						class="justify-center w-32 lg:w-auto"
						type="button"
						icon="i-lucide-check"
						:disabled="!cropper"
						@click="confirm"
					>
						{{ t('attachments.crop.confirm') }}
					</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import Cropper from 'cropperjs'
import type { CropperCanvas, CropperImage, CropperSelection } from 'cropperjs'
import type {
	ImageCropperConfirmPayload,
	ImageCropperPreviewShape,
} from '~/composables/useImageCropper'

interface ImageCropperModalProps {
	file: File | null
	open: boolean
	aspectRatio?: number
	title?: string
	previewShape?: ImageCropperPreviewShape
}

interface CropperSelectionChangeDetail {
	x: number
	y: number
	width: number
	height: number
}

interface CropperBounds {
	x: number
	y: number
	width: number
	height: number
}

const props = withDefaults(defineProps<ImageCropperModalProps>(), {
	aspectRatio: undefined,
	title: '',
	previewShape: 'square',
})
const emit = defineEmits<{
	cancel: []
	confirm: [payload: ImageCropperConfirmPayload]
	'update:open': [value: boolean]
}>()

const { t } = useI18n()
const cropperContainer = ref<HTMLElement | null>(null)
const cropper = shallowRef<Cropper | null>(null)
const objectUrl = ref('')
let removeCropperListeners: (() => void) | null = null
let resizeObserver: ResizeObserver | null = null
let resizeObserverPrimed = false
let resizeTimer: ReturnType<typeof setTimeout> | null = null

const waitForFrame = (): Promise<void> =>
	new Promise((resolve) => {
		requestAnimationFrame(() => resolve())
	})

const waitForFrames = async (count: number): Promise<void> => {
	for (let index = 0; index < count; index += 1) {
		await waitForFrame()
	}
}

const cleanup = (): void => {
	removeCropperListeners?.()
	removeCropperListeners = null
	resizeObserver?.disconnect()
	resizeObserver = null
	resizeObserverPrimed = false

	if (resizeTimer) {
		clearTimeout(resizeTimer)
		resizeTimer = null
	}

	cropper.value?.destroy()
	cropper.value = null

	if (objectUrl.value) {
		URL.revokeObjectURL(objectUrl.value)
		objectUrl.value = ''
	}
}

const getCanvasSize = (
	selection: { width: number; height: number },
	maxSize: number,
): { width: number; height: number } => {
	if (props.aspectRatio) {
		return {
			width: maxSize,
			height: Math.round(maxSize / props.aspectRatio),
		}
	}

	const selectionWidth = Math.max(Number(selection.width), 1)
	const selectionHeight = Math.max(Number(selection.height), 1)
	const scale = maxSize / Math.max(selectionWidth, selectionHeight)

	return {
		width: Math.max(Math.round(selectionWidth * scale), 1),
		height: Math.max(Math.round(selectionHeight * scale), 1),
	}
}

const getImageBounds = (
	canvas: CropperCanvas,
	image: CropperImage,
): CropperBounds | null => {
	const canvasRect = canvas.getBoundingClientRect()
	const imageRect = image.$image.getBoundingClientRect()

	if (
		!canvasRect.width ||
		!canvasRect.height ||
		!imageRect.width ||
		!imageRect.height
	) {
		return null
	}

	const x = imageRect.left - canvasRect.left
	const y = imageRect.top - canvasRect.top

	return {
		x,
		y,
		width: imageRect.width,
		height: imageRect.height,
	}
}

const fitAspectRatioInBounds = (
	bounds: CropperBounds,
	aspectRatio: number,
): CropperBounds => {
	const widthByHeight = bounds.height * aspectRatio

	if (widthByHeight <= bounds.width) {
		const width = widthByHeight

		return {
			x: bounds.x + (bounds.width - width) / 2,
			y: bounds.y,
			width,
			height: bounds.height,
		}
	}

	const height = bounds.width / aspectRatio

	return {
		x: bounds.x,
		y: bounds.y + (bounds.height - height) / 2,
		width: bounds.width,
		height,
	}
}

const getInitialSelectionBounds = (
	imageBounds: CropperBounds,
): CropperBounds => {
	if (!props.aspectRatio) {
		return imageBounds
	}

	return fitAspectRatioInBounds(imageBounds, props.aspectRatio)
}

const clampSelectionToImage = (
	nextSelection: CropperSelectionChangeDetail,
	imageBounds: CropperBounds,
): CropperBounds => {
	let width = Math.min(Math.max(nextSelection.width, 1), imageBounds.width)
	let height = Math.min(Math.max(nextSelection.height, 1), imageBounds.height)

	if (props.aspectRatio) {
		const fitted = fitAspectRatioInBounds(
			{
				x: 0,
				y: 0,
				width,
				height,
			},
			props.aspectRatio,
		)

		width = fitted.width
		height = fitted.height
	}

	const x = Math.min(
		Math.max(nextSelection.x, imageBounds.x),
		imageBounds.x + imageBounds.width - width,
	)
	const y = Math.min(
		Math.max(nextSelection.y, imageBounds.y),
		imageBounds.y + imageBounds.height - height,
	)

	return {
		x,
		y,
		width,
		height,
	}
}

const isSameSelection = (
	left: CropperSelectionChangeDetail,
	right: CropperBounds,
): boolean =>
	Math.abs(left.x - right.x) < 0.5 &&
	Math.abs(left.y - right.y) < 0.5 &&
	Math.abs(left.width - right.width) < 0.5 &&
	Math.abs(left.height - right.height) < 0.5

const applySelectionBounds = (
	selection: CropperSelection,
	bounds: CropperBounds,
): void => {
	selection.$change(
		bounds.x,
		bounds.y,
		bounds.width,
		bounds.height,
		props.aspectRatio,
		true,
	)
}

const initializeSelection = (
	cropperCanvas: CropperCanvas | null,
	cropperImage: CropperImage | null,
	selection: CropperSelection | null,
): void => {
	if (!cropperCanvas || !cropperImage || !selection) {
		return
	}

	const imageBounds = getImageBounds(cropperCanvas, cropperImage)

	if (!imageBounds) {
		return
	}

	applySelectionBounds(selection, getInitialSelectionBounds(imageBounds))
}

const scheduleCropperResize = (): void => {
	if (!props.open || !props.file || !cropper.value) {
		return
	}

	if (resizeTimer) {
		clearTimeout(resizeTimer)
	}

	resizeTimer = setTimeout(() => {
		resizeTimer = null
		void setupCropper()
	}, 120)
}

const startResizeObserver = (container: HTMLElement): void => {
	resizeObserver?.disconnect()
	resizeObserverPrimed = false
	resizeObserver = new ResizeObserver(() => {
		if (!resizeObserverPrimed) {
			resizeObserverPrimed = true
			return
		}

		scheduleCropperResize()
	})
	resizeObserver.observe(container)
}

const canvasToBlob = (
	canvas: HTMLCanvasElement,
	type: string,
	quality: number,
): Promise<Blob | null> =>
	new Promise((resolve) => {
		canvas.toBlob(resolve, type, quality)
	})

const buildCroppedFile = async (): Promise<File | null> => {
	const selection = cropper.value?.getCropperSelection()

	if (!selection || !props.file) {
		return null
	}

	const outputSize = getCanvasSize(
		selection,
		props.previewShape === 'cover' ? 1440 : 512,
	)
	const canvas = await selection.$toCanvas(outputSize)
	const blob = await canvasToBlob(canvas, 'image/webp', 0.92)

	if (!blob) {
		return null
	}

	const baseName = props.file.name.replace(/\.[^.]+$/, '') || 'image'
	return new File([blob], `${baseName}-cropped.webp`, {
		type: 'image/webp',
	})
}

const setupCropper = async (): Promise<void> => {
	cleanup()

	if (!props.file || !cropperContainer.value || !props.open) {
		return
	}

	const activeContainer = cropperContainer.value
	objectUrl.value = URL.createObjectURL(props.file)

	const image = new Image()
	image.src = objectUrl.value
	await image.decode()

	const activeCropper = new Cropper(image, {
		container: activeContainer,
		template: `
			<cropper-canvas background>
				<cropper-image></cropper-image>
				<cropper-shade hidden></cropper-shade>
				<cropper-handle action="select" plain></cropper-handle>
				<cropper-selection
					movable
					resizable
					outlined
					aspect-ratio="${props.aspectRatio ?? NaN}"
				>
					<cropper-grid role="grid" covered></cropper-grid>
					<cropper-crosshair centered></cropper-crosshair>
					<cropper-handle action="move" theme-color="rgba(255,255,255,0.32)"></cropper-handle>
					<cropper-handle action="n-resize"></cropper-handle>
					<cropper-handle action="e-resize"></cropper-handle>
					<cropper-handle action="s-resize"></cropper-handle>
					<cropper-handle action="w-resize"></cropper-handle>
					<cropper-handle action="ne-resize"></cropper-handle>
					<cropper-handle action="nw-resize"></cropper-handle>
					<cropper-handle action="se-resize"></cropper-handle>
					<cropper-handle action="sw-resize"></cropper-handle>
				</cropper-selection>
			</cropper-canvas>
			`,
	})
	cropper.value = activeCropper

	await nextTick()

	if (cropper.value !== activeCropper) {
		return
	}

	const cropperImage = activeCropper.getCropperImage()
	const cropperCanvas = activeCropper.getCropperCanvas()
	const selection = activeCropper.getCropperSelection()
	const keepSelectionInsideImage = (event: Event): void => {
		const changeEvent = event as CustomEvent<CropperSelectionChangeDetail>

		if (!cropperCanvas || !cropperImage || !selection || !changeEvent.detail) {
			return
		}

		const imageBounds = getImageBounds(cropperCanvas, cropperImage)

		if (!imageBounds) {
			return
		}

		const nextSelection = clampSelectionToImage(changeEvent.detail, imageBounds)

		if (isSameSelection(changeEvent.detail, nextSelection)) {
			return
		}

		event.preventDefault()
		requestAnimationFrame(() => {
			if (cropper.value !== activeCropper) {
				return
			}

			applySelectionBounds(selection, nextSelection)
		})
	}

	selection?.addEventListener('change', keepSelectionInsideImage)
	removeCropperListeners = () => {
		selection?.removeEventListener('change', keepSelectionInsideImage)
	}

	await cropperImage?.$ready()
	await nextTick()
	await waitForFrames(2)

	if (cropper.value !== activeCropper) {
		return
	}

	initializeSelection(cropperCanvas, cropperImage, selection)
	await waitForFrame()
	initializeSelection(cropperCanvas, cropperImage, selection)

	startResizeObserver(activeContainer)
}

const handleOpenChange = (value: boolean): void => {
	if (!value) {
		cancel()
	}
}

const cancel = (): void => {
	cleanup()
	emit('update:open', false)
	emit('cancel')
}

const confirm = async (): Promise<void> => {
	const croppedFile = await buildCroppedFile()

	if (!croppedFile) {
		return
	}

	emit('confirm', {
		file: croppedFile,
	})
	emit('update:open', false)
	cleanup()
}

watch(
	() => [props.open, props.file] as const,
	() => {
		if (props.open) {
			void nextTick(setupCropper)
		} else {
			cleanup()
		}
	},
	{ immediate: true },
)

onBeforeUnmount(cleanup)
</script>

<style scoped>
.image-cropper-canvas :deep(cropper-canvas) {
	height: 100%;
	width: 100%;
}
</style>
