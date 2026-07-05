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
						class="image-cropper-canvas h-[min(54dvh,32rem)] min-h-80 overflow-hidden rounded-lg border border-slate-200 bg-slate-950 dark:border-slate-800"
						:class="
							props.previewShape === 'circle'
								? 'image-cropper-circle'
								: 'image-cropper-rounded'
						"
					>
						<CropperComponent v-if="objectUrl" :key="objectUrl" />
					</div>
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
						:disabled="!cropperReady"
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
import type {
	Cropper,
	CropperInstance,
	VuePictureCropperProps,
} from 'vue-picture-cropper'
import { useCropper } from 'vue-picture-cropper'
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

interface CropperBounds {
	left: number
	top: number
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
const objectUrl = ref('')
const cropperReady = ref(false)

const cropperBoxStyle = {
	height: '100%',
	width: '100%',
} as const

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

const fitAspectRatioInBounds = (
	bounds: CropperBounds,
	aspectRatio: number,
): CropperBounds => {
	const widthByHeight = bounds.height * aspectRatio

	if (widthByHeight <= bounds.width) {
		const width = widthByHeight

		return {
			left: bounds.left + (bounds.width - width) / 2,
			top: bounds.top,
			width,
			height: bounds.height,
		}
	}

	const height = bounds.width / aspectRatio

	return {
		left: bounds.left,
		top: bounds.top + (bounds.height - height) / 2,
		width: bounds.width,
		height,
	}
}

const applyInitialCropBox = (instance: CropperInstance): void => {
	const imageData = instance.getImageData()
	const imageBounds: CropperBounds = {
		left: imageData.left,
		top: imageData.top,
		width: imageData.width,
		height: imageData.height,
	}

	if (!props.aspectRatio) {
		instance.setCropBoxData(imageBounds)
		return
	}

	instance.setCropBoxData(
		fitAspectRatioInBounds(imageBounds, props.aspectRatio),
	)
}

const handleCropperReady = (
	event: Cropper.ReadyEvent<HTMLImageElement>,
): void => {
	const instance = event.currentTarget.cropper as CropperInstance | undefined

	if (!instance) {
		return
	}

	requestAnimationFrame(() => {
		applyInitialCropBox(instance)
		cropperReady.value = true
	})
}

const cropperOptions = computed<CropperInstance.Options>(() => ({
	aspectRatio: props.aspectRatio ?? NaN,
	autoCrop: true,
	autoCropArea: 1,
	background: true,
	center: false,
	checkOrientation: true,
	cropBoxMovable: true,
	cropBoxResizable: true,
	dragMode: 'none',
	guides: true,
	highlight: true,
	modal: true,
	movable: false,
	responsive: true,
	restore: false,
	rotatable: false,
	scalable: false,
	toggleDragModeOnDblclick: false,
	viewMode: 2,
	wheelZoomRatio: 0,
	zoomOnTouch: false,
	zoomOnWheel: false,
	zoomable: false,
	ready: handleCropperReady,
}))

const cropperProps = computed<VuePictureCropperProps>(() => ({
	img: objectUrl.value,
	boxStyle: cropperBoxStyle,
	options: cropperOptions.value,
}))

const [CropperComponent, cropper] = useCropper(cropperProps)
const cropperInstance = computed<CropperInstance | null>(() =>
	cropper.getInstance(),
)

const cleanup = (): void => {
	cropperReady.value = false

	if (objectUrl.value) {
		URL.revokeObjectURL(objectUrl.value)
		objectUrl.value = ''
	}
}

const buildCroppedFile = async (): Promise<File | null> => {
	const instance = cropperInstance.value

	if (!instance || !props.file) {
		return null
	}

	const outputSize = getCanvasSize(
		instance.getData(true),
		props.previewShape === 'cover' ? 1440 : 512,
	)
	const canvas = instance.getCroppedCanvas({
		...outputSize,
		imageSmoothingEnabled: true,
		imageSmoothingQuality: 'high',
	})

	const blob = await new Promise<Blob | null>((resolve) => {
		canvas.toBlob(resolve, 'image/webp', 0.92)
	})

	if (!blob) {
		return null
	}

	const baseName = props.file.name.replace(/\.[^.]+$/, '') || 'image'

	return new File([blob], `${baseName}-cropped.webp`, {
		type: 'image/webp',
	})
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
	([open, file]) => {
		cleanup()

		if (!open || !file) {
			return
		}

		objectUrl.value = URL.createObjectURL(file)
	},
	{ immediate: true },
)

onBeforeUnmount(cleanup)
</script>

<style scoped>
.image-cropper-canvas :deep(.vpc-root),
.image-cropper-canvas :deep(.cropper-container) {
	height: 100% !important;
	width: 100% !important;
}

.image-cropper-canvas :deep(.cropper-bg) {
	background-image:
		linear-gradient(45deg, rgb(71 85 105 / 0.65) 25%, transparent 25%),
		linear-gradient(-45deg, rgb(71 85 105 / 0.65) 25%, transparent 25%),
		linear-gradient(45deg, transparent 75%, rgb(71 85 105 / 0.65) 75%),
		linear-gradient(-45deg, transparent 75%, rgb(71 85 105 / 0.65) 75%);
	background-position:
		0 0,
		0 0.5rem,
		0.5rem -0.5rem,
		-0.5rem 0;
	background-size: 1rem 1rem;
}

.image-cropper-canvas :deep(.cropper-view-box),
.image-cropper-canvas :deep(.cropper-face) {
	border-radius: 0.5rem;
}

.image-cropper-circle :deep(.cropper-view-box),
.image-cropper-circle :deep(.cropper-face) {
	border-radius: 9999px;
}
</style>
