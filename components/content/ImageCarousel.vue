<template>
	<div class="relative my-6 w-[min(calc(100vw-2rem),48rem)] max-w-full min-w-0">
		<div
			ref="scrollContainer"
			class="skeleton-image-carousel-scroll overflow-x-auto overflow-y-hidden"
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
						class="block w-full cursor-zoom-in overflow-hidden rounded-2xl select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
						:style="{ height: image.height }"
						:aria-label="`Open image preview: ${image.alt}`"
						@click="openPreview(image.sourceIndex)"
					>
						<DeferredSkeletonImage
							:src="image.src"
							:alt="image.alt"
							:root="scrollContainer"
							class="h-full w-full"
							image-class="block h-full w-full object-cover transition-opacity duration-200"
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
			class="pointer-events-none absolute inset-y-0 left-0 w-16 bg-linear-to-r from-[#FAFAFA] to-transparent opacity-0 transition-opacity duration-200 dark:from-[#192024]"
			:class="{ 'opacity-100': canScrollLeft }"
		/>
		<div
			class="pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-l from-[#FAFAFA] to-transparent opacity-0 transition-opacity duration-200 dark:from-[#192024]"
			:class="{ 'opacity-100': canScrollRight }"
		/>

		<button
			type="button"
			class="absolute top-1/2 left-3 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-lg ring-1 ring-slate-200/80 backdrop-blur transition duration-200 hover:bg-white hover:text-slate-950 dark:bg-slate-950/80 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-slate-950 dark:hover:text-slate-50"
			:class="leftButtonClass"
			aria-label="Scroll images left"
			@click="scrollImages('left')"
		>
			<UIcon name="i-lucide-chevron-left" class="text-xl" />
		</button>
		<button
			type="button"
			class="absolute top-1/2 right-3 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-lg ring-1 ring-slate-200/80 backdrop-blur transition duration-200 hover:bg-white hover:text-slate-950 dark:bg-slate-950/80 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-slate-950 dark:hover:text-slate-50"
			:class="rightButtonClass"
			aria-label="Scroll images right"
			@click="scrollImages('right')"
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
import {
	normalizeContentImage,
	parseContentImages,
	type ContentImageItem,
} from './utils/content-image'

type ScrollDirection = 'left' | 'right'

const carouselMaskWidthPx = 64
const carouselMaskWidth = '4rem'

interface ContentImageCarouselProps {
	images?: string | Array<string | ContentImageItem>
	cycle?: boolean | string
	defaultWidth?: string
	defaultHeight?: string
}

const props = withDefaults(defineProps<ContentImageCarouselProps>(), {
	images: () => [],
	cycle: false,
	defaultWidth: 'min(78vw, 28rem)',
	defaultHeight: '13rem',
})

const scrollContainer = ref<HTMLDivElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
const currentImageIndex = ref(0)
const activeImageIndex = ref<number | null>(null)
const isAdjustingLoopPosition = ref(false)
const loopSyncFrameId = ref<number | null>(null)

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

const cycleEnabled = computed(() => {
	return normalizedImages.value.length > 1
})

const buttonAlwaysVisible = computed(() => {
	if (typeof props.cycle === 'string') {
		return props.cycle !== 'false'
	}

	return props.cycle !== false
})

interface CarouselImageItem extends ReturnType<typeof normalizeContentImage> {
	sourceIndex: number
}

const carouselImages = computed<CarouselImageItem[]>(() => {
	const images = normalizedImages.value.map((image, index) => ({
		...image,
		sourceIndex: index,
	}))

	if (!cycleEnabled.value || images.length <= 1) {
		return images
	}

	return [...images, ...images, ...images]
})

const activeImage = computed(() =>
	activeImageIndex.value === null
		? null
		: (normalizedImages.value[activeImageIndex.value] ?? null),
)

const getCarouselSidePadding = (itemWidth?: string): string => {
	if (!itemWidth) {
		return '0px'
	}

	return `max(calc((100% - ${carouselMaskWidth} - ${itemWidth}) / 2), 0px)`
}

const carouselSidePaddingLeft = computed(() =>
	getCarouselSidePadding(normalizedImages.value[0]?.width),
)
const carouselSidePaddingRight = computed(() =>
	getCarouselSidePadding(normalizedImages.value.at(-1)?.width),
)

const updateScrollState = (): void => {
	const container = scrollContainer.value

	if (!container) {
		canScrollLeft.value = false
		canScrollRight.value = false
		return
	}

	if (normalizedImages.value.length > 1) {
		canScrollLeft.value = true
		canScrollRight.value = true
		return
	}

	const maxScrollLeft = container.scrollWidth - container.clientWidth
	canScrollLeft.value = container.scrollLeft > 1
	canScrollRight.value = container.scrollLeft < maxScrollLeft - 1
}

const updateCurrentImageIndex = (): void => {
	const container = scrollContainer.value

	if (!container || !normalizedImages.value.length) {
		currentImageIndex.value = 0
		return
	}

	if (normalizedImages.value.length === 1) {
		currentImageIndex.value = 0
		return
	}

	const itemElements = getCarouselItemElements(container)
	const realItemStartIndex = getRealItemStartIndex()
	const itemScrollOffsets = getItemScrollOffsets(container, itemElements)
	const viewportCenter = container.scrollLeft + container.clientWidth / 2
	let nearestRealIndex = 0
	let nearestDistance = Number.POSITIVE_INFINITY

	for (let index = 0; index < normalizedImages.value.length; index += 1) {
		const realIndex = realItemStartIndex + index
		const element = itemElements[realIndex]
		const itemStart = itemScrollOffsets[realIndex]

		if (!element || itemStart === undefined) {
			continue
		}

		const itemCenter = itemStart + element.offsetWidth / 2
		const distance = Math.abs(itemCenter - viewportCenter)

		if (distance < nearestDistance) {
			nearestDistance = distance
			nearestRealIndex = index
		}
	}

	currentImageIndex.value = nearestRealIndex
}

const leftButtonClass = computed(() =>
	buttonAlwaysVisible.value || currentImageIndex.value > 0
		? 'scale-100 opacity-100'
		: 'pointer-events-none scale-90 opacity-0',
)

const rightButtonClass = computed(() =>
	buttonAlwaysVisible.value ||
	currentImageIndex.value < normalizedImages.value.length - 1
		? 'scale-100 opacity-100'
		: 'pointer-events-none scale-90 opacity-0',
)

const getCarouselItemElements = (container: HTMLDivElement): HTMLElement[] => {
	return Array.from(container.querySelectorAll<HTMLElement>('figure'))
}

const queueLoopPositionSync = (): void => {
	if (loopSyncFrameId.value !== null) {
		window.cancelAnimationFrame(loopSyncFrameId.value)
	}

	loopSyncFrameId.value = window.requestAnimationFrame(() => {
		loopSyncFrameId.value = null
		syncLoopPosition()
	})
}

const handleScroll = (): void => {
	if (cycleEnabled.value) {
		queueLoopPositionSync()
	}

	updateScrollState()
	updateCurrentImageIndex()
}

const syncCarouselLayout = async (): Promise<void> => {
	await nextTick()
	handleScroll()
}

const handleResize = (): void => {
	void syncCarouselLayout()
}

const setScrollPosition = (
	left: number,
	behavior: ScrollBehavior = 'auto',
): void => {
	const container = scrollContainer.value

	if (!container) {
		return
	}

	container.scrollTo({
		left,
		behavior,
	})
}

const getItemScrollOffsets = (
	container: HTMLDivElement,
	itemElements: HTMLElement[],
): number[] => {
	const containerRect = container.getBoundingClientRect()

	return itemElements.map((element) =>
		Math.max(
			element.getBoundingClientRect().left -
				containerRect.left +
				container.scrollLeft,
			0,
		),
	)
}

const getCenteredScrollLeft = (
	container: HTMLDivElement,
	element: HTMLElement,
	itemStart: number,
): number => {
	const maxScrollLeft = container.scrollWidth - container.clientWidth
	const itemEnd = itemStart + element.offsetWidth
	const itemCenter = itemStart + element.offsetWidth / 2
	let targetScrollLeft = Math.min(
		Math.max(itemCenter - container.clientWidth / 2, 0),
		maxScrollLeft,
	)
	const targetCanScrollLeft = targetScrollLeft > 1
	const targetCanScrollRight = targetScrollLeft < maxScrollLeft - 1
	const safeLeft = targetCanScrollLeft ? carouselMaskWidthPx : 0
	const safeRight = targetCanScrollRight ? carouselMaskWidthPx : 0
	const safeViewportStart = targetScrollLeft + safeLeft
	const safeViewportEnd = targetScrollLeft + container.clientWidth - safeRight

	if (itemStart < safeViewportStart) {
		targetScrollLeft = itemStart - safeLeft
	}

	if (itemEnd > safeViewportEnd) {
		targetScrollLeft = itemEnd - container.clientWidth + safeRight
	}

	return Math.min(Math.max(targetScrollLeft, 0), maxScrollLeft)
}

const getTargetItemIndex = (
	itemCenters: number[],
	currentViewportCenter: number,
	direction: ScrollDirection,
): number => {
	if (direction === 'right') {
		return itemCenters.findIndex((center) => center > currentViewportCenter + 1)
	}

	for (let index = itemCenters.length - 1; index >= 0; index -= 1) {
		const center = itemCenters[index]

		if (center !== undefined && center < currentViewportCenter - 1) {
			return index
		}
	}

	return -1
}

const getRealItemStartIndex = (): number => {
	return cycleEnabled.value && normalizedImages.value.length > 1
		? normalizedImages.value.length
		: 0
}

const syncLoopPosition = (): void => {
	const container = scrollContainer.value

	if (
		!container ||
		!cycleEnabled.value ||
		normalizedImages.value.length <= 1 ||
		isAdjustingLoopPosition.value
	) {
		return
	}

	const itemElements = getCarouselItemElements(container)
	const realItemStartIndex = getRealItemStartIndex()
	const firstRealItem = itemElements[realItemStartIndex]

	if (!firstRealItem) {
		return
	}

	const itemScrollOffsets = getItemScrollOffsets(container, itemElements)
	const firstRealItemStart = itemScrollOffsets[realItemStartIndex]
	const middleViewportCenter = container.scrollLeft + container.clientWidth / 2
	const itemCenters = itemElements.map((element, index) => {
		const itemStart = itemScrollOffsets[index] ?? 0

		return itemStart + element.offsetWidth / 2
	})
	const nearestItemIndex = itemCenters.reduce((bestIndex, center, index) => {
		const bestCenter = itemCenters[bestIndex] ?? 0

		return Math.abs(center - middleViewportCenter) <
			Math.abs(bestCenter - middleViewportCenter)
			? index
			: bestIndex
	}, 0)

	if (firstRealItemStart === undefined) {
		return
	}

	if (nearestItemIndex < realItemStartIndex) {
		const normalizedIndex = nearestItemIndex % normalizedImages.value.length
		const targetIndex = realItemStartIndex + normalizedIndex
		const targetElement = itemElements[targetIndex]
		const targetItemStart = itemScrollOffsets[targetIndex]

		if (!targetElement || targetItemStart === undefined) {
			return
		}

		const targetScrollLeft = getCenteredScrollLeft(
			container,
			targetElement,
			targetItemStart,
		)
		isAdjustingLoopPosition.value = true
		setScrollPosition(targetScrollLeft, 'auto')
		requestAnimationFrame(() => {
			isAdjustingLoopPosition.value = false
			updateScrollState()
		})
		return
	}

	if (
		nearestItemIndex >
		realItemStartIndex + normalizedImages.value.length - 1
	) {
		const normalizedIndex = nearestItemIndex % normalizedImages.value.length
		const targetIndex = realItemStartIndex + normalizedIndex
		const targetElement = itemElements[targetIndex]
		const targetItemStart = itemScrollOffsets[targetIndex]

		if (!targetElement || targetItemStart === undefined) {
			return
		}

		const targetScrollLeft = getCenteredScrollLeft(
			container,
			targetElement,
			targetItemStart,
		)
		isAdjustingLoopPosition.value = true
		setScrollPosition(targetScrollLeft, 'auto')
		requestAnimationFrame(() => {
			isAdjustingLoopPosition.value = false
			updateScrollState()
		})
	}
}

const initializeLoopPosition = async (): Promise<void> => {
	await nextTick()

	const container = scrollContainer.value

	if (!container || normalizedImages.value.length <= 1) {
		handleScroll()
		return
	}

	const itemElements = getCarouselItemElements(container)
	const realItemStartIndex = getRealItemStartIndex()
	const firstRealItem = itemElements[realItemStartIndex]

	if (!firstRealItem) {
		handleScroll()
		return
	}

	const itemScrollOffsets = getItemScrollOffsets(container, itemElements)
	const firstRealItemStart = itemScrollOffsets[realItemStartIndex] ?? 0
	const targetScrollLeft = getCenteredScrollLeft(
		container,
		firstRealItem,
		firstRealItemStart,
	)
	setScrollPosition(targetScrollLeft, 'auto')
	handleScroll()
}

const scrollImages = (direction: ScrollDirection): void => {
	const container = scrollContainer.value

	if (!container) {
		return
	}

	const itemElements = getCarouselItemElements(container)

	if (!itemElements.length) {
		return
	}

	const currentScrollLeft = container.scrollLeft
	const maxScrollLeft = container.scrollWidth - container.clientWidth
	const itemScrollOffsets = getItemScrollOffsets(container, itemElements)
	const currentViewportCenter = currentScrollLeft + container.clientWidth / 2
	const itemCenters = itemElements.map((element, index) => {
		const itemStart = itemScrollOffsets[index] ?? 0

		return itemStart + element.offsetWidth / 2
	})
	let targetIndex = getTargetItemIndex(
		itemCenters,
		currentViewportCenter,
		direction,
	)
	if (targetIndex === -1 && normalizedImages.value.length > 1) {
		targetIndex = direction === 'left' ? itemElements.length - 2 : 1
	}

	const targetSourceIndex =
		carouselImages.value[targetIndex]?.sourceIndex ?? currentImageIndex.value

	currentImageIndex.value = targetSourceIndex
	const targetElement = itemElements[targetIndex]
	const targetScrollLeft = targetElement
		? getCenteredScrollLeft(
				container,
				targetElement,
				itemScrollOffsets[targetIndex] ?? 0,
			)
		: direction === 'left'
			? 0
			: maxScrollLeft

	container.scrollTo({
		left: targetScrollLeft,
		behavior: 'smooth',
	})
}

const openPreview = (index: number): void => {
	activeImageIndex.value = index
}

const handlePreviewOpenChange = (open: boolean): void => {
	if (!open) {
		activeImageIndex.value = null
	}
}

onMounted(() => {
	void initializeLoopPosition()
	window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
	window.removeEventListener('resize', handleResize)

	if (loopSyncFrameId.value !== null) {
		window.cancelAnimationFrame(loopSyncFrameId.value)
	}
})

watch(normalizedImages, async () => {
	await initializeLoopPosition()
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
