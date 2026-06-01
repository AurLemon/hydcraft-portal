<template>
	<div class="my-6 w-[min(calc(100vw-2rem),48rem)] max-w-full min-w-0">
		<div class="grid gap-4" :class="gridClass" v-bind="gridAttrs">
			<figure
				v-for="(image, index) in normalizedImages"
				:key="`${image.src}-${index}`"
				class="m-0 min-w-0"
				:style="{ width: image.width }"
			>
				<button
					type="button"
					class="block w-full cursor-zoom-in overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
					:style="{ height: image.height }"
					:aria-label="`Open image preview: ${image.alt}`"
					@click="openPreview(index)"
				>
					<SkeletonImage
						:src="image.src"
						:alt="image.alt"
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
}

const props = withDefaults(defineProps<ContentImageGridProps>(), {
	images: () => [],
})

const attrs = useAttrs()
const activeImageIndex = ref<number | null>(null)

const sourceImages = computed<Array<string | ContentImageItem>>(() =>
	parseContentImages(props.images),
)

const normalizedImages = computed(() =>
	sourceImages.value.map((image, index) =>
		normalizeContentImage(image, index, '100%', '13rem'),
	),
)

const activeImage = computed(() =>
	activeImageIndex.value === null
		? null
		: (normalizedImages.value[activeImageIndex.value] ?? null),
)

const gridClass = computed(() => attrs.class)
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
