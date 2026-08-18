import type { ComputedRef, Ref } from 'vue'
import type { HomeOverviewPhase } from '~/components/home/HomeOverviewStory.vue'

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
}

export interface HomeStoryPlayerSegment {
	index: number
	transitionStart: number
	focusStart: number
	dwellEnd: number
}

export interface HomeStoryMapHandle {
	setScrollProgress(progress: number): void
}

interface HomeStoryStop {
	id: 'hero' | 'player' | 'community' | 'outro-start' | 'outro-end'
	progress: number
}

const HERO_EXIT_START = 0.02
const HERO_PROGRESS_END = 0.14
const ATMOSPHERE_PROGRESS_END = 0.22
const PLAYER_ENTRY_TRANSITION_DVH = 12
const PLAYER_TRANSITION_DVH = 60
const PLAYER_FOCUS_DWELL_DVH = 26
const OVERVIEW_TRANSITION_DVH = 10
const COMMUNITY_SCROLL_DVH = 72
const OUTRO_TRANSITION_DVH = 36
const OUTRO_SCROLL_BUFFER_DVH = 6

const clampProgress = (progress: number): number =>
	Math.min(Math.max(progress, 0), 1)

const smoothStepProgress = (progress: number): number => {
	const normalized = clampProgress(progress)
	return normalized * normalized * (3 - 2 * normalized)
}

const resolvePlayerCarouselProgress = (
	progress: number,
	segments: readonly HomeStoryPlayerSegment[],
): number => {
	if (!segments.length) return 0

	for (const segment of segments) {
		if (progress < segment.transitionStart) {
			return Math.max(segment.index - 1, 0)
		}
		if (progress < segment.focusStart) {
			if (segment.index === 0) return 0
			const transitionProgress = smoothStepProgress(
				(progress - segment.transitionStart) /
					Math.max(segment.focusStart - segment.transitionStart, 0.0001),
			)

			return segment.index - 1 + transitionProgress
		}
		if (progress <= segment.dwellEnd) {
			return segment.index
		}
	}

	return segments.at(-1)?.index ?? 0
}

export const useHomeStoryProgress = (options: {
	playerCount: ComputedRef<number>
	homeMapRef: Ref<HomeStoryMapHandle | null>
}) => {
	const scrollStoryRef = ref<HTMLElement | null>(null)
	const heroActive = ref(true)
	const overviewPhase = ref<HomeOverviewPhase>('hidden')
	const outroProgress = ref(0)
	const activePlayerIndex = ref(0)
	const playerCarouselProgress = ref(0)
	const playerStackEntryProgress = ref(0)
	const playerStackExitProgress = ref(0)
	const mapOpacity = ref(1)
	const playerSequenceScrollDvh = computed(() => {
		const playerCount = options.playerCount.value
		if (playerCount <= 0) return 0

		return (
			PLAYER_ENTRY_TRANSITION_DVH +
			(playerCount - 1) * PLAYER_TRANSITION_DVH +
			playerCount * PLAYER_FOCUS_DWELL_DVH
		)
	})
	const sceneStoryScrollDvh = computed(
		() =>
			(playerSequenceScrollDvh.value +
				OVERVIEW_TRANSITION_DVH +
				COMMUNITY_SCROLL_DVH +
				OUTRO_TRANSITION_DVH +
				OUTRO_SCROLL_BUFFER_DVH) /
			(1 - HERO_PROGRESS_END),
	)
	const sceneStoryHeightDvh = computed(() => sceneStoryScrollDvh.value + 100)
	const storyLayout = computed<HomeStoryLayout>(() => {
		const toProgress = (scrollDvh: number): number =>
			clampProgress(scrollDvh / Math.max(sceneStoryScrollDvh.value, 1))
		let playerCursorDvh = HERO_PROGRESS_END * sceneStoryScrollDvh.value
		const playerSegments = Array.from(
			{ length: options.playerCount.value },
			(_, index): HomeStoryPlayerSegment => {
				const transitionStartDvh = playerCursorDvh
				const transitionDvh =
					index === 0 ? PLAYER_ENTRY_TRANSITION_DVH : PLAYER_TRANSITION_DVH
				const focusStartDvh = transitionStartDvh + transitionDvh
				const dwellEndDvh = focusStartDvh + PLAYER_FOCUS_DWELL_DVH
				playerCursorDvh = dwellEndDvh

				return {
					index,
					transitionStart: toProgress(transitionStartDvh),
					focusStart: toProgress(focusStartDvh),
					dwellEnd: toProgress(dwellEndDvh),
				}
			},
		)
		const focusProgressEnd = toProgress(playerCursorDvh)
		const overviewTransitionSpan = toProgress(OVERVIEW_TRANSITION_DVH)
		const communityProgressStart = toProgress(
			playerCursorDvh + OVERVIEW_TRANSITION_DVH,
		)
		const communityProgressEnd = toProgress(
			playerCursorDvh + OVERVIEW_TRANSITION_DVH + COMMUNITY_SCROLL_DVH,
		)
		const outroProgressStart = Math.max(
			communityProgressEnd,
			1 -
				(OUTRO_TRANSITION_DVH + OUTRO_SCROLL_BUFFER_DVH) /
					Math.max(sceneStoryScrollDvh.value, 1),
		)
		const outroPresentationEnd = Math.max(
			outroProgressStart,
			1 - OUTRO_SCROLL_BUFFER_DVH / Math.max(sceneStoryScrollDvh.value, 1),
		)

		return {
			heroExitStart: HERO_EXIT_START,
			heroProgressEnd: HERO_PROGRESS_END,
			atmosphereProgressEnd: ATMOSPHERE_PROGRESS_END,
			playerEntryProgressEnd:
				playerSegments[0]?.focusStart ?? HERO_PROGRESS_END,
			playerSegments,
			focusProgressEnd,
			overviewTransitionSpan,
			communityProgressStart,
			communityProgressEnd,
			outroProgressStart,
			outroPresentationStart: outroProgressStart,
			outroPresentationEnd,
		}
	})
	let latestStoryProgress = 0
	let revertScrollStory: (() => void) | null = null
	let scrollTriggerRefresh: (() => void) | null = null

	const resolveOverviewStoryStops = (): HomeStoryStop[] => {
		return storyLayout.value.playerSegments.map((segment) => ({
			id: 'player',
			progress: (segment.focusStart + segment.dwellEnd) / 2,
		}))
	}

	const resolveStoryStops = (): HomeStoryStop[] => {
		const layout = storyLayout.value
		return [
			{ id: 'hero', progress: 0 },
			{ id: 'hero', progress: layout.heroProgressEnd },
			...resolveOverviewStoryStops(),
			{ id: 'community', progress: layout.communityProgressStart },
			{
				id: 'community',
				progress:
					(layout.communityProgressStart + layout.communityProgressEnd) / 2,
			},
			{ id: 'community', progress: layout.communityProgressEnd },
			{ id: 'outro-start', progress: layout.outroProgressStart },
			{ id: 'outro-end', progress: 1 },
		]
			.filter(
				(stop, index, allStops) =>
					Number.isFinite(stop.progress) &&
					allStops.findIndex(
						(candidate) =>
							Math.abs(candidate.progress - stop.progress) < 0.0001,
					) === index,
			)
			.sort((left, right) => left.progress - right.progress) as HomeStoryStop[]
	}

	const resolveStorySnapProgress = (progress: number): number => {
		const nearest = resolveStoryStops().reduce((closest, stop) =>
			Math.abs(stop.progress - progress) < Math.abs(closest.progress - progress)
				? stop
				: closest,
		)

		// Player cards must remain directly scroll-controlled. Snapping them to
		// a focus stop makes a short pause force a fast, fixed-duration switch.
		if (nearest.id === 'player') return progress

		return Math.abs(nearest.progress - progress) <= 0.02
			? nearest.progress
			: progress
	}

	const syncStoryProgress = (progress: number): void => {
		const normalized = clampProgress(progress)
		const layout = storyLayout.value
		latestStoryProgress = normalized
		heroActive.value = normalized < layout.heroProgressEnd
		outroProgress.value = clampProgress(
			(normalized - layout.outroPresentationStart) /
				Math.max(
					layout.outroPresentationEnd - layout.outroPresentationStart,
					0.01,
				),
		)

		if (normalized >= layout.outroPresentationStart) {
			overviewPhase.value = 'outro'
		} else if (normalized < layout.heroProgressEnd) {
			overviewPhase.value = 'hidden'
		} else if (normalized < layout.playerEntryProgressEnd) {
			overviewPhase.value = 'scene'
		} else if (normalized < layout.communityProgressStart) {
			overviewPhase.value = 'players'
		} else {
			overviewPhase.value = 'community'
		}

		mapOpacity.value = 1 - Math.min(outroProgress.value * 3.2, 1)
		playerStackEntryProgress.value = clampProgress(
			(normalized - layout.heroProgressEnd) /
				Math.max(layout.playerEntryProgressEnd - layout.heroProgressEnd, 0.01),
		)
		playerStackExitProgress.value = clampProgress(
			(normalized - layout.focusProgressEnd) /
				Math.max(layout.communityProgressStart - layout.focusProgressEnd, 0.01),
		)

		if (options.playerCount.value > 0) {
			playerCarouselProgress.value = resolvePlayerCarouselProgress(
				normalized,
				layout.playerSegments,
			)
			activePlayerIndex.value = Math.round(playerCarouselProgress.value)
			return
		}

		playerCarouselProgress.value = 0
		activePlayerIndex.value = 0
	}

	const reapplyMapProgress = (): void => {
		options.homeMapRef.value?.setScrollProgress(latestStoryProgress)
	}
	const refreshScrollStory = (): void => scrollTriggerRefresh?.()

	watch(options.playerCount, () => {
		syncStoryProgress(latestStoryProgress)
		void nextTick(() => refreshScrollStory())
	})

	onMounted(async () => {
		const [gsapModule, scrollTriggerModule] = await Promise.all([
			import('gsap'),
			import('gsap/ScrollTrigger'),
		])
		const { gsap } = gsapModule
		const { ScrollTrigger } = scrollTriggerModule
		const scrollStory = scrollStoryRef.value
		const firstBackdrop = scrollStory?.querySelector<HTMLElement>(
			'[data-home-first-backdrop]',
		)
		const firstPanel = scrollStory?.querySelector<HTMLElement>(
			'[data-home-hero-panel]',
		)
		if (!scrollStory || !firstBackdrop || !firstPanel) return

		const contentExitElements = Array.from(
			firstPanel.querySelectorAll<HTMLElement>('[data-home-exit="content"]'),
		)
		const desktopGalleryElements = Array.from(
			firstPanel.querySelectorAll<HTMLElement>(
				'[data-home-exit="gallery-desktop"]',
			),
		)
		const mobileGalleryElements = Array.from(
			firstPanel.querySelectorAll<HTMLElement>(
				'[data-home-exit="gallery-mobile"]',
			),
		)

		gsap.registerPlugin(ScrollTrigger)
		const context = gsap.context(() => {
			const timelineClock = { progress: 0 }
			const syncMapProgress = (progress: number): void => {
				options.homeMapRef.value?.setScrollProgress(clampProgress(progress))
				syncStoryProgress(progress)
			}
			const timeline = gsap.timeline({
				scrollTrigger: {
					trigger: scrollStory,
					start: 'top top',
					end: 'bottom bottom',
					scrub: 1.5,
					snap: {
						snapTo: resolveStorySnapProgress,
						directional: true,
						inertia: false,
						delay: 0.18,
						duration: { min: 0.2, max: 0.42 },
						ease: 'sine.inOut',
					},
					onRefresh: (scrollTrigger) => {
						timelineClock.progress = scrollTrigger.progress
						syncMapProgress(scrollTrigger.progress)
					},
				},
			})
			timeline
				.to(
					timelineClock,
					{
						progress: 1,
						duration: 1,
						ease: 'none',
						onUpdate: () => syncMapProgress(timelineClock.progress),
					},
					0,
				)
				.to(
					contentExitElements,
					{
						autoAlpha: 0,
						filter: 'blur(14px)',
						y: -28,
						stagger: 0,
						duration: 0.12,
						ease: 'power1.out',
					},
					storyLayout.value.heroExitStart,
				)
				.to(
					desktopGalleryElements,
					{
						autoAlpha: 0,
						filter: 'blur(12px)',
						x: -40,
						duration: 0.12,
						ease: 'power1.out',
					},
					storyLayout.value.heroExitStart,
				)
				.to(
					mobileGalleryElements,
					{
						autoAlpha: 0,
						filter: 'blur(12px)',
						y: 32,
						duration: 0.12,
						ease: 'power1.out',
					},
					storyLayout.value.heroExitStart,
				)
				.to(
					firstBackdrop,
					{ autoAlpha: 0, duration: 0.12, ease: 'none' },
					storyLayout.value.heroExitStart,
				)
		}, scrollStory)
		revertScrollStory = () => context.revert()
		scrollTriggerRefresh = () => ScrollTrigger.refresh()
	})

	onBeforeUnmount(() => {
		revertScrollStory?.()
		revertScrollStory = null
		scrollTriggerRefresh = null
	})

	return {
		scrollStoryRef,
		storyLayout,
		sceneStoryHeightDvh,
		heroActive,
		overviewPhase,
		outroProgress,
		activePlayerIndex,
		playerCarouselProgress,
		playerStackEntryProgress,
		playerStackExitProgress,
		mapOpacity,
		refreshScrollStory,
		reapplyMapProgress,
	}
}
