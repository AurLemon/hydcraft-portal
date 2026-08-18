export type HomeStoryDirection = 1 | -1

export type HomeStoryInputSource = 'wheel' | 'touch' | 'keyboard' | 'card'

export type HomeStoryPhase =
	| 'hero'
	| 'scene'
	| 'players'
	| 'community'
	| 'outro'

export type HomeStoryNavigationStatus = 'idle' | 'transitioning'

export interface HomeStoryPlayerSegment {
	index: number
	transitionStart: number
	focusStart: number
	dwellEnd: number
}

export interface HomeStoryLayout {
	heroExitStart: number
	heroProgressEnd: number
	atmosphereProgressEnd: number
	playerEntryProgressEnd: number
	playerSegments: readonly HomeStoryPlayerSegment[]
	focusProgressEnd: number
	overviewTransitionSpan: number
	communityProgressStart: number
	communityProgressEnd: number
	outroProgressStart: number
	outroPresentationStart: number
	outroPresentationEnd: number
	playerCorridorStart: number
	playerCorridorEnd: number
	storyScrollDistancePx: number
	storyHeightPx: number
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
}

export interface HomeStoryInputSnapshot {
	progress: number
	playerCorridorStart: number
	playerCorridorEnd: number
	storyScrollDistancePx: number
	playerCount: number
	activePlayerIndex: number
	navigationStatus: HomeStoryNavigationStatus
}

export interface HomeStoryInputCallbacks {
	getSnapshot(): HomeStoryInputSnapshot
	commit(direction: HomeStoryDirection, source: HomeStoryInputSource): boolean
	isIgnoredTarget(target: EventTarget | null): boolean
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
