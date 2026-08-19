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
const CLICK_FOCUS_SCROLL_SECONDS = 1.1
const COMMUNITY_PHASE_HYSTERESIS = 0.01
const NAVIGATION_EPSILON = 0.0005
const STORY_INPUT_ENTRY_TOLERANCE_PX = 24

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
			return (
				segment.index -
				1 +
				smoothStepProgress(
					(progress - segment.transitionStart) /
						Math.max(segment.focusStart - segment.transitionStart, 0.0001),
				)
			)
		}
	}

	return segments.at(-1)?.index ?? 0
}

const resolveStoryPhase = (
	progress: number,
	layout: HomeStoryLayout,
): HomeOverviewPhase => {
	if (progress <= NAVIGATION_EPSILON) return 'hidden'
	if (progress < layout.playerEntryProgressEnd) return 'scene'
	if (progress < layout.communityProgressEnd) return 'players'
	if (progress < layout.outroPresentationEnd) return 'community'
	return 'outro'
}

const resolveRenderPhase = (
	progress: number,
	layout: HomeStoryLayout,
): HomeStoryRenderState['phase'] => {
	if (progress <= NAVIGATION_EPSILON) return 'hero'
	if (progress < layout.playerEntryProgressEnd) return 'scene'
	if (progress < layout.communityProgressEnd) return 'players'
	if (progress < layout.outroPresentationEnd) return 'community'
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
		hero: [0, layout.playerEntryProgressEnd],
		scene: [0, layout.playerEntryProgressEnd],
		players: [layout.playerEntryProgressEnd, layout.communityProgressEnd],
		community: [layout.communityProgressEnd, layout.outroPresentationEnd],
		outro: [layout.outroPresentationStart, layout.outroPresentationEnd],
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
	const storyInputActive = ref(false)
	const storyTouchInputControlled = ref(false)
	const heroActive = ref(true)
	const overviewPhase = ref<HomeOverviewPhase>('hidden')
	const outroProgress = ref(0)
	const activePlayerIndex = ref(0)
	const playerCarouselProgress = ref(0)
	const playerStackEntryProgress = ref(0)
	const playerStackExitProgress = ref(0)
	const mapOpacity = ref(1)
	const navigationStatus = ref<HomeStoryNavigationStatus>('idle')
	const settledStopIndex = ref(0)
	const targetStopIndex = ref<number | null>(null)
	const inputEnded = ref(true)
	const transitionSettled = ref(true)
	const playerActionVisible = ref(true)
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
				ease: string,
				onComplete: () => void,
				onInterrupt: () => void,
		  ) => { kill(): void })
		| null = null
	let inputRuntime: HomeStoryInputRuntime | null = null
	let activeScrollTween: { kill(): void } | null = null
	let restoreControlledScrollBehavior: (() => void) | null = null
	let viewportResizeFrame: number | null = null
	let viewportMedia: VisualViewport | null = null
	let progressFrame: number | null = null
	let pendingProgress: {
		value: number
		source: 'native' | 'controlled' | 'refresh'
	} | null = null
	let lastAppliedProgress = -1

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
			playerActionVisible: playerActionVisible.value,
		}
	})
	const syncPlayerActionVisibility = (): void => {
		const stop = storyLayout.value.stops[settledStopIndex.value]
		playerActionVisible.value = Boolean(
			navigationStatus.value === 'idle' && stop?.id === 'player',
		)
	}

	const dispatchStoryEvent = (event: HomeStoryEvent): void => {
		if (event.type === 'navigation-started') {
			navigationStatus.value = 'transitioning'
			targetStopIndex.value = event.toIndex
			transitionSettled.value = false
			playerActionVisible.value = false
		}
		if (event.type === 'navigation-settled') {
			inputRuntime?.handleNavigationSettled()
			navigationStatus.value = 'idle'
			settledStopIndex.value = event.index
			targetStopIndex.value = null
			transitionSettled.value = true
			const stop = storyLayout.value.stops[event.index]
			if (stop?.id === 'player' && stop.playerIndex !== undefined) {
				activePlayerIndex.value = stop.playerIndex
			}
			syncPlayerActionVisibility()
		}
	}

	const syncStoryProgress = (
		progress: number,
		source: 'native' | 'controlled' | 'refresh' = 'native',
	): void => {
		const normalized = clampProgress(progress)
		const layout = storyLayout.value
		const previousPhase = overviewPhase.value
		latestStoryProgress.value = normalized
		dispatchStoryEvent({ type: 'scroll-sampled', progress: normalized, source })
		if (navigationStatus.value === 'idle') {
			const exactStop = layout.stops.find(
				(stop) => Math.abs(stop.progress - normalized) <= NAVIGATION_EPSILON,
			)
			if (exactStop) settledStopIndex.value = exactStop.index
		}
		heroActive.value = normalized < layout.playerEntryProgressEnd
		const resolvedPhase = resolveStoryPhase(normalized, layout)
		overviewPhase.value =
			previousPhase === 'community' &&
			resolvedPhase === 'players' &&
			normalized >= layout.communityProgressEnd - COMMUNITY_PHASE_HYSTERESIS
				? 'community'
				: resolvedPhase
		const communityToOutroProgress =
			(normalized - layout.outroPresentationStart) /
			Math.max(
				layout.outroPresentationEnd - layout.outroPresentationStart,
				0.01,
			)
		outroProgress.value = clampProgress(communityToOutroProgress)
		mapOpacity.value = 1 - Math.min(outroProgress.value * 3.2, 1)
		playerStackEntryProgress.value = clampProgress(
			normalized / Math.max(layout.playerEntryProgressEnd, 0.0001),
		)
		playerStackExitProgress.value = clampProgress(
			(normalized - layout.focusProgressEnd) /
				Math.max(layout.communityProgressEnd - layout.focusProgressEnd, 0.0001),
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
			const nearestPlayer = Math.round(playerCarouselProgress.value)
			activePlayerIndex.value = Math.min(
				Math.max(nearestPlayer, 0),
				options.playerCount.value - 1,
			)
			syncPlayerActionVisibility()
		}
	}
	const clearPendingProgress = (): void => {
		if (progressFrame !== null) {
			cancelAnimationFrame(progressFrame)
			progressFrame = null
		}
		pendingProgress = null
	}
	const applyMapProgress = (
		progress: number,
		source: 'native' | 'controlled' | 'refresh' = 'native',
	): void => {
		const normalized = clampProgress(progress)
		if (Math.abs(normalized - lastAppliedProgress) < 0.0001) return
		lastAppliedProgress = normalized
		options.homeMapRef.value?.setScrollProgress(normalized)
		syncStoryProgress(normalized, source)
	}
	const applyControlledProgress = (progress: number): void => {
		clearPendingProgress()
		lastAppliedProgress = -1
		applyMapProgress(progress, 'controlled')
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

	const seekToStop = (
		stopIndex: number,
		source: HomeStoryInputSource,
	): boolean => {
		if (!import.meta.client) return false
		const stop = storyLayout.value.stops[stopIndex]
		const transition = storyLayout.value.transitions.find(
			(candidate) => candidate.to.index === stopIndex,
		)
		if (!stop || navigationStatus.value === 'transitioning') return true
		if (
			stopIndex === settledStopIndex.value &&
			Math.abs(latestStoryProgress.value - stop.progress) <= NAVIGATION_EPSILON
		) {
			return true
		}

		dispatchStoryEvent({
			type: 'navigation-requested',
			direction: stopIndex > settledStopIndex.value ? 1 : -1,
			source,
		})
		dispatchStoryEvent({
			type: 'navigation-started',
			fromIndex: settledStopIndex.value,
			toIndex: stopIndex,
			source,
		})
		const target = resolveProgressTarget(stop.progress)
		const duration = window.matchMedia('(prefers-reduced-motion: reduce)')
			.matches
			? 0.01
			: source === 'card'
				? CLICK_FOCUS_SCROLL_SECONDS
				: (transition?.duration ?? CLICK_FOCUS_SCROLL_SECONDS)
		const ease = transition?.ease ?? 'power2.inOut'

		if (!seekScrollStory) {
			window.scrollTo({ top: target.scrollTop, behavior: 'auto' })
			applyControlledProgress(target.progress)
			dispatchStoryEvent({ type: 'navigation-settled', index: stopIndex })
			return true
		}

		activeScrollTween?.kill()
		activeScrollTween = seekScrollStory(
			target,
			duration,
			ease,
			() => {
				activeScrollTween = null
				applyControlledProgress(target.progress)
				dispatchStoryEvent({ type: 'navigation-settled', index: stopIndex })
			},
			() => {
				if (
					stop.id === 'community' &&
					latestStoryProgress.value > storyLayout.value.communityProgressEnd
				) {
					window.scrollTo({ top: target.scrollTop, behavior: 'auto' })
					applyControlledProgress(target.progress)
					dispatchStoryEvent({ type: 'navigation-settled', index: stopIndex })
				}
			},
		)
		return true
	}

	const scrollToPlayerFocus = (
		playerIndex: number,
		source: HomeStoryInputSource = 'card',
	): void => {
		const stopIndex = storyLayout.value.stops.findIndex(
			(stop) => stop.id === 'player' && stop.playerIndex === playerIndex,
		)
		if (stopIndex < 0) return
		seekToStop(stopIndex, source)
	}

	const resolveDirectionalStopIndex = (
		direction: HomeStoryDirection,
	): number | null => {
		const progress = latestStoryProgress.value
		const stops = storyLayout.value.stops
		if (direction === 1) {
			return (
				stops.find((stop) => stop.progress > progress + NAVIGATION_EPSILON)
					?.index ?? null
			)
		}
		return (
			stops
				.slice()
				.reverse()
				.find((stop) => stop.progress < progress - NAVIGATION_EPSILON)?.index ??
			null
		)
	}

	const commitInputDirection = (
		direction: HomeStoryDirection,
		source: HomeStoryInputSource,
	): boolean => {
		const targetStopIndex = resolveDirectionalStopIndex(direction)
		if (targetStopIndex === null) return false
		return seekToStop(targetStopIndex, source)
	}

	const getInputSnapshot = (): HomeStoryInputSnapshot => {
		return {
			progress: latestStoryProgress.value,
			storyStart: 0,
			storyEnd: 1,
			storyViewportActive: storyInputActive.value,
			storyScrollDistancePx: storyLayout.value.storyScrollDistancePx,
			stopProgresses: storyLayout.value.stops.map((stop) => stop.progress),
			settledStopIndex: settledStopIndex.value,
			navigationStatus: navigationStatus.value,
			inputEnded: inputEnded.value,
		}
	}

	const isIgnoredInputTarget = (target: EventTarget | null): boolean => {
		if (!(target instanceof Element)) return false
		return Boolean(target.closest('[data-home-detail-scroll]'))
	}

	const releaseStoryBoundary = (direction: HomeStoryDirection): void => {
		const target = resolveProgressTarget(direction === 1 ? 1 : 0)
		window.scrollTo({
			top: target.scrollTop + direction * 2,
			behavior: 'auto',
		})
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
			const heightChanged = Math.abs(nextHeight - viewportHeightPx.value) >= 1
			if (heightChanged) {
				viewportHeightPx.value = nextHeight
				dispatchStoryEvent({
					type: 'layout-refreshed',
					viewportHeightPx: nextHeight,
				})
			}
			viewportReady.value = true
			void nextTick(() => refreshScrollStory())
		})
	}

	watch(options.playerCount, () => {
		settledStopIndex.value = Math.min(
			settledStopIndex.value,
			storyLayout.value.stops.length - 1,
		)
		syncStoryProgress(latestStoryProgress.value, 'refresh')
		void nextTick(() => refreshScrollStory())
	})

	onMounted(async () => {
		storyTouchInputControlled.value = navigator.maxTouchPoints > 0
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
			pendingProgress = { value: progress, source }
			if (progressFrame !== null) return
			progressFrame = requestAnimationFrame(() => {
				progressFrame = null
				const pending = pendingProgress
				pendingProgress = null
				if (pending) applyMapProgress(pending.value, pending.source)
			})
		}

		gsap.registerPlugin(ScrollTrigger)
		const context = gsap.context(() => {
			const timelineClock = { progress: 0 }
			const syncStoryInputActive = (scrollTrigger: {
				start: number
				end: number
				scroll(): number
			}): void => {
				const scrollPosition = scrollTrigger.scroll()
				storyInputActive.value =
					scrollPosition >=
						scrollTrigger.start - STORY_INPUT_ENTRY_TOLERANCE_PX &&
					scrollPosition <= scrollTrigger.end
			}
			const timeline = gsap.timeline({
				scrollTrigger: {
					trigger: scrollStory,
					start: 'top top',
					end: 'bottom bottom',
					scrub: true,
					onEnter: (scrollTrigger) => {
						syncStoryInputActive(scrollTrigger)
					},
					onEnterBack: (scrollTrigger) => {
						syncStoryInputActive(scrollTrigger)
						timelineClock.progress = scrollTrigger.progress
						syncMapProgress(scrollTrigger.progress, 'native')
					},
					onLeave: (scrollTrigger) => {
						syncStoryInputActive(scrollTrigger)
						syncMapProgress(1, 'native')
					},
					onLeaveBack: (scrollTrigger) => {
						syncStoryInputActive(scrollTrigger)
					},
					onRefresh: (scrollTrigger) => {
						syncStoryInputActive(scrollTrigger)
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
				syncStoryInputActive(scrollTrigger)
				seekScrollStory = (target, duration, ease, onComplete, onInterrupt) => {
					const restoreScrollBehavior = useControlledScrollBehavior()
					const scrollClock = { value: scrollTrigger.scroll() }
					const tween = gsap.to(scrollClock, {
						value: target.scrollTop,
						duration,
						ease,
						overwrite: true,
						onUpdate: () => {
							window.scrollTo({
								top: scrollClock.value,
								behavior: 'auto',
							})
						},
						onComplete: () => {
							restoreScrollBehavior()
							onComplete()
						},
						onInterrupt: () => {
							restoreScrollBehavior()
							activeScrollTween = null
							navigationStatus.value = 'idle'
							targetStopIndex.value = null
							transitionSettled.value = true
							playerActionVisible.value = false
							syncStoryProgress(latestStoryProgress.value, 'controlled')
							onInterrupt()
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
			releaseBoundary: releaseStoryBoundary,
			isIgnoredTarget: isIgnoredInputTarget,
			setInputEnded: (value) => {
				inputEnded.value = value
				syncPlayerActionVisibility()
			},
		})
		window.addEventListener('resize', scheduleViewportRefresh, {
			passive: true,
		})
		viewportMedia?.addEventListener('resize', scheduleViewportRefresh)
		const storyTop = window.scrollY + scrollStory.getBoundingClientRect().top
		const storyScrollDistance = Math.max(
			scrollStory.offsetHeight - window.innerHeight,
			1,
		)
		syncMapProgress(
			(window.scrollY - storyTop) / storyScrollDistance,
			'refresh',
		)
	})

	onBeforeUnmount(() => {
		inputRuntime?.destroy()
		inputRuntime = null
		storyInputActive.value = false
		storyTouchInputControlled.value = false
		window.removeEventListener('resize', scheduleViewportRefresh)
		viewportMedia?.removeEventListener('resize', scheduleViewportRefresh)
		viewportMedia = null
		if (viewportResizeFrame !== null) {
			cancelAnimationFrame(viewportResizeFrame)
			viewportResizeFrame = null
		}
		clearPendingProgress()
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
		storyInputActive,
		storyTouchInputControlled,
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
		playerActionVisible,
		scrollToPlayerFocus,
		refreshScrollStory,
		reapplyMapProgress,
	}
}
