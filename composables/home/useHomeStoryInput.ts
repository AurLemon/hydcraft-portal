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

const KEYBOARD_SCROLL_DISTANCE_PX: Readonly<Record<string, number>> = {
	ArrowDown: 48,
	ArrowUp: 48,
	PageDown: 0.86,
	PageUp: 0.86,
	' ': 0.86,
}

const clampProgress = (progress: number): number =>
	Math.min(Math.max(progress, 0), 1)

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

const intersectsPlayerCorridor = (
	snapshot: HomeStoryInputSnapshot,
	direction: HomeStoryDirection,
	deltaPx: number,
): boolean => {
	if (!snapshot.playerCount) return false
	const { progress, playerCorridorStart, playerCorridorEnd } = snapshot
	const epsilon = 0.0005
	if (
		(direction === -1 && progress <= playerCorridorStart + epsilon) ||
		(direction === 1 && progress >= playerCorridorEnd - epsilon)
	) {
		return false
	}
	if (
		progress >= playerCorridorStart - epsilon &&
		progress <= playerCorridorEnd + epsilon
	) {
		return true
	}

	const projectedProgress = clampProgress(
		progress +
			direction *
				(Math.max(Math.abs(deltaPx), 1) /
					Math.max(snapshot.storyScrollDistancePx, 1)),
	)

	return direction === 1
		? progress < playerCorridorStart && projectedProgress >= playerCorridorStart
		: progress > playerCorridorEnd && projectedProgress <= playerCorridorEnd
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
	let keyboardGestureCaptured = false

	const resetGesture = (): void => {
		gestureCaptured = false
		keyboardGestureCaptured = false
	}

	const tryCommit = (
		direction: HomeStoryDirection,
		source: HomeStoryInputSource,
		event: Event,
		deltaPx: number,
	): void => {
		if (callbacks.isIgnoredTarget(event.target)) return
		const snapshot = callbacks.getSnapshot()
		if (gestureCaptured || snapshot.navigationStatus === 'transitioning') {
			preventCapturedInput(event)
			return
		}
		const shouldCapture = intersectsPlayerCorridor(snapshot, direction, deltaPx)
		if (!shouldCapture) return

		if (!callbacks.commit(direction, source)) return
		gestureCaptured = true
		keyboardGestureCaptured = source === 'keyboard'
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
			if (callbacks.getSnapshot().navigationStatus === 'idle') resetGesture()
		},
		onChangeY: (observer) => {
			const event = observer.event
			const direction = resolveDocumentDirection(event, observer.deltaY)
			if (!direction) return
			tryCommit(
				direction,
				event.type === 'wheel' ? 'wheel' : 'touch',
				event,
				observer.deltaY,
			)
		},
		onStop: resetGesture,
	}
	const observer = Observer.create(observerVars)

	const handleKeydown = (event: KeyboardEvent): void => {
		if (
			event.defaultPrevented ||
			event.metaKey ||
			event.ctrlKey ||
			event.altKey ||
			isEditableTarget(event.target) ||
			callbacks.isIgnoredTarget(event.target)
		) {
			return
		}
		const configuredDistance = KEYBOARD_SCROLL_DISTANCE_PX[event.key]
		if (configuredDistance === undefined) return
		const direction: HomeStoryDirection =
			event.key === 'ArrowUp' || event.key === 'PageUp' || event.shiftKey
				? -1
				: 1
		const deltaPx =
			configuredDistance <= 1
				? window.innerHeight * configuredDistance
				: configuredDistance

		if (keyboardGestureCaptured) {
			preventCapturedInput(event)
			return
		}
		tryCommit(direction, 'keyboard', event, deltaPx)
	}

	const handleKeyup = (event: KeyboardEvent): void => {
		if (KEYBOARD_SCROLL_DISTANCE_PX[event.key] === undefined) return
		keyboardGestureCaptured = false
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
