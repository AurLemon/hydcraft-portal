import type { ComputedRef, Ref } from 'vue'
import {
	createHomeStoryInput,
	type HomeStoryInputRuntime,
} from './useHomeStoryInput'
import type { HomeOverviewPhase } from '~/components/home/HomeOverviewStory.vue'
import {
	resolveHomeStoryLayout,
	resolveHomeStoryMetrics,
} from '~/utils/home/story/layout'
import type {
	HomeStoryDirection,
	HomeStoryEvent,
	HomeStoryInputSnapshot,
	HomeStoryInputSource,
	HomeStoryLayout,
	HomeStoryMapHandle,
	HomeStoryNavigationStatus,
	HomeStoryProgressTarget,
	HomeStoryRenderState,
	HomeStoryScrollTrigger,
} from '~/utils/home/story/types'

export type {
	HomeStoryLayout,
	HomeStoryMapHandle,
	HomeStoryPlayerSegment,
} from '~/utils/home/story/types'

const DEFAULT_VIEWPORT_HEIGHT_PX = 800
const STORY_SEEK_SECONDS = 0.72
const CLICK_FOCUS_SCROLL_SECONDS = 1.1

const clampProgress = (progress: number): number =>
	Math.min(Math.max(progress, 0), 1)

const smoothStepProgress = (progress: number): number => {
	const normalized = clampProgress(progress)
	return normalized * normalized * (3 - 2 * normalized)
}

const resolvePlayerCarouselProgress = (
	progress: number,
	segments: readonly HomeStoryLayout['playerSegments'][number][],
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
		if (progress <= segment.dwellEnd) return segment.index
	}

	return segments.at(-1)?.index ?? 0
}

const resolveStoryPhase = (
	progress: number,
	layout: HomeStoryLayout,
): HomeOverviewPhase => {
	if (progress < layout.heroProgressEnd) return 'hidden'
	if (progress < layout.playerEntryProgressEnd) return 'scene'
	if (progress < layout.communityProgressStart) return 'players'
	return 'community'
}

const resolveRenderPhase = (
	progress: number,
	layout: HomeStoryLayout,
): HomeStoryRenderState['phase'] => {
	if (progress < layout.heroProgressEnd) return 'hero'
	if (progress < layout.playerEntryProgressEnd) return 'scene'
	if (progress < layout.communityProgressStart) return 'players'
	if (progress < layout.outroPresentationStart) return 'community'
	return 'outro'
}

const resolvePhaseProgress = (
	progress: number,
	layout: HomeStoryLayout,
	phase: HomeStoryRenderState['phase'],
): number => {
	const boundaries: Record<
		HomeStoryRenderState['phase'],
		readonly [number, number]
	> = {
		hero: [0, layout.heroProgressEnd],
		scene: [layout.heroProgressEnd, layout.playerEntryProgressEnd],
		players: [layout.playerEntryProgressEnd, layout.communityProgressStart],
		community: [layout.communityProgressStart, layout.outroPresentationStart],
		outro: [layout.outroPresentationStart, 1],
	}
	const [start, end] = boundaries[phase]
	return clampProgress((progress - start) / Math.max(end - start, 0.0001))
}

export const useHomeStoryProgress = (options: {
	playerCount: ComputedRef<number>
	homeMapRef: Ref<HomeStoryMapHandle | null>
}) => {
	const scrollStoryRef = ref<HTMLElement | null>(null)
	const viewportHeightPx = ref(DEFAULT_VIEWPORT_HEIGHT_PX)
	const viewportReady = ref(false)
	const heroActive = ref(true)
	const overviewPhase = ref<HomeOverviewPhase>('hidden')
	const outroProgress = ref(0)
	const activePlayerIndex = ref(0)
	const playerCarouselProgress = ref(0)
	const playerStackEntryProgress = ref(0)
	const playerStackExitProgress = ref(0)
	const mapOpacity = ref(1)
	const navigationStatus = ref<HomeStoryNavigationStatus>('idle')
	const pendingPlayerIndex = ref<number | null>(null)
	const storyMetrics = computed(() =>
		resolveHomeStoryMetrics(viewportHeightPx.value, options.playerCount.value),
	)
	const storyLayout = computed<HomeStoryLayout>(() =>
		resolveHomeStoryLayout(storyMetrics.value, options.playerCount.value),
	)
	const sceneStoryHeightDvh = computed(
		() =>
			(storyMetrics.value.storyScrollDistancePx /
				Math.max(storyMetrics.value.viewportHeightPx, 1)) *
				100 +
			100,
	)
	const sceneStoryHeightStyle = computed(() =>
		viewportReady.value
			? `${storyLayout.value.storyHeightPx}px`
			: `${sceneStoryHeightDvh.value}dvh`,
	)
	const latestStoryProgress = ref(0)
	let revertScrollStory: (() => void) | null = null
	let scrollTriggerRefresh: (() => void) | null = null
	let seekScrollStory:
		| ((
				target: HomeStoryProgressTarget,
				duration: number,
				onComplete: () => void,
		  ) => { kill(): void })
		| null = null
	let inputRuntime: HomeStoryInputRuntime | null = null
	let activeScrollTween: { kill(): void } | null = null
	let restoreControlledScrollBehavior: (() => void) | null = null
	let viewportResizeFrame: number | null = null
	let viewportMedia: VisualViewport | null = null

	const storyState = computed<HomeStoryRenderState>(() => {
		const progress = latestStoryProgress.value
		const phase = resolveRenderPhase(progress, storyLayout.value)
		return {
			progress,
			phase,
			phaseProgress: resolvePhaseProgress(progress, storyLayout.value, phase),
			activePlayerIndex: activePlayerIndex.value,
			playerCarouselProgress: playerCarouselProgress.value,
			playerStackEntryProgress: playerStackEntryProgress.value,
			playerStackExitProgress: playerStackExitProgress.value,
			outroProgress: outroProgress.value,
			mapOpacity: mapOpacity.value,
			navigationStatus: navigationStatus.value,
		}
	})

	const dispatchStoryEvent = (event: HomeStoryEvent): void => {
		if (event.type === 'navigation-started') {
			navigationStatus.value = 'transitioning'
			pendingPlayerIndex.value = event.toIndex
		}
		if (event.type === 'navigation-settled') {
			navigationStatus.value = 'idle'
			activePlayerIndex.value = event.index
			pendingPlayerIndex.value = null
		}
	}

	const syncStoryProgress = (
		progress: number,
		source: 'native' | 'controlled' | 'refresh' = 'native',
	): void => {
		const normalized = clampProgress(progress)
		const layout = storyLayout.value
		latestStoryProgress.value = normalized
		dispatchStoryEvent({ type: 'scroll-sampled', progress: normalized, source })
		heroActive.value = normalized < layout.heroProgressEnd
		overviewPhase.value = resolveStoryPhase(normalized, layout)
		outroProgress.value = clampProgress(
			(normalized - layout.outroPresentationStart) /
				Math.max(
					layout.outroPresentationEnd - layout.outroPresentationStart,
					0.01,
				),
		)
		mapOpacity.value = 1 - Math.min(outroProgress.value * 3.2, 1)
		playerStackEntryProgress.value = clampProgress(
			(normalized - layout.heroProgressEnd) /
				Math.max(layout.playerEntryProgressEnd - layout.heroProgressEnd, 0.01),
		)
		playerStackExitProgress.value = clampProgress(
			(normalized - layout.focusProgressEnd) /
				Math.max(layout.communityProgressStart - layout.focusProgressEnd, 0.01),
		)

		if (options.playerCount.value <= 0) {
			playerCarouselProgress.value = 0
			activePlayerIndex.value = 0
			return
		}

		playerCarouselProgress.value = resolvePlayerCarouselProgress(
			normalized,
			layout.playerSegments,
		)
		if (navigationStatus.value === 'idle') {
			activePlayerIndex.value = Math.min(
				Math.max(Math.round(playerCarouselProgress.value), 0),
				options.playerCount.value - 1,
			)
		}
	}

	const resolveProgressTarget = (progress: number): HomeStoryProgressTarget => {
		const scrollStory = scrollStoryRef.value
		const storyTop = scrollStory
			? window.scrollY + scrollStory.getBoundingClientRect().top
			: 0
		const storyScrollDistance = scrollStory
			? Math.max(scrollStory.offsetHeight - window.innerHeight, 0)
			: storyLayout.value.storyScrollDistancePx

		return {
			progress: clampProgress(progress),
			scrollTop: storyTop + storyScrollDistance * clampProgress(progress),
		}
	}

	const scrollWindowImmediately = (scrollTop: number): void => {
		const documentElement = document.documentElement
		const previousScrollBehavior = documentElement.style.scrollBehavior
		documentElement.style.scrollBehavior = 'auto'
		window.scrollTo({ top: scrollTop, behavior: 'auto' })
		documentElement.style.scrollBehavior = previousScrollBehavior
	}

	const useControlledScrollBehavior = (): (() => void) => {
		restoreControlledScrollBehavior?.()
		const documentElement = document.documentElement
		const previousScrollBehavior = documentElement.style.scrollBehavior
		documentElement.style.scrollBehavior = 'auto'
		let restored = false

		const restore = (): void => {
			if (restored) return
			restored = true
			documentElement.style.scrollBehavior = previousScrollBehavior
			if (restoreControlledScrollBehavior === restore) {
				restoreControlledScrollBehavior = null
			}
		}
		restoreControlledScrollBehavior = restore
		return restore
	}

	const seekToProgress = (
		progress: number,
		duration: number,
		onComplete: () => void,
	): boolean => {
		if (!import.meta.client) return false
		const target = resolveProgressTarget(progress)
		const effectiveDuration = window.matchMedia(
			'(prefers-reduced-motion: reduce)',
		).matches
			? 0.01
			: duration
		if (!seekScrollStory) {
			scrollWindowImmediately(target.scrollTop)
			syncStoryProgress(target.progress, 'controlled')
			onComplete()
			return true
		}

		activeScrollTween?.kill()
		activeScrollTween = seekScrollStory(target, effectiveDuration, onComplete)
		return true
	}

	const scrollToPlayerFocus = (
		playerIndex: number,
		source: HomeStoryInputSource = 'card',
	): void => {
		const segment = storyLayout.value.playerSegments[playerIndex]
		if (!segment || navigationStatus.value === 'transitioning') return
		const focusProgress = (segment.focusStart + segment.dwellEnd) / 2
		dispatchStoryEvent({
			type: 'navigation-requested',
			direction: playerIndex >= activePlayerIndex.value ? 1 : -1,
			source,
		})
		dispatchStoryEvent({
			type: 'navigation-started',
			fromIndex: activePlayerIndex.value,
			toIndex: playerIndex,
			source,
		})
		seekToProgress(
			focusProgress,
			source === 'card' ? CLICK_FOCUS_SCROLL_SECONDS : STORY_SEEK_SECONDS,
			() =>
				dispatchStoryEvent({ type: 'navigation-settled', index: playerIndex }),
		)
	}

	const scrollToBoundary = (
		progress: number,
		source: HomeStoryInputSource,
	): boolean => {
		if (navigationStatus.value === 'transitioning') return true
		dispatchStoryEvent({
			type: 'navigation-requested',
			direction: progress > latestStoryProgress.value ? 1 : -1,
			source,
		})
		dispatchStoryEvent({
			type: 'navigation-started',
			fromIndex: activePlayerIndex.value,
			toIndex: activePlayerIndex.value,
			source,
		})
		return seekToProgress(progress, STORY_SEEK_SECONDS, () => {
			navigationStatus.value = 'idle'
			pendingPlayerIndex.value = null
		})
	}

	const commitInputDirection = (
		direction: HomeStoryDirection,
		source: HomeStoryInputSource,
	): boolean => {
		const layout = storyLayout.value
		const lastPlayerIndex = options.playerCount.value - 1
		if (lastPlayerIndex < 0) return false
		const boundaryEpsilon = 0.0005
		if (
			(direction === -1 &&
				latestStoryProgress.value <=
					layout.playerCorridorStart + boundaryEpsilon) ||
			(direction === 1 &&
				latestStoryProgress.value >= layout.playerCorridorEnd - boundaryEpsilon)
		) {
			return false
		}

		if (
			latestStoryProgress.value < layout.playerCorridorStart &&
			direction === 1
		) {
			scrollToPlayerFocus(0, source)
			return true
		}
		if (
			latestStoryProgress.value > layout.playerCorridorEnd &&
			direction === -1
		) {
			scrollToPlayerFocus(lastPlayerIndex, source)
			return true
		}
		if (
			latestStoryProgress.value < layout.playerCorridorStart ||
			latestStoryProgress.value > layout.playerCorridorEnd
		) {
			return false
		}

		if (direction === 1) {
			if (activePlayerIndex.value < lastPlayerIndex) {
				scrollToPlayerFocus(activePlayerIndex.value + 1, source)
				return true
			}
			return scrollToBoundary(layout.playerCorridorEnd, source)
		}

		if (activePlayerIndex.value > 0) {
			scrollToPlayerFocus(activePlayerIndex.value - 1, source)
			return true
		}
		return scrollToBoundary(layout.playerCorridorStart, source)
	}

	const getInputSnapshot = (): HomeStoryInputSnapshot => ({
		progress: latestStoryProgress.value,
		playerCorridorStart: storyLayout.value.playerCorridorStart,
		playerCorridorEnd: storyLayout.value.playerCorridorEnd,
		storyScrollDistancePx: storyLayout.value.storyScrollDistancePx,
		playerCount: options.playerCount.value,
		activePlayerIndex: activePlayerIndex.value,
		navigationStatus: navigationStatus.value,
	})

	const isIgnoredInputTarget = (target: EventTarget | null): boolean => {
		if (!(target instanceof Element)) return false
		return Boolean(target.closest('[data-home-detail-scroll]'))
	}

	const reapplyMapProgress = (): void => {
		options.homeMapRef.value?.setScrollProgress(latestStoryProgress.value)
	}
	const refreshScrollStory = (): void => scrollTriggerRefresh?.()

	const scheduleViewportRefresh = (): void => {
		if (viewportResizeFrame !== null) return
		viewportResizeFrame = requestAnimationFrame(() => {
			viewportResizeFrame = null
			const nextHeight = Math.max(
				Math.round(viewportMedia?.height ?? window.innerHeight),
				1,
			)
			if (Math.abs(nextHeight - viewportHeightPx.value) < 1) return
			viewportHeightPx.value = nextHeight
			viewportReady.value = true
			dispatchStoryEvent({
				type: 'layout-refreshed',
				viewportHeightPx: nextHeight,
			})
			void nextTick(() => refreshScrollStory())
		})
	}

	watch(options.playerCount, () => {
		syncStoryProgress(latestStoryProgress.value, 'refresh')
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

		viewportMedia = window.visualViewport ?? null
		viewportHeightPx.value = Math.max(
			Math.round(viewportMedia?.height ?? window.innerHeight),
			1,
		)
		viewportReady.value = true

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

		const syncMapProgress = (
			progress: number,
			source: 'native' | 'controlled' | 'refresh' = 'native',
		): void => {
			const normalized = clampProgress(progress)
			options.homeMapRef.value?.setScrollProgress(normalized)
			syncStoryProgress(normalized, source)
		}

		gsap.registerPlugin(ScrollTrigger)
		const context = gsap.context(() => {
			const timelineClock = { progress: 0 }
			const timeline = gsap.timeline({
				scrollTrigger: {
					trigger: scrollStory,
					start: 'top top',
					end: 'bottom bottom',
					scrub: true,
					onRefresh: (scrollTrigger) => {
						timelineClock.progress = scrollTrigger.progress
						syncMapProgress(scrollTrigger.progress, 'refresh')
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

			const scrollTrigger = timeline.scrollTrigger as
				| HomeStoryScrollTrigger
				| undefined
			if (scrollTrigger) {
				seekScrollStory = (target, duration, onComplete) => {
					const restoreScrollBehavior = useControlledScrollBehavior()
					const tween = scrollTrigger.tweenTo(target.scrollTop, {
						duration,
						ease: 'sine.inOut',
						onComplete: () => {
							restoreScrollBehavior()
							activeScrollTween = null
							syncMapProgress(target.progress, 'controlled')
							onComplete()
						},
						onInterrupt: () => {
							restoreScrollBehavior()
							activeScrollTween = null
							navigationStatus.value = 'idle'
							pendingPlayerIndex.value = null
							syncStoryProgress(latestStoryProgress.value, 'controlled')
						},
					})
					return tween
				}
			}
		}, scrollStory)
		revertScrollStory = () => context.revert()
		scrollTriggerRefresh = () => ScrollTrigger.refresh()
		inputRuntime = await createHomeStoryInput({
			getSnapshot: getInputSnapshot,
			commit: commitInputDirection,
			isIgnoredTarget: isIgnoredInputTarget,
		})
		window.addEventListener('resize', scheduleViewportRefresh, {
			passive: true,
		})
		viewportMedia?.addEventListener('resize', scheduleViewportRefresh)
	})

	onBeforeUnmount(() => {
		inputRuntime?.destroy()
		inputRuntime = null
		window.removeEventListener('resize', scheduleViewportRefresh)
		viewportMedia?.removeEventListener('resize', scheduleViewportRefresh)
		viewportMedia = null
		if (viewportResizeFrame !== null) {
			cancelAnimationFrame(viewportResizeFrame)
			viewportResizeFrame = null
		}
		activeScrollTween?.kill()
		activeScrollTween = null
		restoreControlledScrollBehavior?.()
		restoreControlledScrollBehavior = null
		revertScrollStory?.()
		revertScrollStory = null
		scrollTriggerRefresh = null
		seekScrollStory = null
	})

	return {
		scrollStoryRef,
		storyLayout,
		storyState,
		sceneStoryHeightDvh,
		sceneStoryHeightStyle,
		heroActive,
		overviewPhase,
		outroProgress,
		activePlayerIndex,
		playerCarouselProgress,
		playerStackEntryProgress,
		playerStackExitProgress,
		mapOpacity,
		scrollToPlayerFocus,
		refreshScrollStory,
		reapplyMapProgress,
	}
}
