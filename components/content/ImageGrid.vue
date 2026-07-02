<template>
	<div class="my-6 max-w-full min-w-0">
		<div :class="containerClass" v-bind="gridAttrs">
			<figure
				v-for="(image, index) in normalizedImages"
				:key="`${image.src}-${index}`"
				class="m-0 min-w-0"
				:class="[itemClass, getFigureClass()]"
				:style="getFigureStyle(image)"
			>
				<button
					type="button"
					:class="getButtonClass()"
					:style="getButtonStyle(image)"
					:aria-label="t('content.imageGrid.openPreview', { alt: image.alt })"
					@click="openPreview(index)"
				>
					<DeferredSkeletonImage
						:src="image.src"
						:alt="image.alt"
						root-margin="180px 0px"
						:class="getImageWrapperClass()"
						:image-class="getImageClass()"
						@ready="handleImageReady(image, $event)"
					/>
				</button>
				<figcaption
					v-if="image.caption"
					class="mt-2 text-center text-sm leading-6 text-slate-500 dark:text-slate-400"
				>
					{{ image.caption }}
				</figcaption>
			</figure>
		</div>
	</div>

	<ContentImageLightbox
		:open="activeImageIndex !== null"
		:image="activeImage"
		@update:open="handlePreviewOpenChange"
	/>
</template>

<script setup lang="ts">
import { computed, useAttrs, type CSSProperties } from 'vue'

import {
	normalizeContentImage,
	parseContentImages,
	type ContentImageItem,
	type NormalizedContentImageItem,
} from './utils/content-image'

type ResponsiveImageStyle = CSSProperties & Record<`--${string}`, string>

defineOptions({
	inheritAttrs: false,
})

interface ContentImageGridProps {
	images?: string | Array<string | ContentImageItem>
	height?: string
	mobileWidth?: string
	mobileHeight?: string
	defaultWidth?: string
	defaultHeight?: string
	heightMode?: 'fixed' | 'auto'
	widthMode?: 'fixed' | 'auto'
}

const props = withDefaults(defineProps<ContentImageGridProps>(), {
	images: () => [],
	height: '',
	mobileWidth: '',
	mobileHeight: '',
	defaultWidth: '100%',
	defaultHeight: '13rem',
	heightMode: 'fixed',
	widthMode: 'fixed',
})

const { t } = useI18n()
const attrs = useAttrs()
const activeImageIndex = ref<number | null>(null)
const imageAspectRatioMap = ref<Record<string, number>>({})

const sourceImages = computed<Array<string | ContentImageItem>>(() =>
	parseContentImages(props.images),
)

const resolvedDefaultHeight = computed(
	() => props.height || props.defaultHeight,
)

const normalizedImages = computed(() =>
	sourceImages.value.map((image, index) =>
		normalizeContentImage(
			image,
			index,
			props.defaultWidth,
			resolvedDefaultHeight.value,
		),
	),
)

const hasExplicitSizing = computed(() =>
	sourceImages.value.some(
		(image) => typeof image === 'object' && (image.width || image.height),
	),
)

const activeImage = computed(() =>
	activeImageIndex.value === null
		? null
		: (normalizedImages.value[activeImageIndex.value] ?? null),
)

const containerClass = computed(() =>
	isAutoWidth.value || hasExplicitSizing.value
		? ['flex flex-wrap justify-center gap-4', attrs.class]
		: ['grid gap-4 justify-items-center', attrs.class],
)

const itemClass = computed(() =>
	isAutoWidth.value || hasExplicitSizing.value ? 'flex-none' : 'w-full',
)

const isAutoHeight = computed(() => props.heightMode === 'auto')
const isAutoWidth = computed(
	() => props.heightMode !== 'auto' && props.widthMode === 'auto',
)

const gridAttrs = computed(() => {
	const { class: _class, ...restAttrs } = attrs

	return restAttrs
})

const getButtonStyle = (
	image: NormalizedContentImageItem,
): ResponsiveImageStyle => {
	const style: ResponsiveImageStyle = {}

	if (isAutoHeight.value) {
		return style
	}

	style['--content-image-height'] = image.height

	if (props.mobileHeight) {
		style['--content-image-mobile-height'] = props.mobileHeight
	}

	if (isAutoWidth.value) {
		const aspectRatio =
			imageAspectRatioMap.value[image.src] ?? image.aspectRatio ?? 1

		style.width = `calc(var(--content-image-height) * ${aspectRatio})`
		style.aspectRatio = `${aspectRatio}`

		if (props.mobileHeight) {
			style['--content-image-mobile-width'] =
				`calc(var(--content-image-mobile-height) * ${aspectRatio})`
		}
	}

	return style
}

const handleImageReady = (
	image: NormalizedContentImageItem,
	payload: { width: number; height: number },
): void => {
	if (payload.width <= 0 || payload.height <= 0) {
		return
	}

	const aspectRatio = payload.width / payload.height

	if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
		return
	}

	if (imageAspectRatioMap.value[image.src] === aspectRatio) {
		return
	}

	imageAspectRatioMap.value = {
		...imageAspectRatioMap.value,
		[image.src]: aspectRatio,
	}
}

const getImageClass = (): string =>
	isAutoHeight.value
		? 'block h-auto w-full object-cover'
		: isAutoWidth.value
			? 'block h-full w-auto max-w-none object-cover'
			: 'block h-full w-full object-cover'

const getFigureStyle = (
	image: NormalizedContentImageItem,
): ResponsiveImageStyle => {
	const style: ResponsiveImageStyle = {}

	if (isAutoWidth.value) {
		const aspectRatio =
			imageAspectRatioMap.value[image.src] ?? image.aspectRatio ?? 1

		style.width = `calc(var(--content-image-height) * ${aspectRatio})`

		if (props.mobileHeight) {
			style['--content-image-mobile-width'] =
				`calc(var(--content-image-mobile-height) * ${aspectRatio})`
		}

		return style
	}

	style['--content-image-width'] = image.width

	if (props.mobileWidth) {
		style['--content-image-mobile-width'] = props.mobileWidth
	}

	return style
}

const getFigureClass = (): string =>
	isAutoWidth.value
		? 'content-image-auto-width-bound'
		: 'content-image-width-bound'

const getButtonClass = (): string =>
	isAutoWidth.value
		? 'content-image-height-bound block w-full cursor-zoom-in overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400'
		: isAutoHeight.value
			? 'block w-full cursor-zoom-in overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400'
			: 'content-image-height-bound block w-full cursor-zoom-in overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400'

const getImageWrapperClass = (): string =>
	isAutoHeight.value
		? 'w-full'
		: isAutoWidth.value
			? 'h-full w-full'
			: 'h-full w-full'

const openPreview = (index: number): void => {
	activeImageIndex.value = index
}

const handlePreviewOpenChange = (open: boolean): void => {
	if (!open) {
		activeImageIndex.value = null
	}
}
</script>

<style scoped>
.content-image-width-bound {
	width: var(--content-image-width);
}

.content-image-auto-width-bound {
	width: var(--content-image-width);
}

.content-image-height-bound {
	height: var(--content-image-height);
}

@media (max-width: 767.98px) {
	.content-image-width-bound {
		width: var(--content-image-mobile-width, var(--content-image-width));
	}

	.content-image-auto-width-bound {
		width: var(--content-image-mobile-width, var(--content-image-width));
	}

	.content-image-height-bound {
		height: var(--content-image-mobile-height, var(--content-image-height));
	}
}
</style>
