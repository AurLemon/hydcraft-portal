import {
	normalizeContentImage,
	parseContentImages,
	type ContentImageItem,
} from '~/components/content/utils/content-image'

type ScrollDirection = 'left' | 'right'
type ScrollMode = 'idle' | 'button' | 'jump' | 'manual'

interface ImageCarouselStateOptions {
	images: Ref<string | Array<string | ContentImageItem> | undefined>
	cycle: Ref<boolean | string | undefined>
	reverse: Ref<boolean | string | undefined>
	defaultWidth: Ref<string>
	defaultHeight: Ref<string>
}

interface CarouselImageItem extends ReturnType<typeof normalizeContentImage> {
	sourceIndex: number
}

const MANUAL_SCROLL_SETTLE_MS = 120

export const useImageCarouselState = (options: ImageCarouselStateOptions) => {
	const scrollContainer = ref<HTMLDivElement | null>(null)
	const currentImageIndex = ref(0)
	const activeImageIndex = ref<number | null>(null)
	const canScrollLeft = ref(false)
	const canScrollRight = ref(false)
	const scrollMode = ref<ScrollMode>('idle')
	const hasUserNavigated = ref(false)
	const pendingLayoutSync = ref(false)
	const resizeFrameId = ref<number | null>(null)
	const settleFrameId = ref<number | null>(null)
	const manualScrollTimeoutId = ref<number | null>(null)
	const programmaticScrollTimeoutId = ref<number | null>(null)
	const settleTimeoutIds = new Set<number>()
	let carouselResizeObserver: ResizeObserver | null = null

	const sourceImages = computed<Array<string | ContentImageItem>>(() =>
		parseContentImages(options.images.value ?? []),
	)
	const reverseEnabled = computed(() => {
		if (typeof options.reverse.value === 'string') {
			return options.reverse.value !== 'false'
		}

		return options.reverse.value !== false
	})
	const orderedSourceImages = computed(() => {
		const images = sourceImages.value.map((image, index) => ({
			image,
			sourceIndex: index,
		}))

		return reverseEnabled.value ? [...images].reverse() : images
	})
	const orderedNormalizedImages = computed<CarouselImageItem[]>(() =>
		orderedSourceImages.value.map(({ image, sourceIndex }, index) => ({
			...normalizeContentImage(
				image,
				index,
				options.defaultWidth.value,
				options.defaultHeight.value,
			),
			sourceIndex,
		})),
	)
	const normalizedImages = computed(() =>
		orderedNormalizedImages.value.map(({ sourceIndex: _, ...image }) => image),
	)
	const cycleEnabled = computed(() => normalizedImages.value.length > 1)
	const buttonAlwaysVisible = computed(() => {
		if (typeof options.cycle.value === 'string') {
			return options.cycle.value !== 'false'
		}

		return options.cycle.value !== false
	})
	const carouselImages = computed<CarouselImageItem[]>(() => {
		const images = orderedNormalizedImages.value

		if (!cycleEnabled.value || images.length <= 1) {
			return images
		}

		return [...images, ...images, ...images]
	})
	const activeImage = computed(() =>
		activeImageIndex.value === null
			? null
			: (orderedNormalizedImages.value.find(
					(image) => image.sourceIndex === activeImageIndex.value,
				) ?? null),
	)

	const imageCount = computed(() => normalizedImages.value.length)

	const getRealItemStartIndex = (): number =>
		cycleEnabled.value && imageCount.value > 1 ? imageCount.value : 0

	const normalizeOrderedIndex = (index: number): number => {
		if (imageCount.value <= 0) {
			return 0
		}

		return ((index % imageCount.value) + imageCount.value) % imageCount.value
	}

	const getDisplayIndexForOrderedIndex = (
		orderedIndex: number,
		options?: {
			direction?: ScrollDirection
			fromOrderedIndex?: number
		},
	): number => {
		const realItemStartIndex = getRealItemStartIndex()
		const direction = options?.direction
		const fromOrderedIndex = options?.fromOrderedIndex ?? orderedIndex

		if (!cycleEnabled.value || imageCount.value <= 1) {
			return Math.min(
				Math.max(orderedIndex, 0),
				Math.max(imageCount.value - 1, 0),
			)
		}

		if (direction === 'left' && fromOrderedIndex === 0) {
			return realItemStartIndex - 1
		}

		if (direction === 'right' && fromOrderedIndex === imageCount.value - 1) {
			return realItemStartIndex + imageCount.value
		}

		return realItemStartIndex + orderedIndex
	}

	const getCarouselSidePadding = (itemWidth?: string): string => {
		if (!itemWidth) {
			return '0px'
		}

		return `max(calc((100% - ${itemWidth}) / 2), 0px)`
	}

	const carouselSidePaddingLeft = computed(() =>
		getCarouselSidePadding(normalizedImages.value[0]?.width),
	)
	const carouselSidePaddingRight = computed(() =>
		getCarouselSidePadding(normalizedImages.value.at(-1)?.width),
	)
	const leftButtonClass = computed(() =>
		buttonAlwaysVisible.value || currentImageIndex.value > 0
			? 'scale-100 opacity-100'
			: 'pointer-events-none scale-90 opacity-0',
	)
	const rightButtonClass = computed(() =>
		buttonAlwaysVisible.value || currentImageIndex.value < imageCount.value - 1
			? 'scale-100 opacity-100'
			: 'pointer-events-none scale-90 opacity-0',
	)

	const canPreviewCarouselItem = (displayIndex: number): boolean => {
		if (buttonAlwaysVisible.value || imageCount.value <= 1) {
			return true
		}

		const realItemStartIndex = getRealItemStartIndex()

		return (
			displayIndex >= realItemStartIndex &&
			displayIndex < realItemStartIndex + imageCount.value
		)
	}

	const isLoopDecorationItem = (displayIndex: number): boolean => {
		if (!cycleEnabled.value || imageCount.value <= 1) {
			return false
		}

		const realItemStartIndex = getRealItemStartIndex()

		return (
			displayIndex < realItemStartIndex ||
			displayIndex >= realItemStartIndex + imageCount.value
		)
	}

	const getCarouselItemElements = (container: HTMLDivElement): HTMLElement[] =>
		Array.from(container.querySelectorAll<HTMLElement>('figure'))

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
		const itemCenter = itemStart + element.offsetWidth / 2
		const targetScrollLeft = itemCenter - container.clientWidth / 2

		return Math.min(Math.max(targetScrollLeft, 0), maxScrollLeft)
	}

	const getNearestDisplayIndex = (
		container: HTMLDivElement,
		itemElements: HTMLElement[],
	): number => {
		const itemScrollOffsets = getItemScrollOffsets(container, itemElements)
		const viewportCenter = container.scrollLeft + container.clientWidth / 2

		return itemElements.reduce((bestIndex, element, index) => {
			const bestElement = itemElements[bestIndex]
			const currentStart = itemScrollOffsets[index] ?? 0
			const bestStart = itemScrollOffsets[bestIndex] ?? 0
			const currentDistance = Math.abs(
				currentStart + element.offsetWidth / 2 - viewportCenter,
			)
			const bestDistance = Math.abs(
				bestStart + (bestElement?.offsetWidth ?? 0) / 2 - viewportCenter,
			)

			return currentDistance < bestDistance ? index : bestIndex
		}, 0)
	}

	const updateScrollState = (): void => {
		if (imageCount.value <= 1) {
			const container = scrollContainer.value

			if (!container) {
				canScrollLeft.value = false
				canScrollRight.value = false
				return
			}

			const maxScrollLeft = container.scrollWidth - container.clientWidth
			canScrollLeft.value = container.scrollLeft > 1
			canScrollRight.value = container.scrollLeft < maxScrollLeft - 1
			return
		}

		canScrollLeft.value = true
		canScrollRight.value = true
	}

	const clearManualScrollTimeout = (): void => {
		if (manualScrollTimeoutId.value !== null) {
			clearTimeout(manualScrollTimeoutId.value)
			manualScrollTimeoutId.value = null
		}
	}

	const clearProgrammaticScrollTimeout = (): void => {
		if (programmaticScrollTimeoutId.value !== null) {
			clearTimeout(programmaticScrollTimeoutId.value)
			programmaticScrollTimeoutId.value = null
		}
	}

	const syncCurrentIndexFromViewport = (): void => {
		const container = scrollContainer.value

		if (!container || imageCount.value <= 1) {
			currentImageIndex.value = 0
			return
		}

		const itemElements = getCarouselItemElements(container)

		if (!itemElements.length) {
			return
		}

		const nearestDisplayIndex = getNearestDisplayIndex(container, itemElements)
		currentImageIndex.value = normalizeOrderedIndex(
			nearestDisplayIndex - getRealItemStartIndex(),
		)
	}

	const scrollToDisplayIndex = (
		displayIndex: number,
		behavior: ScrollBehavior,
		mode: Extract<ScrollMode, 'button' | 'jump'>,
	): void => {
		const container = scrollContainer.value

		if (!container) {
			return
		}

		const itemElements = getCarouselItemElements(container)
		const targetElement = itemElements[displayIndex]

		if (!targetElement) {
			return
		}

		const itemScrollOffsets = getItemScrollOffsets(container, itemElements)
		const targetScrollLeft = getCenteredScrollLeft(
			container,
			targetElement,
			itemScrollOffsets[displayIndex] ?? 0,
		)

		scrollMode.value = mode
		container.scrollTo({
			left: targetScrollLeft,
			behavior,
		})
		clearProgrammaticScrollTimeout()
		programmaticScrollTimeoutId.value = window.setTimeout(() => {
			programmaticScrollTimeoutId.value = null
			finalizeProgrammaticScroll()
		}, MANUAL_SCROLL_SETTLE_MS)
	}

	const centerCurrentImage = (
		behavior: ScrollBehavior = 'auto',
		mode: Extract<ScrollMode, 'button' | 'jump'> = 'jump',
	): void => {
		if (imageCount.value <= 0) {
			return
		}

		scrollToDisplayIndex(
			getDisplayIndexForOrderedIndex(currentImageIndex.value),
			behavior,
			mode,
		)
	}

	const flushPendingLayoutSync = (): void => {
		if (!pendingLayoutSync.value) {
			return
		}

		pendingLayoutSync.value = false
		void nextTick(() => {
			if (scrollMode.value !== 'idle') {
				pendingLayoutSync.value = true
				return
			}

			centerCurrentImage('auto', 'jump')
		})
	}

	const settleManualScroll = (): void => {
		if (scrollMode.value !== 'manual') {
			return
		}

		syncCurrentIndexFromViewport()
		scrollMode.value = 'idle'
		centerCurrentImage('smooth', 'jump')
	}

	const scheduleManualScrollSettle = (): void => {
		clearManualScrollTimeout()
		manualScrollTimeoutId.value = window.setTimeout(() => {
			manualScrollTimeoutId.value = null
			settleManualScroll()
		}, MANUAL_SCROLL_SETTLE_MS)
	}

	const finalizeProgrammaticScroll = (): void => {
		const mode = scrollMode.value

		if (mode !== 'button' && mode !== 'jump') {
			return
		}

		clearProgrammaticScrollTimeout()
		scrollMode.value = 'idle'
		const container = scrollContainer.value

		if (!container || imageCount.value <= 1) {
			updateScrollState()
			flushPendingLayoutSync()
			return
		}

		const itemElements = getCarouselItemElements(container)

		if (!itemElements.length) {
			flushPendingLayoutSync()
			return
		}

		const nearestDisplayIndex = getNearestDisplayIndex(container, itemElements)
		const realItemStartIndex = getRealItemStartIndex()

		if (
			nearestDisplayIndex < realItemStartIndex ||
			nearestDisplayIndex >= realItemStartIndex + imageCount.value
		) {
			centerCurrentImage('auto', 'jump')
			return
		}

		updateScrollState()
		flushPendingLayoutSync()
	}

	const handleScroll = (): void => {
		updateScrollState()

		if (scrollMode.value === 'button' || scrollMode.value === 'jump') {
			clearProgrammaticScrollTimeout()
			programmaticScrollTimeoutId.value = window.setTimeout(() => {
				programmaticScrollTimeoutId.value = null
				finalizeProgrammaticScroll()
			}, MANUAL_SCROLL_SETTLE_MS)
			return
		}

		hasUserNavigated.value = true
		scrollMode.value = 'manual'
		syncCurrentIndexFromViewport()
		scheduleManualScrollSettle()
	}

	const handleScrollEnd = (): void => {
		if (scrollMode.value === 'manual') {
			clearManualScrollTimeout()
			settleManualScroll()
			return
		}

		finalizeProgrammaticScroll()
	}

	const clearInitialSettleTasks = (): void => {
		if (settleFrameId.value !== null) {
			window.cancelAnimationFrame(settleFrameId.value)
			settleFrameId.value = null
		}

		for (const timeoutId of settleTimeoutIds) {
			clearTimeout(timeoutId)
		}

		settleTimeoutIds.clear()
	}

	const forceInitialPosition = (): void => {
		if (hasUserNavigated.value) {
			return
		}

		currentImageIndex.value = 0
		centerCurrentImage('auto', 'jump')
	}

	const scheduleInitialPositionSettle = (): void => {
		clearInitialSettleTasks()

		const settle = (): void => {
			if (hasUserNavigated.value || scrollMode.value !== 'idle') {
				return
			}

			forceInitialPosition()
		}

		settleFrameId.value = window.requestAnimationFrame(() => {
			settleFrameId.value = null
			settle()
		})

		for (const delay of [0, 80, 180, 320]) {
			const timeoutId = window.setTimeout(() => {
				settleTimeoutIds.delete(timeoutId)
				settle()
			}, delay)

			settleTimeoutIds.add(timeoutId)
		}
	}

	const syncCarouselLayout = async (): Promise<void> => {
		await nextTick()

		if (scrollMode.value !== 'idle') {
			pendingLayoutSync.value = true
			return
		}

		centerCurrentImage('auto', 'jump')
	}

	const handleResize = (): void => {
		if (resizeFrameId.value !== null) {
			window.cancelAnimationFrame(resizeFrameId.value)
		}

		resizeFrameId.value = window.requestAnimationFrame(() => {
			resizeFrameId.value = null
			void syncCarouselLayout()
		})
	}

	const notifyLayoutChange = (): void => {
		if (scrollMode.value !== 'idle') {
			pendingLayoutSync.value = true
			return
		}

		handleResize()
	}

	const initializeLoopPosition = async (): Promise<void> => {
		await nextTick()

		scrollMode.value = 'idle'
		currentImageIndex.value = 0
		updateScrollState()
		forceInitialPosition()
		scheduleInitialPositionSettle()
	}

	const handlePageShow = (): void => {
		scheduleInitialPositionSettle()
	}

	const scrollImages = (direction: ScrollDirection): void => {
		if (imageCount.value <= 1) {
			return
		}

		hasUserNavigated.value = true
		clearManualScrollTimeout()

		const delta = direction === 'right' ? 1 : -1
		const fromOrderedIndex = currentImageIndex.value
		const targetOrderedIndex = normalizeOrderedIndex(fromOrderedIndex + delta)
		currentImageIndex.value = targetOrderedIndex
		scrollToDisplayIndex(
			getDisplayIndexForOrderedIndex(targetOrderedIndex, {
				direction,
				fromOrderedIndex,
			}),
			'smooth',
			'button',
		)
	}

	const openPreview = (sourceIndex: number, displayIndex: number): void => {
		if (!canPreviewCarouselItem(displayIndex)) {
			return
		}

		activeImageIndex.value = sourceIndex
	}

	const handlePreviewOpenChange = (open: boolean): void => {
		if (!open) {
			activeImageIndex.value = null
		}
	}

	onMounted(() => {
		void initializeLoopPosition()
		window.addEventListener('resize', handleResize)
		window.addEventListener('pageshow', handlePageShow)

		if (scrollContainer.value) {
			carouselResizeObserver = new ResizeObserver(handleResize)
			carouselResizeObserver.observe(scrollContainer.value)
			scrollContainer.value.addEventListener('scrollend', handleScrollEnd)
		}
	})

	onBeforeUnmount(() => {
		window.removeEventListener('resize', handleResize)
		window.removeEventListener('pageshow', handlePageShow)
		scrollContainer.value?.removeEventListener('scrollend', handleScrollEnd)
		carouselResizeObserver?.disconnect()
		carouselResizeObserver = null
		clearInitialSettleTasks()
		clearManualScrollTimeout()
		clearProgrammaticScrollTimeout()

		if (resizeFrameId.value !== null) {
			window.cancelAnimationFrame(resizeFrameId.value)
		}
	})

	watch(normalizedImages, async () => {
		hasUserNavigated.value = false
		pendingLayoutSync.value = false
		currentImageIndex.value = 0
		await initializeLoopPosition()
	})

	return {
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
	}
}
