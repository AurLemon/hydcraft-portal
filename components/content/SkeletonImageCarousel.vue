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
					v-for="(image, index) in normalizedImages"
					:key="`${image.src}-${index}`"
					class="m-0 shrink-0"
					:style="{ width: image.width }"
				>
					<div
						class="overflow-hidden rounded-2xl select-none"
						:style="{ height: image.height }"
					>
						<SkeletonImage
							v-if="loadedImageIndexes.has(index)"
							:src="image.src"
							:alt="image.alt"
							class="h-full w-full"
							image-class="block h-full w-full object-cover transition-opacity duration-200"
						/>
						<USkeleton v-else class="h-full w-full" />
					</div>
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
			class="pointer-events-none absolute inset-y-0 left-0 w-16 bg-linear-to-r from-white to-transparent opacity-0 transition-opacity duration-200 dark:from-slate-950"
			:class="{ 'opacity-100': canScrollLeft }"
		/>
		<div
			class="pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-l from-white to-transparent opacity-0 transition-opacity duration-200 dark:from-slate-950"
			:class="{ 'opacity-100': canScrollRight }"
		/>

		<button
			type="button"
			class="absolute top-1/2 left-3 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-lg ring-1 ring-slate-200/80 backdrop-blur transition duration-200 hover:bg-white hover:text-slate-950 dark:bg-slate-950/80 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-slate-950 dark:hover:text-slate-50"
			:class="
				canScrollLeft
					? 'scale-100 opacity-100'
					: 'pointer-events-none scale-90 opacity-0'
			"
			aria-label="Scroll images left"
			@click="scrollImages('left')"
		>
			<UIcon name="i-lucide-chevron-left" class="text-xl" />
		</button>
		<button
			type="button"
			class="absolute top-1/2 right-3 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-lg ring-1 ring-slate-200/80 backdrop-blur transition duration-200 hover:bg-white hover:text-slate-950 dark:bg-slate-950/80 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-slate-950 dark:hover:text-slate-50"
			:class="
				canScrollRight
					? 'scale-100 opacity-100'
					: 'pointer-events-none scale-90 opacity-0'
			"
			aria-label="Scroll images right"
			@click="scrollImages('right')"
		>
			<UIcon name="i-lucide-chevron-right" class="text-xl" />
		</button>
	</div>
</template>

<script setup lang="ts">
type ScrollDirection = 'left' | 'right'

const carouselMaskWidthPx = 64
const carouselMaskWidth = '4rem'

const contentImageModules = import.meta.glob<string>(
	'~/assets/resources/content/**/*.{avif,gif,jpeg,jpg,png,svg,webp}',
	{
		eager: true,
		import: 'default',
	},
)

interface ContentSkeletonImageCarouselItem {
	src: string
	alt?: string
	caption?: string
	width?: string
	height?: string
}

interface ContentSkeletonImageCarouselProps {
	images?: string | Array<string | ContentSkeletonImageCarouselItem>
}

interface NormalizedContentSkeletonImageCarouselItem {
	src: string
	alt: string
	caption: string
	width: string
	height: string
}

const props = withDefaults(defineProps<ContentSkeletonImageCarouselProps>(), {
	images: () => [],
})

const scrollContainer = ref<HTMLDivElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
const loadedImageIndexes = ref<Set<number>>(new Set())

const contentImageMap = Object.fromEntries(
	Object.entries(contentImageModules).flatMap(([path, url]) => {
		const normalizedPath = path
			.replace(/^.*\/assets\/resources\/content\//, '')
			.replace(/^\//, '')
		const filename = normalizedPath.split('/').at(-1) ?? normalizedPath

		return [
			[normalizedPath, url],
			[`content/${normalizedPath}`, url],
			[filename, url],
		]
	}),
) as Record<string, string>

const resolveImageSrc = (src: string): string => {
	return contentImageMap[src] ?? src
}

const normalizeImage = (
	image: string | ContentSkeletonImageCarouselItem,
	index: number,
): NormalizedContentSkeletonImageCarouselItem => {
	if (typeof image === 'string') {
		return {
			src: resolveImageSrc(image),
			alt: `Content image ${index + 1}`,
			caption: '',
			width: 'min(78vw, 28rem)',
			height: '13rem',
		}
	}

	return {
		src: resolveImageSrc(image.src),
		alt: image.alt ?? `Content image ${index + 1}`,
		caption: image.caption ?? '',
		width: image.width ?? 'min(78vw, 28rem)',
		height: image.height ?? '13rem',
	}
}

const sourceImages = computed<Array<string | ContentSkeletonImageCarouselItem>>(
	() => {
		if (typeof props.images !== 'string') {
			return props.images
		}

		try {
			const parsedImages: unknown = JSON.parse(props.images)

			if (Array.isArray(parsedImages)) {
				return parsedImages.filter(
					(image): image is string | ContentSkeletonImageCarouselItem =>
						typeof image === 'string' ||
						(typeof image === 'object' &&
							image !== null &&
							typeof (image as ContentSkeletonImageCarouselItem).src ===
								'string'),
				)
			}
		} catch {
			return [props.images]
		}

		return [props.images]
	},
)

const normalizedImages = computed(() => sourceImages.value.map(normalizeImage))

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

	const maxScrollLeft = container.scrollWidth - container.clientWidth
	canScrollLeft.value = container.scrollLeft > 1
	canScrollRight.value = container.scrollLeft < maxScrollLeft - 1
}

const getCarouselItemElements = (container: HTMLDivElement): HTMLElement[] => {
	return Array.from(container.querySelectorAll<HTMLElement>('figure'))
}

const loadVisibleImages = (): void => {
	const container = scrollContainer.value

	if (!container) {
		return
	}

	const itemElements = getCarouselItemElements(container)

	if (!itemElements.length) {
		return
	}

	const viewportStart = container.scrollLeft
	const viewportEnd = viewportStart + container.clientWidth
	const itemScrollOffsets = getItemScrollOffsets(container, itemElements)
	const nextLoadedImageIndexes = new Set(loadedImageIndexes.value)

	itemElements.forEach((element, index) => {
		const itemStart = itemScrollOffsets[index] ?? 0
		const itemEnd = itemStart + element.offsetWidth
		const isVisible = itemStart < viewportEnd && itemEnd > viewportStart

		if (isVisible) {
			nextLoadedImageIndexes.add(index)
		}
	})

	loadedImageIndexes.value = nextLoadedImageIndexes
}

const handleScroll = (): void => {
	updateScrollState()
	loadVisibleImages()
}

const syncCarouselLayout = async (): Promise<void> => {
	await nextTick()
	handleScroll()
}

const handleResize = (): void => {
	void syncCarouselLayout()
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
	const targetIndex = getTargetItemIndex(
		itemCenters,
		currentViewportCenter,
		direction,
	)
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

onMounted(() => {
	void syncCarouselLayout()
	window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
	window.removeEventListener('resize', handleResize)
})

watch(normalizedImages, async () => {
	loadedImageIndexes.value = new Set()
	await syncCarouselLayout()
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
