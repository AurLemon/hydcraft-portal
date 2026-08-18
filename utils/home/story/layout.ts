import type {
	HomeStoryLayout,
	HomeStoryPlayerSegment,
	HomeStoryStop,
	HomeStoryTransitionConfig,
} from './types'

export interface HomeStoryMetrics {
	viewportHeightPx: number
	storyScrollDistancePx: number
	storyHeightPx: number
}

const DEFAULT_VIEWPORT_HEIGHT_PX = 800
const HERO_EXIT_LOCAL_PROGRESS = 0.08
const ATMOSPHERE_LOCAL_PROGRESS = 0.72
const COMMUNITY_HOLD_VIEWPORTS = 1.5

const clamp = (value: number, minimum = 0, maximum = 1): number =>
	Math.min(Math.max(value, minimum), maximum)

export const STORY_TRANSITION_DURATION = {
	heroToPlayer: 1.25,
	playerToPlayer: 0.95,
	playerToCommunity: 1.25,
	communityToOutro: 1.45,
} as const

const resolveTransition = (
	from: HomeStoryStop,
	to: HomeStoryStop,
): HomeStoryTransitionConfig => ({
	from,
	to,
	startProgress: from.progress,
	endProgress: to.progress,
	duration:
		from.id === 'hero'
			? STORY_TRANSITION_DURATION.heroToPlayer
			: to.id === 'community'
				? STORY_TRANSITION_DURATION.playerToCommunity
				: to.id === 'outro'
					? STORY_TRANSITION_DURATION.communityToOutro
					: STORY_TRANSITION_DURATION.playerToPlayer,
	ease:
		from.id === 'hero' || to.id === 'outro' ? 'power3.inOut' : 'power2.inOut',
})

export const resolveHomeStoryMetrics = (
	viewportHeightPx: number,
	playerCount: number,
): HomeStoryMetrics => {
	const viewport = Math.max(viewportHeightPx || DEFAULT_VIEWPORT_HEIGHT_PX, 1)
	const stopCount = Math.max(playerCount, 0) + 3
	const storyScrollDistancePx =
		Math.max(stopCount - 1 + COMMUNITY_HOLD_VIEWPORTS - 1, 1) * viewport

	return {
		viewportHeightPx: viewport,
		storyScrollDistancePx,
		storyHeightPx: storyScrollDistancePx + viewport,
	}
}

export const resolveHomeStoryLayout = (
	metrics: HomeStoryMetrics,
	playerCount: number,
): HomeStoryLayout => {
	const safePlayerCount = Math.max(playerCount, 0)
	const stopCount = safePlayerCount + 3
	const progressSpan = Math.max(stopCount - 1 + COMMUNITY_HOLD_VIEWPORTS - 1, 1)
	const toProgress = (index: number): number => clamp(index / progressSpan)

	const hero: HomeStoryStop = { id: 'hero', index: 0, progress: 0 }
	const playerStops: HomeStoryStop[] = Array.from(
		{ length: safePlayerCount },
		(_, playerIndex) => ({
			id: 'player',
			index: playerIndex + 1,
			progress: toProgress(playerIndex + 1),
			playerIndex,
		}),
	)
	const community: HomeStoryStop = {
		id: 'community',
		index: safePlayerCount + 1,
		progress: toProgress(safePlayerCount + 1),
	}
	const outro: HomeStoryStop = {
		id: 'outro',
		index: safePlayerCount + 2,
		progress: 1,
	}
	const stops = [hero, ...playerStops, community, outro]
	const transitions = stops
		.slice(1)
		.map((stop, index) => resolveTransition(stops[index]!, stop))
	const playerSegments: HomeStoryPlayerSegment[] = playerStops.map(
		(stop, index) => ({
			index,
			transitionStart: stops[index]!.progress,
			focusStart: stop.progress,
			dwellEnd: stop.progress,
		}),
	)
	const playerZero = playerStops[0]?.progress ?? community.progress
	const lastPlayer = playerStops.at(-1)?.progress ?? hero.progress
	const communityTransition = transitions.find(
		(transition) => transition.to.id === 'community',
	)!
	return {
		stops,
		transitions,
		playerSegments,
		heroExitStart: clamp(
			communityTransition.startProgress === hero.progress
				? playerZero * HERO_EXIT_LOCAL_PROGRESS
				: hero.progress,
		),
		heroProgressEnd: playerZero,
		atmosphereProgressEnd: clamp(playerZero * ATMOSPHERE_LOCAL_PROGRESS),
		playerEntryProgressEnd: playerZero,
		focusProgressEnd: lastPlayer,
		overviewTransitionSpan: Math.max(community.progress - lastPlayer, 0.0001),
		communityProgressStart: lastPlayer,
		communityProgressEnd: community.progress,
		outroProgressStart: outro.progress,
		outroPresentationStart: community.progress,
		outroPresentationEnd: outro.progress,
		storyScrollDistancePx: metrics.storyScrollDistancePx,
		storyHeightPx: metrics.storyHeightPx,
		viewportHeightPx: metrics.viewportHeightPx,
	}
}
