import {
	computed,
	onBeforeUnmount,
	onMounted,
	ref,
	type ComputedRef,
	type Ref,
} from 'vue'

interface HomeDetailSheetDragOptions {
	enabled: Readonly<Ref<boolean>>
	sheet: Readonly<Ref<HTMLElement | null>>
	onDismiss: () => void
}

interface HomeDetailSheetDragRuntime {
	dragStyle: ComputedRef<Record<string, string>>
	isDragging: Readonly<Ref<boolean>>
	isSettling: Readonly<Ref<boolean>>
	handlePointerDown: (event: PointerEvent) => void
	handlePointerMove: (event: PointerEvent) => void
	handlePointerUp: (event: PointerEvent) => void
	handlePointerCancel: (event: PointerEvent) => void
	handleClick: (event: MouseEvent) => void
	handleTransitionEnd: (event: TransitionEvent) => void
	reset: () => void
}

const MOBILE_MEDIA_QUERY = '(max-width: 639px)'
const INTENT_THRESHOLD_PX = 8
const VERTICAL_INTENT_RATIO = 1.25
const DISMISS_DISTANCE_RATIO = 0.25
const DISMISS_DISTANCE_MAX_PX = 120
const FLING_DISTANCE_MIN_PX = 32
const FLING_VELOCITY_MIN_PX_PER_MS = 0.65
const FLING_SAMPLE_MAX_AGE_MS = 100
const SYNTHETIC_CLICK_GUARD_MS = 500

export const useHomeDetailSheetDrag = (
	options: HomeDetailSheetDragOptions,
): HomeDetailSheetDragRuntime => {
	const dragOffsetPx = ref(0)
	const isDragging = ref(false)
	const isSettling = ref(false)
	let mediaQuery: MediaQueryList | null = null
	let activePointerId: number | null = null
	let captureTarget: HTMLElement | null = null
	let startX = 0
	let startY = 0
	let axis: 'vertical' | 'blocked' | null = null
	let movedBeyondIntentThreshold = false
	let lastOffsetPx = 0
	let lastMoveAt = 0
	let lastVelocityPxPerMs = 0
	let suppressClickUntil = 0

	const dragStyle = computed<Record<string, string>>(() => ({
		'--home-detail-drag-offset': `${dragOffsetPx.value}px`,
	}))

	const isEnabled = (): boolean =>
		options.enabled.value && mediaQuery?.matches === true

	const releasePointerCapture = (): void => {
		if (
			activePointerId !== null &&
			captureTarget?.hasPointerCapture(activePointerId)
		) {
			captureTarget.releasePointerCapture(activePointerId)
		}
	}

	const clearPointer = (): void => {
		releasePointerCapture()
		activePointerId = null
		captureTarget = null
		axis = null
		movedBeyondIntentThreshold = false
		lastOffsetPx = 0
		lastMoveAt = 0
		lastVelocityPxPerMs = 0
		isDragging.value = false
	}

	const settleBack = (): void => {
		isDragging.value = false
		isSettling.value = dragOffsetPx.value > 0
		dragOffsetPx.value = 0
	}

	const reset = (): void => {
		clearPointer()
		dragOffsetPx.value = 0
		isSettling.value = false
		suppressClickUntil = 0
	}

	const handlePointerDown = (event: PointerEvent): void => {
		if (
			!isEnabled() ||
			!event.isPrimary ||
			event.pointerType === 'mouse' ||
			activePointerId !== null ||
			isSettling.value
		) {
			return
		}

		const target = event.currentTarget
		if (!(target instanceof HTMLElement)) return

		activePointerId = event.pointerId
		captureTarget = target
		startX = event.clientX
		startY = event.clientY
		lastMoveAt = performance.now()
		isDragging.value = false
		isSettling.value = false
		target.setPointerCapture(event.pointerId)
		event.stopPropagation()
	}

	const handlePointerMove = (event: PointerEvent): void => {
		if (event.pointerId !== activePointerId) return
		if (!isEnabled()) {
			reset()
			return
		}

		const deltaX = event.clientX - startX
		const deltaY = event.clientY - startY
		if (!axis && Math.hypot(deltaX, deltaY) >= INTENT_THRESHOLD_PX) {
			movedBeyondIntentThreshold = true
			axis =
				deltaY > 0 &&
				Math.abs(deltaY) >= Math.abs(deltaX) * VERTICAL_INTENT_RATIO
					? 'vertical'
					: 'blocked'
		}
		if (axis !== 'vertical') return

		event.preventDefault()
		event.stopPropagation()
		const now = performance.now()
		const nextOffsetPx = Math.max(deltaY, 0)
		const elapsedMs = now - lastMoveAt
		if (elapsedMs > 0) {
			lastVelocityPxPerMs = (nextOffsetPx - lastOffsetPx) / elapsedMs
		}
		lastOffsetPx = nextOffsetPx
		lastMoveAt = now
		dragOffsetPx.value = nextOffsetPx
		isDragging.value = nextOffsetPx > 0
	}

	const handlePointerUp = (event: PointerEvent): void => {
		if (event.pointerId !== activePointerId) return

		const now = performance.now()
		const panelHeight = options.sheet.value?.clientHeight ?? 0
		const dismissDistancePx = Math.min(
			DISMISS_DISTANCE_MAX_PX,
			panelHeight > 0
				? panelHeight * DISMISS_DISTANCE_RATIO
				: DISMISS_DISTANCE_MAX_PX,
		)
		const recentVelocityPxPerMs =
			now - lastMoveAt <= FLING_SAMPLE_MAX_AGE_MS ? lastVelocityPxPerMs : 0
		const shouldDismiss =
			axis === 'vertical' &&
			(dragOffsetPx.value >= dismissDistancePx ||
				(dragOffsetPx.value >= FLING_DISTANCE_MIN_PX &&
					recentVelocityPxPerMs >= FLING_VELOCITY_MIN_PX_PER_MS))

		if (movedBeyondIntentThreshold) {
			suppressClickUntil = now + SYNTHETIC_CLICK_GUARD_MS
			event.preventDefault()
			event.stopPropagation()
		}
		clearPointer()

		if (shouldDismiss) {
			options.onDismiss()
			return
		}
		settleBack()
	}

	const handlePointerCancel = (event: PointerEvent): void => {
		if (event.pointerId !== activePointerId) return
		clearPointer()
		suppressClickUntil = 0
		settleBack()
	}

	const handleClick = (event: MouseEvent): void => {
		if (performance.now() <= suppressClickUntil) {
			suppressClickUntil = 0
			event.preventDefault()
			event.stopPropagation()
			return
		}
		if (!isEnabled()) return
		options.onDismiss()
	}

	const handleTransitionEnd = (event: TransitionEvent): void => {
		if (event.propertyName !== 'transform' || dragOffsetPx.value !== 0) return
		isSettling.value = false
	}

	const handleMediaChange = (): void => {
		reset()
	}

	onMounted(() => {
		mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY)
		mediaQuery.addEventListener('change', handleMediaChange)
	})

	onBeforeUnmount(() => {
		mediaQuery?.removeEventListener('change', handleMediaChange)
		mediaQuery = null
		reset()
	})

	return {
		dragStyle,
		isDragging,
		isSettling,
		handlePointerDown,
		handlePointerMove,
		handlePointerUp,
		handlePointerCancel,
		handleClick,
		handleTransitionEnd,
		reset,
	}
}
