<template>
	<div class="my-6 max-w-full min-w-0">
		<div class="relative">
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
						class="m-0 flex min-w-0 shrink-0 flex-col"
						:class="getFigureClass()"
						:style="getFigureStyle(image)"
					>
						<button
							type="button"
							:class="getButtonClass(index)"
							:style="getButtonStyle(image)"
							:aria-label="
								t('content.imageCarousel.openPreview', { alt: image.alt })
							"
							@click="openPreview(image.sourceIndex, index)"
						>
							<DeferredSkeletonImage
								:src="image.src"
								:alt="image.alt"
								:root="scrollContainer"
								:class="getImageWrapperClass()"
								:image-class="getImageClass()"
								@ready="handleImageReady(image, $event)"
							/>
						</button>
						<figcaption
							v-if="!caption && !isLoopDecorationItem(index) && image.caption"
							class="mt-2 w-0 min-w-full text-center text-sm leading-6 text-slate-500 break-words [overflow-wrap:anywhere] dark:text-slate-400"
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
				class="absolute left-3 z-20 flex h-10 w-10 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-lg ring-1 ring-slate-200/80 backdrop-blur transition duration-200 hover:bg-white hover:text-slate-950 dark:bg-slate-950/80 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-slate-950 dark:hover:text-slate-50"
				:class="[navigationButtonClass, leftButtonClass]"
				:style="navigationButtonStyle"
				:aria-label="t('content.imageCarousel.scrollLeft')"
				@click.stop="scrollImages('left')"
			>
				<UIcon name="i-lucide-chevron-left" class="text-xl" />
			</button>
			<button
				type="button"
				class="absolute right-3 z-20 flex h-10 w-10 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-lg ring-1 ring-slate-200/80 backdrop-blur transition duration-200 hover:bg-white hover:text-slate-950 dark:bg-slate-950/80 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-slate-950 dark:hover:text-slate-50"
				:class="[navigationButtonClass, rightButtonClass]"
				:style="navigationButtonStyle"
				:aria-label="t('content.imageCarousel.scrollRight')"
				@click.stop="scrollImages('right')"
			>
				<UIcon name="i-lucide-chevron-right" class="text-xl" />
			</button>
		</div>

		<figcaption
			v-if="caption"
			class="mt-2 text-center text-sm leading-6 text-slate-500 dark:text-slate-400"
		>
			{{ caption }}
		</figcaption>
	</div>

	<ContentImageLightbox
		:open="activeImageIndex !== null"
		:image="activeImage"
		@update:open="handlePreviewOpenChange"
	/>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { useImageCarouselState } from '~/composables/useImageCarouselState'
import type {
	ContentImageItem,
	NormalizedContentImageItem,
} from './utils/content-image'

type ResponsiveImageStyle = CSSProperties & Record<`--${string}`, string>

interface ContentImageCarouselProps {
	images?: string | Array<string | ContentImageItem>
	cycle?: boolean | string
	reverse?: boolean | string
	height?: string
	mobileWidth?: string
	mobileHeight?: string
	defaultWidth?: string
	defaultHeight?: string
	heightMode?: 'fixed' | 'auto'
	widthMode?: 'fixed' | 'auto'
	caption?: string
}

const props = withDefaults(defineProps<ContentImageCarouselProps>(), {
	images: () => [],
	cycle: false,
	reverse: false,
	height: '',
	mobileWidth: '',
	mobileHeight: '',
	defaultWidth: 'min(78vw, 28rem)',
	defaultHeight: '13rem',
	heightMode: 'fixed',
	widthMode: 'fixed',
	caption: '',
})

const { t } = useI18n()
const resolvedDefaultHeight = computed(
	() => props.height || props.defaultHeight,
)
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
	isLoopDecorationItem,
	leftButtonClass,
	notifyLayoutChange,
	openPreview,
	rightButtonClass,
	scrollContainer,
	scrollImages,
} = useImageCarouselState({
	images: toRef(props, 'images'),
	cycle: toRef(props, 'cycle'),
	reverse: toRef(props, 'reverse'),
	defaultWidth: toRef(props, 'defaultWidth'),
	defaultHeight: resolvedDefaultHeight,
})

const isAutoHeight = computed(() => props.heightMode === 'auto')
const isAutoWidth = computed(
	() => props.heightMode !== 'auto' && props.widthMode === 'auto',
)
const imageAspectRatioMap = ref<Record<string, number>>({})

const getImageAspectRatio = (image: NormalizedContentImageItem): number => {
	return imageAspectRatioMap.value[image.src] ?? image.aspectRatio ?? 1
}

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
		const aspectRatio = getImageAspectRatio(image)

		style.aspectRatio = `${aspectRatio}`
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
	notifyLayoutChange()
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
		const aspectRatio = getImageAspectRatio(image)

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

const getButtonClass = (displayIndex: number): string =>
	[
		isAutoWidth.value ? 'block w-full' : 'block w-full',
		!isAutoHeight.value ? 'content-image-height-bound' : '',
		isLoopDecorationItem(displayIndex)
			? 'content-image-carousel-loop-item'
			: 'content-image-carousel-primary-item',
		'overflow-hidden rounded-2xl select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400',
		canPreviewCarouselItem(displayIndex) ? 'cursor-zoom-in' : 'cursor-default',
	].join(' ')

const getImageWrapperClass = (): string =>
	isAutoHeight.value
		? 'w-full'
		: isAutoWidth.value
			? 'h-full w-full'
			: 'h-full w-full'

const navigationButtonClass = computed(() =>
	isAutoHeight.value ? 'top-1/2' : 'content-image-carousel-nav-button',
)

const navigationButtonStyle = computed<ResponsiveImageStyle>(() => {
	if (isAutoHeight.value) {
		return {}
	}

	const style: ResponsiveImageStyle = {
		'--content-image-nav-height': resolvedDefaultHeight.value,
	}

	if (props.mobileHeight) {
		style['--content-image-nav-mobile-height'] = props.mobileHeight
	}

	return style
})
</script>

<style scoped>
.skeleton-image-carousel-scroll {
	scrollbar-width: none;
}

.skeleton-image-carousel-scroll::-webkit-scrollbar {
	display: none;
}

.content-image-width-bound {
	width: var(--content-image-width);
	flex: 0 0 var(--content-image-width);
}

.content-image-auto-width-bound {
	width: var(--content-image-width);
	flex: 0 0 var(--content-image-width);
}

.content-image-height-bound {
	height: var(--content-image-height);
}

.content-image-carousel-primary-item {
	opacity: 1;
	filter: none;
}

.content-image-carousel-loop-item {
	opacity: 0.48;
	filter: grayscale(0.22) saturate(0.72) brightness(0.9);
}

.content-image-carousel-nav-button {
	top: calc(var(--content-image-nav-height) / 2);
}

@media (max-width: 767.98px) {
	.content-image-carousel-nav-button {
		top: calc(
			var(--content-image-nav-mobile-height, var(--content-image-nav-height)) /
				2
		);
	}

	.content-image-width-bound {
		width: var(--content-image-mobile-width, var(--content-image-width));
		flex-basis: var(--content-image-mobile-width, var(--content-image-width));
	}

	.content-image-auto-width-bound {
		width: var(--content-image-mobile-width, var(--content-image-width));
		flex-basis: var(--content-image-mobile-width, var(--content-image-width));
	}

	.content-image-height-bound {
		height: var(--content-image-mobile-height, var(--content-image-height));
	}
}
</style>
