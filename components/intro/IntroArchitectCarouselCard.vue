<template>
	<article
		ref="cardElement"
		class="relative overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
	>
		<div
			class="pointer-events-none absolute inset-x-0 top-0 z-30 h-24 bg-[linear-gradient(180deg,rgba(15,23,42,0.42)_0%,rgba(15,23,42,0.14)_55%,rgba(15,23,42,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.74)_0%,rgba(2,6,23,0.24)_55%,rgba(2,6,23,0)_100%)]"
		/>
		<div
			class="absolute inset-x-4 top-4 z-40 flex items-baseline justify-between gap-3 sm:inset-x-5"
		>
			<div class="min-w-0">
				<div class="flex items-baseline gap-2">
					<h3 :class="titleClass">{{ title }}</h3>
					<span :class="subtitleClass">{{ subtitle }}</span>
				</div>
			</div>
			<UBadge color="neutral" variant="soft" size="sm" class="backdrop-blur-sm">
				{{ members.length }}
			</UBadge>
		</div>

		<div class="relative overflow-hidden">
			<div
				class="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
				:style="architectTrackStyle"
			>
				<div
					v-for="(page, pageIndex) in architectPages"
					:key="`architect-page-${pageIndex}`"
					class="w-full shrink-0 grow-0"
				>
					<div
						class="relative grid"
						:class="
							visibleArchitectCount > 1
								? 'grid-cols-2 gap-0'
								: 'grid-cols-1 gap-0'
						"
					>
						<article
							v-for="(member, memberIndex) in page"
							:key="member.id"
							class="relative min-h-140 lg:min-h-112 text-slate-950 dark:text-slate-50"
						>
							<div
								class="absolute inset-y-0 left-0 right-0 overflow-hidden pointer-events-none"
								:class="{
									'architect-scene--overlap-right':
										visibleArchitectCount > 1 && memberIndex < page.length - 1,
									'architect-scene--overlap-left':
										visibleArchitectCount > 1 && memberIndex > 0,
								}"
							>
								<img
									:src="member.imageUrl"
									:alt="member.id"
									class="h-full w-full scale-105 object-cover select-none"
								/>
								<div
									class="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.04)_20%,rgba(15,23,42,0.12)_44%,rgba(15,23,42,0.78)_100%)] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.16)_0%,rgba(2,6,23,0.04)_20%,rgba(2,6,23,0.28)_44%,rgba(2,6,23,0.9)_100%)]"
								/>
							</div>
							<div
								class="relative z-10 flex h-full items-end p-8 pb-10 lg:pb-8 pt-16 sm:pt-18"
							>
								<div class="flex w-full items-end gap-4">
									<div
										class="shrink-0 transform-[translateY(6px)_rotate(-8deg)] lg:transform-[translateY(20px)_rotate(-8deg)] origin-center"
									>
										<IntroMinecraftSkinViewer
											v-if="
												hasEnteredViewportOnce &&
												pageIndex === currentArchitectPage
											"
											:skin-url="member.skinUrl"
											viewer-class="h-56 w-28 drop-shadow-[0_14px_28px_rgba(15,23,42,0.35)]"
										/>
										<img
											v-else
											:src="member.bodyUrl"
											:alt="member.id"
											class="h-56 w-28 object-contain drop-shadow-[0_14px_28px_rgba(15,23,42,0.35)]"
										/>
									</div>
									<div
										class="min-w-0 flex-1 [text-shadow:0_1px_2px_rgba(15,23,42,0.5)]"
									>
										<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
											<p
												class="font-arkpixel text-2xl leading-none tracking-wide text-white"
											>
												{{ member.nickname }}
											</p>
											<p class="text-sm text-white sm:text-base">
												{{ member.id }}
											</p>
										</div>
										<p
											class="text-base truncate font-medium italic text-white font-serif"
										>
											{{ member.motto }}
										</p>
										<p
											class="line-clamp-8 lg:line-clamp-4 mt-1 max-w-136 text-sm leading-7 text-white"
										>
											{{ member.intro }}
										</p>
									</div>
								</div>
							</div>
						</article>
					</div>
				</div>
			</div>

			<div
				v-if="showArchitectControls"
				class="absolute inset-x-4 bottom-4 z-40 flex items-center justify-center gap-3 sm:inset-x-5"
			>
				<UButton
					color="neutral"
					variant="ghost"
					size="xs"
					icon="i-lucide-chevron-left"
					class="text-white hover:bg-white/14 hover:text-white dark:text-white dark:hover:bg-white/12"
					:aria-label="prevLabel"
					@click="goPrevArchitectPage"
				/>
				<div class="flex items-center gap-1.5">
					<button
						v-for="(_, pageIndex) in architectPages"
						:key="`architect-dot-${pageIndex}`"
						type="button"
						class="block size-1.5 rounded-full transition-all duration-200"
						:class="
							pageIndex === currentArchitectPage
								? 'bg-white'
								: 'bg-white/35 hover:bg-white/60'
						"
						:aria-label="gotoLabel(pageIndex + 1)"
						@click="goToArchitectPage(pageIndex)"
					/>
				</div>
				<UButton
					color="neutral"
					variant="ghost"
					size="xs"
					icon="i-lucide-chevron-right"
					class="text-white hover:bg-white/14 hover:text-white dark:text-white dark:hover:bg-white/12"
					:aria-label="nextLabel"
					@click="goNextArchitectPage"
				/>
			</div>
		</div>
	</article>
</template>

<script setup lang="ts">
export interface IntroArchitectCarouselMember {
	id: string
	nickname: string
	motto: string
	intro: string
	imageUrl: string
	bodyUrl: string
	skinUrl: string
}

interface IntroArchitectCarouselCardProps {
	title: string
	subtitle: string
	prevLabel: string
	nextLabel: string
	gotoLabel: (index: number) => string
	members: IntroArchitectCarouselMember[]
	titleClass?: string
	subtitleClass?: string
}

const props = withDefaults(defineProps<IntroArchitectCarouselCardProps>(), {
	titleClass: 'font-arkpixel text-lg leading-none tracking-wide text-white',
	subtitleClass: 'text-xs text-white/72',
})

const MOBILE_CAROUSEL_MAX_WIDTH = 639
const ARCHITECT_CAROUSEL_INTERVAL = 5000

const cardElement = useTemplateRef<HTMLElement>('cardElement')
const viewportWidth = ref(0)
const currentArchitectPage = ref(0)
const hasEnteredViewportOnce = ref(false)
let architectCarouselTimer: ReturnType<typeof setInterval> | null = null
let cardIntersectionObserver: IntersectionObserver | null = null

const updateViewportWidth = () => {
	viewportWidth.value = window.innerWidth
}

const visibleArchitectCount = computed(() =>
	viewportWidth.value <= MOBILE_CAROUSEL_MAX_WIDTH ? 1 : 2,
)

const architectPages = computed<IntroArchitectCarouselMember[][]>(() => {
	const items = props.members
	const visibleCount = visibleArchitectCount.value

	if (items.length <= visibleCount) {
		return [items]
	}

	return Array.from({ length: items.length - visibleCount + 1 }, (_, index) =>
		items.slice(index, index + visibleCount),
	)
})

const showArchitectControls = computed(() => architectPages.value.length > 1)

const architectTrackStyle = computed(() => ({
	transform: `translate3d(-${currentArchitectPage.value * 100}%, 0, 0)`,
}))

const stopArchitectCarousel = () => {
	if (architectCarouselTimer) {
		clearInterval(architectCarouselTimer)
		architectCarouselTimer = null
	}
}

const startArchitectCarousel = () => {
	stopArchitectCarousel()
	if (architectPages.value.length <= 1) {
		return
	}
	architectCarouselTimer = setInterval(() => {
		currentArchitectPage.value =
			(currentArchitectPage.value + 1) % architectPages.value.length
	}, ARCHITECT_CAROUSEL_INTERVAL)
}

const resetArchitectCarousel = () => {
	startArchitectCarousel()
}

const goNextArchitectPage = () => {
	currentArchitectPage.value =
		(currentArchitectPage.value + 1) % architectPages.value.length
	resetArchitectCarousel()
}

const goPrevArchitectPage = () => {
	currentArchitectPage.value =
		(currentArchitectPage.value - 1 + architectPages.value.length) %
		architectPages.value.length
	resetArchitectCarousel()
}

const goToArchitectPage = (pageIndex: number) => {
	currentArchitectPage.value = pageIndex
	resetArchitectCarousel()
}

watch(architectPages, (pages) => {
	if (currentArchitectPage.value >= pages.length) {
		currentArchitectPage.value = 0
	}

	startArchitectCarousel()
})

onMounted(() => {
	updateViewportWidth()
	window.addEventListener('resize', updateViewportWidth)
	if (cardElement.value) {
		cardIntersectionObserver = new IntersectionObserver(
			([entry]) => {
				if (!entry?.isIntersecting || hasEnteredViewportOnce.value) {
					return
				}

				hasEnteredViewportOnce.value = true
				cardIntersectionObserver?.disconnect()
				cardIntersectionObserver = null
			},
			{
				threshold: 0.05,
			},
		)
		cardIntersectionObserver.observe(cardElement.value)
	}
	startArchitectCarousel()
})

onBeforeUnmount(() => {
	stopArchitectCarousel()
	window.removeEventListener('resize', updateViewportWidth)
	cardIntersectionObserver?.disconnect()
	cardIntersectionObserver = null
})
</script>

<style scoped>
.architect-scene--overlap-right {
	right: -20%;
}

.architect-scene--overlap-left {
	left: -20%;
	z-index: 1;
	mask-image: linear-gradient(
		102deg,
		rgba(0, 0, 0, 0) 0%,
		rgba(0, 0, 0, 0.08) 8%,
		rgba(0, 0, 0, 0.38) 17%,
		rgba(0, 0, 0, 0.78) 26%,
		rgba(0, 0, 0, 1) 34%,
		rgba(0, 0, 0, 1) 100%
	);
}
</style>
