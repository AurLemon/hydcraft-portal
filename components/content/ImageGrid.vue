<template>
	<div class="my-6 w-[min(calc(100vw-2rem),48rem)] max-w-full min-w-0">
		<div :class="containerClass" v-bind="gridAttrs">
			<figure
				v-for="(image, index) in normalizedImages"
				:key="`${image.src}-${index}`"
				class="m-0 min-w-0"
				:class="itemClass"
				:style="{ width: image.width }"
			>
				<button
					type="button"
					class="block w-full cursor-zoom-in overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
					:style="{ height: image.height }"
					:aria-label="`Open image preview: ${image.alt}`"
					@click="openPreview(index)"
				>
					<DeferredSkeletonImage
						:src="image.src"
						:alt="image.alt"
						root-margin="180px 0px"
						class="h-full w-full"
						image-class="block h-full w-full object-cover"
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
import { computed, useAttrs } from 'vue'

import {
	normalizeContentImage,
	parseContentImages,
	type ContentImageItem,
} from './utils/content-image'

defineOptions({
	inheritAttrs: false,
})

interface ContentImageGridProps {
	images?: string | Array<string | ContentImageItem>
	defaultWidth?: string
	defaultHeight?: string
}

const props = withDefaults(defineProps<ContentImageGridProps>(), {
	images: () => [],
	defaultWidth: '100%',
	defaultHeight: '13rem',
})

const attrs = useAttrs()
const activeImageIndex = ref<number | null>(null)

const sourceImages = computed<Array<string | ContentImageItem>>(() =>
	parseContentImages(props.images),
)

const normalizedImages = computed(() =>
	sourceImages.value.map((image, index) =>
		normalizeContentImage(
			image,
			index,
			props.defaultWidth,
			props.defaultHeight,
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
	hasExplicitSizing.value
		? ['flex flex-wrap justify-center gap-4', attrs.class]
		: ['grid gap-4 justify-items-center', attrs.class],
)

const itemClass = computed(() =>
	hasExplicitSizing.value ? 'flex-none' : 'w-full',
)

const gridAttrs = computed(() => {
	const { class: _class, ...restAttrs } = attrs

	return restAttrs
})

const openPreview = (index: number): void => {
	activeImageIndex.value = index
}

const handlePreviewOpenChange = (open: boolean): void => {
	if (!open) {
		activeImageIndex.value = null
	}
}
</script>
