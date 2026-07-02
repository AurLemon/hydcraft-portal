import {
	normalizeContentImage,
	parseContentImages,
	type ContentImageItem,
} from '~/components/content/utils/content-image'

type ScrollDirection = 'left' | 'right'

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

export const useImageCarouselState = (options: ImageCarouselStateOptions) => {
	const scrollContainer = ref<HTMLDivElement | null>(null)
	const canScrollLeft = ref(false)
	const canScrollRight = ref(false)
	const currentImageIndex = ref(0)
	const activeImageIndex = ref<number | null>(null)
	const isAdjustingLoopPosition = ref(false)
	const isProgrammaticScroll = ref(false)
	const hasUserNavigated = ref(false)
	const loopSyncFrameId = ref<number | null>(null)
	const resizeFrameId = ref<number | null>(null)
	const settleFrameId = ref<number | null>(null)
	const programmaticScrollResetTimeoutId = ref<number | null>(null)
	const scrollSettleTimeoutId = ref<number | null>(null)
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

	const canPreviewCarouselItem = (displayIndex: number): boolean => {
		if (buttonAlwaysVisible.value || normalizedImages.value.length <= 1) {
			return true
		}

		const realItemStartIndex = getRealItemStartIndex()

		return (
			displayIndex >= realItemStartIndex &&
			displayIndex < realItemStartIndex + normalizedImages.value.length
		)
	}

	const isLoopDecorationItem = (displayIndex: number): boolean => {
		if (!cycleEnabled.value || normalizedImages.value.length <= 1) {
			return false
		}

		const realItemStartIndex = getRealItemStartIndex()

		return (
			displayIndex < realItemStartIndex ||
			displayIndex >= realItemStartIndex + normalizedImages.value.length
		)
	}

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
			: (carouselImages.value.find(
					(image) => image.sourceIndex === activeImageIndex.value,
				) ?? null),
	)

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
		buttonAlwaysVisible.value ||
		currentImageIndex.value < normalizedImages.value.length - 1
			? 'scale-100 opacity-100'
			: 'pointer-events-none scale-90 opacity-0',
	)

	const getCarouselItemElements = (container: HTMLDivElement): HTMLElement[] =>
		Array.from(container.querySelectorAll<HTMLElement>('figure'))

	const setScrollPosition = (
		left: number,
		behavior: ScrollBehavior = 'auto',
	): void => {
		const container = scrollContainer.value

		if (!container) {
			return
		}

		isProgrammaticScroll.value = true
		container.scrollTo({
			left,
			behavior,
		})
	}

	const clearProgrammaticScrollResetTimeout = (): void => {
		if (programmaticScrollResetTimeoutId.value !== null) {
			clearTimeout(programmaticScrollResetTimeoutId.value)
			programmaticScrollResetTimeoutId.value = null
		}
	}

	const scheduleProgrammaticScrollReset = (): void => {
		clearProgrammaticScrollResetTimeout()
		programmaticScrollResetTimeoutId.value = window.setTimeout(() => {
			programmaticScrollResetTimeoutId.value = null
			isProgrammaticScroll.value = false
		}, 180)
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
		const itemCenter = itemStart + element.offsetWidth / 2
		const targetScrollLeft = itemCenter - container.clientWidth / 2

		return Math.min(Math.max(targetScrollLeft, 0), maxScrollLeft)
	}

	const getRealItemStartIndex = (): number => {
		return cycleEnabled.value && normalizedImages.value.length > 1
			? normalizedImages.value.length
			: 0
	}

	const getNearestItemIndex = (
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

		if (!hasUserNavigated.value) {
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

	const syncLoopPosition = (
		behavior: ScrollBehavior = 'smooth',
		forceRealItem = false,
	): void => {
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

		if (!itemElements.length) {
			return
		}

		const realItemStartIndex = getRealItemStartIndex()
		const itemScrollOffsets = getItemScrollOffsets(container, itemElements)
		const nearestItemIndex = getNearestItemIndex(container, itemElements)

		if (
			!forceRealItem &&
			nearestItemIndex >= realItemStartIndex &&
			nearestItemIndex <= realItemStartIndex + normalizedImages.value.length - 1
		) {
			return
		}

		const targetOrderedIndex = hasUserNavigated.value
			? nearestItemIndex % normalizedImages.value.length
			: 0
		const targetIndex = realItemStartIndex + targetOrderedIndex
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
		setScrollPosition(targetScrollLeft, behavior)
		requestAnimationFrame(() => {
			isAdjustingLoopPosition.value = false
			currentImageIndex.value = targetOrderedIndex
			updateScrollState()
		})
	}

	const queueLoopPositionSync = (
		behavior: ScrollBehavior = 'smooth',
		forceRealItem = false,
	): void => {
		if (loopSyncFrameId.value !== null) {
			window.cancelAnimationFrame(loopSyncFrameId.value)
		}

		loopSyncFrameId.value = window.requestAnimationFrame(() => {
			loopSyncFrameId.value = null
			syncLoopPosition(behavior, forceRealItem)
		})
	}

	const clearScrollSettleTimeout = (): void => {
		if (scrollSettleTimeoutId.value !== null) {
			clearTimeout(scrollSettleTimeoutId.value)
			scrollSettleTimeoutId.value = null
		}
	}

	const scheduleScrollSettle = (): void => {
		clearScrollSettleTimeout()
		scrollSettleTimeoutId.value = window.setTimeout(() => {
			scrollSettleTimeoutId.value = null

			if (!cycleEnabled.value || isAdjustingLoopPosition.value) {
				return
			}

			queueLoopPositionSync('smooth', true)
		}, 140)
	}

	const handleScroll = (): void => {
		const isLoopAdjustmentScroll = isAdjustingLoopPosition.value
		const isInternalScroll =
			isLoopAdjustmentScroll || isProgrammaticScroll.value

		if (isProgrammaticScroll.value) {
			scheduleProgrammaticScrollReset()
		}

		if (!isInternalScroll) {
			hasUserNavigated.value = true
		}

		if (cycleEnabled.value && !isLoopAdjustmentScroll) {
			scheduleScrollSettle()
		}

		updateScrollState()
		updateCurrentImageIndex()
	}

	const centerImageAtIndex = (
		sourceIndex: number,
		behavior: ScrollBehavior = 'auto',
	): void => {
		const container = scrollContainer.value

		if (!container || !normalizedImages.value.length) {
			return
		}

		const itemElements = getCarouselItemElements(container)
		const targetIndex =
			normalizedImages.value.length > 1
				? getRealItemStartIndex() + sourceIndex
				: sourceIndex
		const targetElement = itemElements[targetIndex]

		if (!targetElement) {
			return
		}

		const itemScrollOffsets = getItemScrollOffsets(container, itemElements)
		const targetScrollLeft = getCenteredScrollLeft(
			container,
			targetElement,
			itemScrollOffsets[targetIndex] ?? 0,
		)

		setScrollPosition(targetScrollLeft, behavior)
	}

	const centerCurrentImage = (): void => {
		centerImageAtIndex(hasUserNavigated.value ? currentImageIndex.value : 0)
		handleScroll()
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
		centerImageAtIndex(0)
		handleScroll()
		queueLoopPositionSync('auto', true)
	}

	const scheduleInitialPositionSettle = (): void => {
		clearInitialSettleTasks()

		const settle = (): void => {
			if (hasUserNavigated.value) {
				clearInitialSettleTasks()
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
		centerCurrentImage()
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
		handleResize()
	}

	const initializeLoopPosition = async (): Promise<void> => {
		await nextTick()
		currentImageIndex.value = 0

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
		queueLoopPositionSync('auto', true)
		scheduleInitialPositionSettle()
	}

	const handlePageShow = (): void => {
		scheduleInitialPositionSettle()
	}

	const getTargetItemIndex = (
		itemCenters: number[],
		currentViewportCenter: number,
		direction: ScrollDirection,
	): number => {
		if (direction === 'right') {
			return itemCenters.findIndex(
				(center) => center > currentViewportCenter + 1,
			)
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

		hasUserNavigated.value = true

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

		const targetOrderedIndex =
			targetIndex >= 0
				? targetIndex % normalizedImages.value.length
				: currentImageIndex.value

		currentImageIndex.value = targetOrderedIndex
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

		setScrollPosition(targetScrollLeft, 'smooth')
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
		}
	})

	onBeforeUnmount(() => {
		window.removeEventListener('resize', handleResize)
		window.removeEventListener('pageshow', handlePageShow)
		carouselResizeObserver?.disconnect()
		carouselResizeObserver = null
		clearInitialSettleTasks()
		clearProgrammaticScrollResetTimeout()
		clearScrollSettleTimeout()

		if (loopSyncFrameId.value !== null) {
			window.cancelAnimationFrame(loopSyncFrameId.value)
		}

		if (resizeFrameId.value !== null) {
			window.cancelAnimationFrame(resizeFrameId.value)
		}
	})

	watch(normalizedImages, async () => {
		hasUserNavigated.value = false
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
