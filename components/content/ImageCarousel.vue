<template>
	<div class="relative my-6 w-[min(calc(100vw-2rem),48rem)] max-w-full min-w-0">
		<div
			ref="scrollContainer"
			class="skeleton-image-carousel-scroll relative z-0 overflow-x-auto overflow-y-hidden"
			@scroll="handleScroll"
		>
			<div
				class="flex w-max gap-4"
				:style="{
					paddingLeft: carouselSidePaddingLeft,
					paddingRight: carouselSidePaddingRight,
				}"
			>
				<figure
					v-for="(image, index) in carouselImages"
					:key="`${image.src}-${image.sourceIndex}-${index}`"
					class="m-0 shrink-0"
					:style="{ width: image.width }"
				>
					<button
						type="button"
						class="block w-full overflow-hidden rounded-2xl select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
						:class="
							canPreviewCarouselItem(index)
								? 'cursor-zoom-in'
								: 'cursor-default'
						"
						:style="{ height: image.height }"
						:aria-label="
							t('content.imageCarousel.openPreview', { alt: image.alt })
						"
						@click="openPreview(image.sourceIndex, index)"
					>
						<DeferredSkeletonImage
							:src="image.src"
							:alt="image.alt"
							:root="scrollContainer"
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

		<div
			class="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-linear-to-r from-[#FAFAFA] to-transparent opacity-0 transition-opacity duration-200 dark:from-[#192024]"
			:class="{ 'opacity-100': canScrollLeft }"
		/>
		<div
			class="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-linear-to-l from-[#FAFAFA] to-transparent opacity-0 transition-opacity duration-200 dark:from-[#192024]"
			:class="{ 'opacity-100': canScrollRight }"
		/>

		<button
			type="button"
			class="absolute top-1/2 left-3 z-20 flex h-10 w-10 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-lg ring-1 ring-slate-200/80 backdrop-blur transition duration-200 hover:bg-white hover:text-slate-950 dark:bg-slate-950/80 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-slate-950 dark:hover:text-slate-50"
			:class="leftButtonClass"
			:aria-label="t('content.imageCarousel.scrollLeft')"
			@click.stop="scrollImages('left')"
		>
			<UIcon name="i-lucide-chevron-left" class="text-xl" />
		</button>
		<button
			type="button"
			class="absolute top-1/2 right-3 z-20 flex h-10 w-10 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-lg ring-1 ring-slate-200/80 backdrop-blur transition duration-200 hover:bg-white hover:text-slate-950 dark:bg-slate-950/80 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-slate-950 dark:hover:text-slate-50"
			:class="rightButtonClass"
			:aria-label="t('content.imageCarousel.scrollRight')"
			@click.stop="scrollImages('right')"
		>
			<UIcon name="i-lucide-chevron-right" class="text-xl" />
		</button>
	</div>

	<ContentImageLightbox
		:open="activeImageIndex !== null"
		:image="activeImage"
		@update:open="handlePreviewOpenChange"
	/>
</template>

<script setup lang="ts">
import { useImageCarouselState } from '~/composables/useImageCarouselState'
import type { ContentImageItem } from './utils/content-image'

interface ContentImageCarouselProps {
	images?: string | Array<string | ContentImageItem>
	cycle?: boolean | string
	reverse?: boolean | string
	defaultWidth?: string
	defaultHeight?: string
}

const props = withDefaults(defineProps<ContentImageCarouselProps>(), {
	images: () => [],
	cycle: false,
	reverse: false,
	defaultWidth: 'min(78vw, 28rem)',
	defaultHeight: '13rem',
})

const { t } = useI18n()
const {
	activeImage,
	activeImageIndex,
	canPreviewCarouselItem,
	canScrollLeft,
	canScrollRight,
	carouselImages,
	carouselSidePaddingLeft,
	carouselSidePaddingRight,
	handlePreviewOpenChange,
	handleScroll,
	leftButtonClass,
	openPreview,
	rightButtonClass,
	scrollContainer,
	scrollImages,
} = useImageCarouselState({
	images: toRef(props, 'images'),
	cycle: toRef(props, 'cycle'),
	reverse: toRef(props, 'reverse'),
	defaultWidth: toRef(props, 'defaultWidth'),
	defaultHeight: toRef(props, 'defaultHeight'),
})
</script>

<style scoped>
.skeleton-image-carousel-scroll {
	scrollbar-width: none;
}

.skeleton-image-carousel-scroll::-webkit-scrollbar {
	display: none;
}
</style>
