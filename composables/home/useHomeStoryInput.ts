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
	debounce: boolean
	lockAxis: boolean
	dragMinimum: number
	tolerance: number
	onStopDelay: number
	ignoreCheck: (event: Event) => boolean
	onPress: () => void
	onChangeY: (observer: GsapObserver) => void
	onStop: () => void
}

export interface HomeStoryInputRuntime {
	resetGesture(): void
	destroy(): void
}

const KEYBOARD_SCROLL_KEYS = new Set([
	'ArrowDown',
	'ArrowUp',
	'PageDown',
	'PageUp',
	' ',
])

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

	const resetGesture = (): void => {
		gestureCaptured = false
		callbacks.setInputEnded(true)
	}

	const tryCommit = (
		direction: HomeStoryDirection,
		source: HomeStoryInputSource,
		event: Event,
	): void => {
		if (callbacks.isIgnoredTarget(event.target)) return
		const snapshot = callbacks.getSnapshot()
		if (
			gestureCaptured &&
			snapshot.inputEnded &&
			snapshot.navigationStatus === 'idle'
		) {
			gestureCaptured = false
		}
		if (gestureCaptured || snapshot.navigationStatus === 'transitioning') {
			preventCapturedInput(event)
			return
		}
		if (!canCaptureStoryInput(snapshot, direction)) return

		if (!callbacks.commit(direction, source)) return
		gestureCaptured = true
		preventCapturedInput(event)
	}

	const observerVars: HomeStoryObserverVars = {
		target: document,
		type: 'wheel,touch',
		capture: true,
		passive: false,
		debounce: false,
		lockAxis: true,
		dragMinimum: 6,
		tolerance: 12,
		onStopDelay: 0.28,
		ignoreCheck: (event) => callbacks.isIgnoredTarget(event.target),
		onPress: () => {
			const snapshot = callbacks.getSnapshot()
			if (snapshot.inputEnded && snapshot.navigationStatus === 'idle') {
				gestureCaptured = false
			}
			callbacks.setInputEnded(false)
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
		resetGesture,
		destroy: () => {
			observer.kill()
			window.removeEventListener('keydown', handleKeydown, { capture: true })
			window.removeEventListener('keyup', handleKeyup, { capture: true })
		},
	}
}
