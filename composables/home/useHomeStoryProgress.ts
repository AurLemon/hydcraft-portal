import type { ComputedRef, Ref } from 'vue'
import type { HomeOverviewPhase } from '~/components/home/HomeOverviewStory.vue'

export interface HomeStoryLayout {
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
}

export interface HomeStoryMapHandle {
	setScrollProgress(progress: number): void
}

interface HomeStoryStop {
	id: 'hero' | 'player' | 'community' | 'outro-start' | 'outro-end'
	progress: number
}

interface PlayerFocusSegment {
	index: number
	start: number
	dwellEnd: number
	transitionEnd: number
}

const HERO_EXIT_START = 0.02
const HERO_PROGRESS_END = 0.14
const ATMOSPHERE_PROGRESS_END = 0.22
const PLAYER_ENTRY_PROGRESS_END = 0.24
const OVERVIEW_TRANSITION_SPAN = 0.04
const PLAYER_FIRST_FOCUS_DWELL_SHARE = 0.42
const PLAYER_FOCUS_DWELL_SHARE = 0.17
const COMMUNITY_SCROLL_DVH = 16
const OUTRO_TRANSITION_DVH = 32
const OUTRO_SCROLL_BUFFER_DVH = 6

const clampProgress = (progress: number): number =>
	Math.min(Math.max(progress, 0), 1)

const resolvePlayerFocusSegments = (
	playerCount: number,
): PlayerFocusSegment[] => {
	if (playerCount <= 0) return []

	const totalDwellShare =
		PLAYER_FIRST_FOCUS_DWELL_SHARE +
		PLAYER_FOCUS_DWELL_SHARE * (playerCount - 1)
	const transitionShare = (1 - totalDwellShare) / Math.max(playerCount - 1, 1)
	let cursor = 0

	return Array.from({ length: playerCount }, (_, index) => {
		const start = cursor
		const dwellShare =
			index === 0 ? PLAYER_FIRST_FOCUS_DWELL_SHARE : PLAYER_FOCUS_DWELL_SHARE
		const dwellEnd = start + dwellShare
		const transitionEnd =
			index < playerCount - 1 ? dwellEnd + transitionShare : dwellEnd
		cursor = transitionEnd

		return { index, start, dwellEnd, transitionEnd }
	})
}

const resolvePlayerCarouselProgress = (
	progress: number,
	playerCount: number,
): number => {
	const segments = resolvePlayerFocusSegments(playerCount)
	for (const segment of segments) {
		if (progress <= segment.dwellEnd || segment.index === playerCount - 1) {
			return segment.index
		}
		if (progress <= segment.transitionEnd) {
			return (
				segment.index +
				(progress - segment.dwellEnd) /
					Math.max(segment.transitionEnd - segment.dwellEnd, 0.0001)
			)
		}
	}

	return Math.max(playerCount - 1, 0)
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
	const sceneStoryHeightDvh = computed(() => {
		if (options.playerCount.value <= 1) return 300 + OUTRO_SCROLL_BUFFER_DVH
		if (options.playerCount.value === 2) return 400 + OUTRO_SCROLL_BUFFER_DVH
		return 450 + OUTRO_SCROLL_BUFFER_DVH
	})
	const focusProgressEnd = computed(() => {
		if (options.playerCount.value <= 1) return 0.34
		if (options.playerCount.value === 2) return 0.46
		return 0.56
	})
	const storyLayout = computed<HomeStoryLayout>(() => {
		const communityProgressStart = Math.min(
			focusProgressEnd.value + OVERVIEW_TRANSITION_SPAN,
			0.94,
		)
		const communityProgressEnd = Math.min(
			communityProgressStart +
				COMMUNITY_SCROLL_DVH / (sceneStoryHeightDvh.value - 100),
			0.98,
		)
		const outroProgressStart = Math.max(
			communityProgressEnd,
			1 -
				(OUTRO_TRANSITION_DVH + OUTRO_SCROLL_BUFFER_DVH) /
					Math.max(sceneStoryHeightDvh.value - 100, 1),
		)
		const outroPresentationEnd = Math.max(
			outroProgressStart,
			1 -
				OUTRO_SCROLL_BUFFER_DVH / Math.max(sceneStoryHeightDvh.value - 100, 1),
		)

		return {
			heroExitStart: HERO_EXIT_START,
			heroProgressEnd: HERO_PROGRESS_END,
			atmosphereProgressEnd: ATMOSPHERE_PROGRESS_END,
			playerEntryProgressEnd: PLAYER_ENTRY_PROGRESS_END,
			focusProgressEnd: focusProgressEnd.value,
			overviewTransitionSpan: OVERVIEW_TRANSITION_SPAN,
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
		const layout = storyLayout.value
		const focusSpan = Math.max(
			layout.focusProgressEnd - layout.playerEntryProgressEnd,
			0.01,
		)

		return resolvePlayerFocusSegments(options.playerCount.value).map(
			(segment) => ({
				id: 'player',
				progress: layout.playerEntryProgressEnd + segment.start * focusSpan,
			}),
		)
	}

	const resolveStoryStops = (): HomeStoryStop[] => {
		const layout = storyLayout.value
		return [
			{ id: 'hero', progress: 0 },
			{ id: 'hero', progress: layout.heroProgressEnd },
			...resolveOverviewStoryStops(),
			{ id: 'community', progress: layout.communityProgressStart },
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

		return Math.abs(nearest.progress - progress) <= 0.035
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
			const playerProgress = clampProgress(
				(normalized - layout.heroProgressEnd) /
					Math.max(layout.focusProgressEnd - layout.heroProgressEnd, 0.01),
			)
			playerCarouselProgress.value = resolvePlayerCarouselProgress(
				playerProgress,
				options.playerCount.value,
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
					scrub: true,
					snap: {
						snapTo: resolveStorySnapProgress,
						directional: true,
						inertia: false,
						delay: 0.12,
						duration: { min: 0.12, max: 0.28 },
						ease: 'power2.out',
					},
					onUpdate: (scrollTrigger) => syncMapProgress(scrollTrigger.progress),
					onRefresh: (scrollTrigger) => syncMapProgress(scrollTrigger.progress),
				},
			})
			timeline
				.to(timelineClock, { progress: 1, duration: 1, ease: 'none' }, 0)
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
