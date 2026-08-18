export type HomeStoryDirection = 1 | -1

export type HomeStoryInputSource = 'wheel' | 'touch' | 'keyboard' | 'card'

export type HomeStoryPhase =
	| 'hero'
	| 'scene'
	| 'players'
	| 'community'
	| 'outro'

export type HomeStoryNavigationStatus = 'idle' | 'transitioning'

export type HomeStoryStopId = 'hero' | 'player' | 'community' | 'outro'

export interface HomeStoryStop {
	id: HomeStoryStopId
	index: number
	progress: number
	playerIndex?: number
}

export interface HomeStoryTransitionConfig {
	from: HomeStoryStop
	to: HomeStoryStop
	startProgress: number
	endProgress: number
	duration: number
	ease: string
}

export interface HomeStoryPlayerSegment {
	index: number
	transitionStart: number
	focusStart: number
	dwellEnd: number
}

export interface HomeStoryLayout {
	stops: readonly HomeStoryStop[]
	transitions: readonly HomeStoryTransitionConfig[]
	playerSegments: readonly HomeStoryPlayerSegment[]
	heroExitStart: number
	heroProgressEnd: number
	atmosphereProgressEnd: number
	playerEntryProgressEnd: number
	focusProgressEnd: number
	overviewTransitionSpan: number
	communityProgressStart: number
	communityProgressEnd: number
	outroProgressStart: number
	outroPresentationStart: number
	outroPresentationEnd: number
	storyScrollDistancePx: number
	storyHeightPx: number
	viewportHeightPx: number
}

export interface HomeStoryNavigatorState {
	status: HomeStoryNavigationStatus
	settledStopIndex: number
	targetStopIndex: number | null
	inputEnded: boolean
	transitionSettled: boolean
}

export interface HomeStoryRenderState {
	progress: number
	phase: HomeStoryPhase
	phaseProgress: number
	activePlayerIndex: number
	playerCarouselProgress: number
	playerStackEntryProgress: number
	playerStackExitProgress: number
	outroProgress: number
	mapOpacity: number
	navigationStatus: HomeStoryNavigationStatus
	playerActionVisible: boolean
}

export interface HomeStoryInputSnapshot {
	progress: number
	storyStart: number
	storyEnd: number
	storyViewportActive: boolean
	storyScrollDistancePx: number
	stopProgresses: readonly number[]
	settledStopIndex: number
	navigationStatus: HomeStoryNavigationStatus
	inputEnded: boolean
}

export interface HomeStoryInputCallbacks {
	getSnapshot(): HomeStoryInputSnapshot
	commit(direction: HomeStoryDirection, source: HomeStoryInputSource): boolean
	releaseBoundary(direction: HomeStoryDirection): void
	isIgnoredTarget(target: EventTarget | null): boolean
	setInputEnded(inputEnded: boolean): void
}

export interface HomeStoryMapHandle {
	setScrollProgress(progress: number): void
}

export interface HomeStoryProgressTarget {
	progress: number
	scrollTop: number
}

export interface HomeStoryScrollTrigger {
	tweenTo(
		position: number,
		options?: {
			duration?: number
			ease?: string
			onComplete?: () => void
			onInterrupt?: () => void
		},
	): { kill(): void }
}

export type HomeStoryEvent =
	| {
			type: 'scroll-sampled'
			progress: number
			source: 'native' | 'controlled' | 'refresh'
	  }
	| {
			type: 'navigation-requested'
			direction: HomeStoryDirection
			source: HomeStoryInputSource
	  }
	| {
			type: 'navigation-started'
			fromIndex: number
			toIndex: number
			source: HomeStoryInputSource
	  }
	| {
			type: 'navigation-settled'
			index: number
	  }
	| {
			type: 'layout-refreshed'
			viewportHeightPx: number
	  }
