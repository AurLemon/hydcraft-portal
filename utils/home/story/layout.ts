import type { HomeStoryLayout, HomeStoryPlayerSegment } from './types'

export interface HomeStoryMetrics {
	viewportHeightPx: number
	storyScrollDistancePx: number
	storyHeightPx: number
	heroScrollPx: number
	playerEntryTransitionPx: number
	playerTransitionPx: number
	playerFocusDwellPx: number
	overviewTransitionPx: number
	communityScrollPx: number
	outroTransitionPx: number
	outroScrollBufferPx: number
}

const HERO_EXIT_START = 0.02
const ATMOSPHERE_PROGRESS_END = 0.22
const HERO_SCROLL_RATIO = 0.45
const PLAYER_ENTRY_TRANSITION_RATIO = 0.12
const PLAYER_TRANSITION_RATIO = 0.6
const PLAYER_FOCUS_DWELL_RATIO = 0.26
const OVERVIEW_TRANSITION_RATIO = 0.1
const COMMUNITY_SCROLL_RATIO = 0.72
const OUTRO_TRANSITION_RATIO = 0.36
const OUTRO_SCROLL_BUFFER_RATIO = 0.06

const clamp = (value: number, minimum: number, maximum: number): number =>
	Math.min(Math.max(value, minimum), maximum)

const viewportBudget = (
	viewportHeightPx: number,
	ratio: number,
	minimum: number,
	maximum: number,
): number => clamp(viewportHeightPx * ratio, minimum, maximum)

export const resolveHomeStoryMetrics = (
	viewportHeightPx: number,
	playerCount: number,
): HomeStoryMetrics => {
	const viewport = Math.max(viewportHeightPx, 1)
	const heroScrollPx = viewportBudget(viewport, HERO_SCROLL_RATIO, 320, 520)
	const playerEntryTransitionPx = viewportBudget(
		viewport,
		PLAYER_ENTRY_TRANSITION_RATIO,
		120,
		220,
	)
	const playerTransitionPx = viewportBudget(
		viewport,
		PLAYER_TRANSITION_RATIO,
		520,
		760,
	)
	const playerFocusDwellPx = viewportBudget(
		viewport,
		PLAYER_FOCUS_DWELL_RATIO,
		220,
		360,
	)
	const overviewTransitionPx = viewportBudget(
		viewport,
		OVERVIEW_TRANSITION_RATIO,
		120,
		220,
	)
	const communityScrollPx = viewportBudget(
		viewport,
		COMMUNITY_SCROLL_RATIO,
		520,
		760,
	)
	const outroTransitionPx = viewportBudget(
		viewport,
		OUTRO_TRANSITION_RATIO,
		300,
		520,
	)
	const outroScrollBufferPx = viewportBudget(
		viewport,
		OUTRO_SCROLL_BUFFER_RATIO,
		64,
		112,
	)
	const playerSequencePx = playerCount
		? playerEntryTransitionPx +
			Math.max(playerCount - 1, 0) * playerTransitionPx +
			playerCount * playerFocusDwellPx
		: 0
	const storyScrollDistancePx =
		heroScrollPx +
		playerSequencePx +
		overviewTransitionPx +
		communityScrollPx +
		outroTransitionPx +
		outroScrollBufferPx

	return {
		viewportHeightPx: viewport,
		storyScrollDistancePx,
		storyHeightPx: storyScrollDistancePx + viewport,
		heroScrollPx,
		playerEntryTransitionPx,
		playerTransitionPx,
		playerFocusDwellPx,
		overviewTransitionPx,
		communityScrollPx,
		outroTransitionPx,
		outroScrollBufferPx,
	}
}

const toProgress = (pixels: number, total: number): number =>
	clamp(pixels / Math.max(total, 1), 0, 1)

export const resolveHomeStoryLayout = (
	metrics: HomeStoryMetrics,
	playerCount: number,
): HomeStoryLayout => {
	const toStoryProgress = (pixels: number): number =>
		toProgress(pixels, metrics.storyScrollDistancePx)
	let playerCursorPx = metrics.heroScrollPx
	const playerSegments = Array.from(
		{ length: playerCount },
		(_, index): HomeStoryPlayerSegment => {
			const transitionStartPx = playerCursorPx
			const transitionPx =
				index === 0
					? metrics.playerEntryTransitionPx
					: metrics.playerTransitionPx
			const focusStartPx = transitionStartPx + transitionPx
			const dwellEndPx = focusStartPx + metrics.playerFocusDwellPx
			playerCursorPx = dwellEndPx

			return {
				index,
				transitionStart: toStoryProgress(transitionStartPx),
				focusStart: toStoryProgress(focusStartPx),
				dwellEnd: toStoryProgress(dwellEndPx),
			}
		},
	)
	const focusProgressEnd = toStoryProgress(playerCursorPx)
	const communityProgressStart = toStoryProgress(
		playerCursorPx + metrics.overviewTransitionPx,
	)
	const communityProgressEnd = toStoryProgress(
		playerCursorPx + metrics.overviewTransitionPx + metrics.communityScrollPx,
	)
	const outroProgressStart = Math.max(
		communityProgressEnd,
		toStoryProgress(
			metrics.storyScrollDistancePx -
				metrics.outroTransitionPx -
				metrics.outroScrollBufferPx,
		),
	)
	const outroPresentationEnd = toStoryProgress(
		metrics.storyScrollDistancePx - metrics.outroScrollBufferPx,
	)

	return {
		heroExitStart: HERO_EXIT_START,
		heroProgressEnd: toStoryProgress(metrics.heroScrollPx),
		atmosphereProgressEnd: ATMOSPHERE_PROGRESS_END,
		playerEntryProgressEnd:
			playerSegments[0]?.focusStart ?? toStoryProgress(metrics.heroScrollPx),
		playerSegments,
		focusProgressEnd,
		overviewTransitionSpan: toProgress(
			metrics.overviewTransitionPx,
			metrics.storyScrollDistancePx,
		),
		communityProgressStart,
		communityProgressEnd,
		outroProgressStart,
		outroPresentationStart: outroProgressStart,
		outroPresentationEnd: Math.max(outroProgressStart, outroPresentationEnd),
		playerCorridorStart:
			playerSegments[0]?.transitionStart ??
			toStoryProgress(metrics.heroScrollPx),
		playerCorridorEnd: communityProgressStart,
		storyScrollDistancePx: metrics.storyScrollDistancePx,
		storyHeightPx: metrics.storyHeightPx,
	}
}
