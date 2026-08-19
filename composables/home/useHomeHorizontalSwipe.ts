import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

export type HomeHorizontalSwipeDirection = -1 | 1

interface HomeHorizontalSwipeOptions {
	enabled: Ref<boolean>
	onCommit: (direction: HomeHorizontalSwipeDirection) => void
	threshold?: number
}

const MOBILE_MEDIA_QUERY = '(max-width: 639px)'
const HORIZONTAL_INTENT_RATIO = 1.25

export const isHomeHorizontalIntent = (
	deltaX: number,
	deltaY: number,
	minimum = 8,
): boolean =>
	Math.abs(deltaX) >= minimum &&
	Math.abs(deltaX) >= Math.abs(deltaY) * HORIZONTAL_INTENT_RATIO

export const useHomeHorizontalSwipe = (
	element: Ref<HTMLElement | null>,
	options: HomeHorizontalSwipeOptions,
): { isDragging: Ref<boolean> } => {
	const isDragging = ref(false)
	const threshold = options.threshold ?? 24
	let activePointerId: number | null = null
	let startX = 0
	let startY = 0
	let axis: 'x' | 'y' | null = null
	let committed = false
	let suppressClick = false
	let mediaQuery: MediaQueryList | null = null
	let boundTarget: HTMLElement | null = null

	const isEnabled = (): boolean =>
		options.enabled.value && Boolean(mediaQuery?.matches)

	const reset = (): void => {
		activePointerId = null
		axis = null
		committed = false
		isDragging.value = false
	}

	const handlePointerDown = (event: PointerEvent): void => {
		if (!isEnabled() || event.pointerType === 'mouse') return
		if (activePointerId !== null) return
		activePointerId = event.pointerId
		startX = event.clientX
		startY = event.clientY
		axis = null
		committed = false
		isDragging.value = false
	}

	const handlePointerMove = (event: PointerEvent): void => {
		if (event.pointerId !== activePointerId || !isEnabled()) return
		const deltaX = event.clientX - startX
		const deltaY = event.clientY - startY
		if (!axis && Math.hypot(deltaX, deltaY) >= 8) {
			axis = isHomeHorizontalIntent(deltaX, deltaY) ? 'x' : 'y'
		}
		if (axis !== 'x') return

		isDragging.value = true
		event.preventDefault()
		event.stopPropagation()
		if (committed || Math.abs(deltaX) < threshold) return

		committed = true
		suppressClick = true
		options.onCommit(deltaX > 0 ? -1 : 1)
	}

	const handlePointerUp = (event: PointerEvent): void => {
		if (event.pointerId !== activePointerId) return
		if (axis === 'x' && isDragging.value) {
			event.preventDefault()
			event.stopPropagation()
		}
		reset()
	}

	const handlePointerCancel = (event: PointerEvent): void => {
		if (event.pointerId !== activePointerId) return
		reset()
	}

	const handleClick = (event: MouseEvent): void => {
		if (!suppressClick) return
		suppressClick = false
		event.preventDefault()
		event.stopPropagation()
	}

	const bind = (): void => {
		const target = element.value
		if (!target || boundTarget === target) return
		target.addEventListener('pointerdown', handlePointerDown, { passive: true })
		target.addEventListener('pointermove', handlePointerMove, {
			passive: false,
		})
		target.addEventListener('pointerup', handlePointerUp, { passive: false })
		target.addEventListener('pointercancel', handlePointerCancel, {
			passive: true,
		})
		target.addEventListener('click', handleClick, true)
		boundTarget = target
	}

	const unbind = (): void => {
		const target = boundTarget
		if (!target) return
		target.removeEventListener('pointerdown', handlePointerDown)
		target.removeEventListener('pointermove', handlePointerMove)
		target.removeEventListener('pointerup', handlePointerUp)
		target.removeEventListener('pointercancel', handlePointerCancel)
		target.removeEventListener('click', handleClick, true)
		boundTarget = null
	}

	const handleMediaChange = (): void => {
		if (!mediaQuery?.matches) reset()
	}

	onMounted(() => {
		mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY)
		mediaQuery.addEventListener('change', handleMediaChange)
		bind()
	})

	watch(element, () => {
		unbind()
		bind()
	})

	onBeforeUnmount(() => {
		unbind()
		mediaQuery?.removeEventListener('change', handleMediaChange)
		mediaQuery = null
		reset()
	})

	return { isDragging }
}
