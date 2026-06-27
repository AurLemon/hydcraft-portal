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
					v-for="(member, memberIndex) in members"
					:key="member.id"
					class="shrink-0 grow-0"
					:class="visibleArchitectCount > 1 ? 'w-1/2' : 'w-full'"
				>
					<div class="relative h-full">
						<article
							class="relative min-h-140 lg:min-h-112 flex flex-col text-slate-950 dark:text-slate-50"
						>
							<div
								class="absolute inset-y-0 left-0 right-0 overflow-hidden pointer-events-none"
								:class="{
									'architect-scene--overlap-right':
										visibleArchitectCount > 1 &&
										memberIndex < members.length - 1,
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
								class="relative z-10 flex flex-1 h-full items-end p-8 pb-10 lg:pb-8 pt-16 sm:pt-18"
							>
								<div class="flex w-full items-end gap-4">
									<div
										class="shrink-0 transform-[translateY(0px)_rotate(-8deg)] lg:transform-[translateY(20px)_rotate(-8deg)] origin-center"
									>
										<IntroMinecraftSkinViewer
											v-if="
												hasEnteredViewportOnce &&
												isArchitectVisible(memberIndex)
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
											class="line-clamp-5 lg:line-clamp-4 mt-1 max-w-136 text-sm leading-7 text-white lg:h-28"
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
						v-for="pageIndex in architectPageCount"
						:key="`architect-dot-${pageIndex - 1}`"
						type="button"
						class="block size-1.5 rounded-full transition-all duration-200"
						:class="
							pageIndex - 1 === currentArchitectPage
								? 'bg-white'
								: 'bg-white/35 hover:bg-white/60'
						"
						:aria-label="gotoLabel(pageIndex)"
						@click="goToArchitectPage(pageIndex - 1)"
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

const architectMaxPageIndex = computed(() =>
	Math.max(0, props.members.length - visibleArchitectCount.value),
)

const architectPageCount = computed(() => architectMaxPageIndex.value + 1)

const showArchitectControls = computed(() => architectPageCount.value > 1)

const architectTrackStyle = computed(() => ({
	transform: `translate3d(-${
		currentArchitectPage.value * (100 / visibleArchitectCount.value)
	}%, 0, 0)`,
}))

const isArchitectVisible = (memberIndex: number) =>
	memberIndex >= currentArchitectPage.value &&
	memberIndex < currentArchitectPage.value + visibleArchitectCount.value

const stopArchitectCarousel = () => {
	if (architectCarouselTimer) {
		clearInterval(architectCarouselTimer)
		architectCarouselTimer = null
	}
}

const startArchitectCarousel = () => {
	stopArchitectCarousel()
	if (architectPageCount.value <= 1) {
		return
	}
	architectCarouselTimer = setInterval(() => {
		currentArchitectPage.value =
			(currentArchitectPage.value + 1) % architectPageCount.value
	}, ARCHITECT_CAROUSEL_INTERVAL)
}

const resetArchitectCarousel = () => {
	startArchitectCarousel()
}

const goNextArchitectPage = () => {
	currentArchitectPage.value =
		(currentArchitectPage.value + 1) % architectPageCount.value
	resetArchitectCarousel()
}

const goPrevArchitectPage = () => {
	currentArchitectPage.value =
		(currentArchitectPage.value - 1 + architectPageCount.value) %
		architectPageCount.value
	resetArchitectCarousel()
}

const goToArchitectPage = (pageIndex: number) => {
	currentArchitectPage.value = pageIndex
	resetArchitectCarousel()
}

watch([() => props.members.length, visibleArchitectCount], () => {
	if (currentArchitectPage.value > architectMaxPageIndex.value) {
		currentArchitectPage.value = architectMaxPageIndex.value
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
	z-index: 0;
	-webkit-mask-image: linear-gradient(
		78deg,
		rgba(0, 0, 0, 1) 0%,
		rgba(0, 0, 0, 1) 72%,
		rgba(0, 0, 0, 0.82) 82%,
		rgba(0, 0, 0, 0.4) 90%,
		rgba(0, 0, 0, 0.08) 96%,
		rgba(0, 0, 0, 0) 99%
	);
	mask-image: linear-gradient(
		78deg,
		rgba(0, 0, 0, 1) 0%,
		rgba(0, 0, 0, 1) 72%,
		rgba(0, 0, 0, 0.82) 82%,
		rgba(0, 0, 0, 0.4) 90%,
		rgba(0, 0, 0, 0.08) 96%,
		rgba(0, 0, 0, 0) 99%
	);
}

.architect-scene--overlap-left {
	left: -20%;
	z-index: 1;
	-webkit-mask-image: linear-gradient(
		102deg,
		rgba(0, 0, 0, 0) 1%,
		rgba(0, 0, 0, 0.08) 6%,
		rgba(0, 0, 0, 0.38) 14%,
		rgba(0, 0, 0, 0.78) 22%,
		rgba(0, 0, 0, 1) 30%,
		rgba(0, 0, 0, 1) 96%
	);
	mask-image: linear-gradient(
		102deg,
		rgba(0, 0, 0, 0) 1%,
		rgba(0, 0, 0, 0.08) 6%,
		rgba(0, 0, 0, 0.38) 14%,
		rgba(0, 0, 0, 0.78) 22%,
		rgba(0, 0, 0, 1) 30%,
		rgba(0, 0, 0, 1) 96%
	);
}
</style>
