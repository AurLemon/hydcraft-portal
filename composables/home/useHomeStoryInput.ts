import type { Observer as GsapObserver } from 'gsap/Observer'
import type {
	HomeStoryDirection,
	HomeStoryInputCallbacks,
	HomeStoryInputSnapshot,
	HomeStoryInputSource,
} from '~/utils/home/story/types'

interface HomeStoryObserverVars {
	target: Document
	type: string
	capture: boolean
	passive: boolean
	preventDefault: boolean
	debounce: boolean
	lockAxis: boolean
	dragMinimum: number
	tolerance: number
	onStopDelay: number
	ignoreCheck: (event: Event) => boolean
	onPress: (observer: GsapObserver) => void
	onRelease: () => void
	onChangeY: (observer: GsapObserver) => void
	onStop: () => void
}

export interface HomeStoryInputRuntime {
	handleNavigationSettled(): void
	destroy(): void
}

const KEYBOARD_SCROLL_KEYS = new Set([
	'ArrowDown',
	'ArrowUp',
	'PageDown',
	'PageUp',
	' ',
])
const WHEEL_SETTLE_GUARD_MS = 400

const isEditableTarget = (target: EventTarget | null): boolean => {
	if (!(target instanceof HTMLElement)) return false

	return (
		target.isContentEditable ||
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement
	)
}

const resolveDocumentDirection = (
	event: Event,
	deltaY: number,
): HomeStoryDirection | null => {
	if (!deltaY) return null
	const deltaDirection: HomeStoryDirection = deltaY > 0 ? 1 : -1

	return event.type === 'wheel' ? deltaDirection : deltaDirection === 1 ? -1 : 1
}

const canCaptureStoryInput = (
	snapshot: HomeStoryInputSnapshot,
	direction: HomeStoryDirection,
): boolean => {
	if (!snapshot.storyViewportActive) return false
	const epsilon = 0.0005
	if (direction === -1 && snapshot.progress <= snapshot.storyStart + epsilon) {
		return false
	}
	if (direction === 1 && snapshot.progress >= snapshot.storyEnd - epsilon) {
		return false
	}
	if (
		snapshot.progress > snapshot.storyStart + epsilon &&
		snapshot.progress < snapshot.storyEnd - epsilon
	) {
		return true
	}

	return true
}

const preventCapturedInput = (event: Event): void => {
	if (event.cancelable) event.preventDefault()
	event.stopPropagation()
}

export const createHomeStoryInput = async (
	callbacks: HomeStoryInputCallbacks,
): Promise<HomeStoryInputRuntime> => {
	const { Observer } = await import('gsap/Observer')
	let gestureCaptured = false
	let pointerCommitted = false
	let wheelBlockedUntil = 0
	let pointerStartY: number | null = null

	const eventClientY = (event: Event): number | null => {
		if (event instanceof TouchEvent) {
			return (
				event.changedTouches[0]?.clientY ?? event.touches[0]?.clientY ?? null
			)
		}
		if (event instanceof PointerEvent || event instanceof MouseEvent) {
			return event.clientY
		}
		return null
	}

	const shouldIgnoreObserverEvent = (event: Event): boolean => {
		if (callbacks.isIgnoredTarget(event.target)) return true
		const snapshot = callbacks.getSnapshot()
		if (!snapshot.storyViewportActive) return true

		if (event instanceof WheelEvent) {
			const direction = resolveDocumentDirection(event, event.deltaY)
			return direction ? !canCaptureStoryInput(snapshot, direction) : true
		}

		const clientY = eventClientY(event)
		if (pointerStartY === null || clientY === null) return false
		const deltaY = clientY - pointerStartY
		if (Math.abs(deltaY) < 2) return false
		return false
	}

	const handleNavigationSettled = (): void => {
		gestureCaptured = false
		wheelBlockedUntil = performance.now() + WHEEL_SETTLE_GUARD_MS
	}

	const tryCommit = (
		direction: HomeStoryDirection,
		source: HomeStoryInputSource,
		event: Event,
	): void => {
		if (callbacks.isIgnoredTarget(event.target)) return
		const snapshot = callbacks.getSnapshot()
		if (
			(source === 'wheel'
				? performance.now() < wheelBlockedUntil
				: pointerCommitted) ||
			snapshot.navigationStatus === 'transitioning'
		) {
			preventCapturedInput(event)
			return
		}
		if (!canCaptureStoryInput(snapshot, direction)) {
			if (source === 'touch') {
				callbacks.releaseBoundary(direction)
				preventCapturedInput(event)
			}
			return
		}

		if (!callbacks.commit(direction, source)) return
		if (source === 'touch') pointerCommitted = true
		preventCapturedInput(event)
	}

	const observerVars: HomeStoryObserverVars = {
		target: document,
		type: 'wheel,touch',
		capture: true,
		passive: false,
		preventDefault: true,
		debounce: false,
		lockAxis: true,
		dragMinimum: 6,
		tolerance: 12,
		onStopDelay: 0.28,
		ignoreCheck: shouldIgnoreObserverEvent,
		onPress: (observer) => {
			const snapshot = callbacks.getSnapshot()
			const event = observer.event
			pointerStartY = event ? eventClientY(event) : null
			pointerCommitted = false
			if (snapshot.navigationStatus === 'idle') {
				gestureCaptured = false
			}
		},
		onRelease: () => {
			pointerStartY = null
			pointerCommitted = false
			callbacks.setInputEnded(true)
		},
		onChangeY: (observer) => {
			const event = observer.event
			const direction = resolveDocumentDirection(event, observer.deltaY)
			if (!direction) return
			tryCommit(direction, event.type === 'wheel' ? 'wheel' : 'touch', event)
		},
		onStop: () => {
			callbacks.setInputEnded(true)
		},
	}
	const observer = Observer.create(observerVars)

	const handleKeydown = (event: KeyboardEvent): void => {
		if (
			event.defaultPrevented ||
			event.metaKey ||
			event.ctrlKey ||
			event.altKey ||
			isEditableTarget(event.target) ||
			callbacks.isIgnoredTarget(event.target) ||
			!KEYBOARD_SCROLL_KEYS.has(event.key)
		) {
			return
		}
		if (event.repeat && gestureCaptured) {
			preventCapturedInput(event)
			return
		}

		const direction: HomeStoryDirection =
			event.key === 'ArrowUp' || event.key === 'PageUp' || event.shiftKey
				? -1
				: 1
		const snapshot = callbacks.getSnapshot()
		if (
			gestureCaptured &&
			snapshot.inputEnded &&
			snapshot.navigationStatus === 'idle'
		) {
			gestureCaptured = false
		}
		callbacks.setInputEnded(false)
		if (
			gestureCaptured ||
			snapshot.navigationStatus === 'transitioning' ||
			!canCaptureStoryInput(snapshot, direction)
		) {
			if (snapshot.navigationStatus === 'transitioning' || gestureCaptured) {
				preventCapturedInput(event)
			}
			return
		}

		if (callbacks.commit(direction, 'keyboard')) {
			gestureCaptured = true
			preventCapturedInput(event)
		}
	}

	const handleKeyup = (event: KeyboardEvent): void => {
		if (!KEYBOARD_SCROLL_KEYS.has(event.key)) return
		callbacks.setInputEnded(true)
		if (callbacks.getSnapshot().navigationStatus === 'idle') {
			gestureCaptured = false
		}
	}

	window.addEventListener('keydown', handleKeydown, { capture: true })
	window.addEventListener('keyup', handleKeyup, { capture: true })

	return {
		handleNavigationSettled,
		destroy: () => {
			observer.kill()
			window.removeEventListener('keydown', handleKeydown, { capture: true })
			window.removeEventListener('keyup', handleKeyup, { capture: true })
		},
	}
}
