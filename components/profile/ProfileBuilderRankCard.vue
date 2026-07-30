<template>
	<section
		ref="cardRef"
		:class="profileCardClass"
		@pointerenter="handlePointerEnter"
		@pointermove="handlePointerMove"
		@pointerleave="handlePointerLeave"
	>
		<div class="flex items-center justify-between gap-3">
			<h3 :class="sideTitleClass" class="leading-[normal]">
				{{ t('profile.public.builderRanks.title') }}
			</h3>
			<NuxtLink
				:to="{ path: localePath('/server/charter'), hash: charterAnchor }"
				class="inline-flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white leading-[normal]"
			>
				{{ t('profile.public.builderRanks.viewSystem') }}
				<UIcon name="i-lucide-arrow-up-right" class="size-3.5" />
			</NuxtLink>
		</div>

		<div class="mt-4 md:mt-2 flex flex-col gap-1.5">
			<div
				:class="[
					'md:w-full! flex size-24 items-center justify-center overflow-hidden rank-emblem-shell',
				]"
			>
				<div
					class="rank-emblem-image relative size-30 overflow-hidden"
					:style="emblemStyle"
				>
					<img
						:src="visual.icon"
						:alt="rankLabel"
						class="size-30 max-w-none object-contain select-none"
					/>
					<img
						:src="visual.icon"
						alt=""
						aria-hidden="true"
						:data-hologram-active="hologramActive"
						:data-hologram-looping="hologramLooping"
						@animationend="handleHologramEnd"
						@animationiteration="handleHologramIteration"
						class="rank-emblem-hologram absolute inset-0 size-30 max-w-none object-contain select-none"
					/>
				</div>
			</div>
			<div class="min-w-0">
				<div
					class="flex gap-x-1 flex-wrap md:justify-center items-baseline font-medium text-2xl md:text-center md:text-[28px] leading-[normal]"
					:class="visual.titleClass"
				>
					<span class="uppercase">
						{{ rankLabel }}
					</span>

					<span
						v-if="locale !== 'en-US'"
						class="block md:hidden text-sm text-slate-600 dark:text-slate-300"
					>
						{{ visual.englishLabel }}
					</span>
				</div>
				<p
					v-show="locale !== 'en-US'"
					class="hidden md:block text-sm text-slate-600 dark:text-slate-300 md:text-center"
				>
					{{ visual.englishLabel }}
				</p>
				<p
					:lang="activeLocale"
					class="mt-1.5 md:mt-3 text-sm text-justify hyphens-auto break-words text-slate-600 dark:text-slate-300"
				>
					{{ description }}
				</p>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import {
	getBuilderRankCharterAnchor,
	getBuilderRankComment,
	getBuilderRankVisual,
	type BuilderRankLocale,
	type BuilderRankSummary,
} from '~/utils/profile/builder-ranks'
import { profileCardClass } from '~/utils/profile/edit'

interface ProfileBuilderRankCardProps {
	builderRank: BuilderRankSummary
}

const INITIAL_HOLOGRAM_DELAY_MS = 700

const props = defineProps<ProfileBuilderRankCardProps>()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const cardRef = ref<HTMLElement | null>(null)
const hologramActive = ref(false)
const hologramLooping = ref(false)
const hologramStopRequested = ref(false)
const isPointerInside = ref(false)
const supportsFineHover = ref(false)
const pointerPosition = reactive({ x: 0.5, y: 0.5 })
let hologramFrame: number | null = null
let hologramObserver: IntersectionObserver | null = null
let initialHologramTimer: number | null = null
const visual = computed(() => getBuilderRankVisual(props.builderRank.rank))
const activeLocale = computed(() => locale.value as BuilderRankLocale)
const rankLabel = computed(() =>
	t(`profile.public.builderRanks.ranks.${props.builderRank.rank}`),
)
const description = computed(
	() =>
		getBuilderRankComment(props.builderRank.comments, activeLocale.value) ??
		t(`profile.public.builderRanks.fallback.${props.builderRank.rank}`),
)
const charterAnchor = computed(() =>
	getBuilderRankCharterAnchor(activeLocale.value),
)
const sideTitleClass =
	'text-base font-medium text-slate-700 dark:text-slate-200'

const emblemStyle = computed(() => {
	const rotateX = (pointerPosition.y - 0.5) * 10
	const rotateY = (0.5 - pointerPosition.x) * 12
	const translateX = (0.5 - pointerPosition.x) * 4
	const translateY = (0.5 - pointerPosition.y) * 4

	return {
		transform: `perspective(360px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translate3d(${translateX}px, ${translateY}px, 0)`,
	}
})

const updatePointerPosition = (event: PointerEvent): void => {
	const card = cardRef.value

	if (!card) {
		return
	}

	const rect = card.getBoundingClientRect()
	pointerPosition.x = Math.min(
		Math.max((event.clientX - rect.left) / rect.width, 0),
		1,
	)
	pointerPosition.y = Math.min(
		Math.max((event.clientY - rect.top) / rect.height, 0),
		1,
	)
}

const handlePointerEnter = (event: PointerEvent): void => {
	if (!supportsFineHover.value || event.pointerType !== 'mouse') {
		return
	}

	if (initialHologramTimer !== null) {
		window.clearTimeout(initialHologramTimer)
		initialHologramTimer = null
	}

	isPointerInside.value = true
	triggerHologram(true)
	updatePointerPosition(event)
}

const handlePointerMove = (event: PointerEvent): void => {
	if (event.pointerType === 'mouse') {
		updatePointerPosition(event)
	}
}

const handlePointerLeave = (): void => {
	isPointerInside.value = false

	if (hologramFrame !== null) {
		window.cancelAnimationFrame(hologramFrame)
		hologramFrame = null
		hologramActive.value = false
		hologramLooping.value = false
	} else if (hologramActive.value && hologramLooping.value) {
		hologramStopRequested.value = true
	}

	pointerPosition.x = 0.5
	pointerPosition.y = 0.5
}

const triggerHologram = (looping: boolean): void => {
	hologramStopRequested.value = false

	if (hologramActive.value) {
		hologramLooping.value = looping
		return
	}

	hologramActive.value = false
	hologramLooping.value = looping

	if (hologramFrame !== null) {
		window.cancelAnimationFrame(hologramFrame)
	}

	hologramFrame = window.requestAnimationFrame(() => {
		hologramActive.value = true
		hologramFrame = null
	})
}

const handleHologramEnd = (): void => {
	if (!hologramLooping.value) {
		hologramActive.value = false
	}
}

const handleHologramIteration = (): void => {
	if (!hologramStopRequested.value) {
		return
	}

	hologramStopRequested.value = false
	hologramLooping.value = false
	hologramActive.value = false
}

const scheduleInitialHologram = (): void => {
	if (initialHologramTimer !== null) {
		return
	}

	initialHologramTimer = window.setTimeout(() => {
		initialHologramTimer = null

		if (!isPointerInside.value) {
			triggerHologram(!supportsFineHover.value)
		}
	}, INITIAL_HOLOGRAM_DELAY_MS)
}

onMounted(() => {
	const card = cardRef.value
	supportsFineHover.value = window.matchMedia(
		'(hover: hover) and (pointer: fine)',
	).matches

	if (!card) {
		return
	}

	if (!('IntersectionObserver' in window)) {
		scheduleInitialHologram()
		return
	}

	hologramObserver = new IntersectionObserver(
		(entries) => {
			if (!entries.some((entry) => entry.isIntersecting)) {
				return
			}

			hologramObserver?.disconnect()
			hologramObserver = null

			if (!isPointerInside.value) {
				scheduleInitialHologram()
			}
		},
		{ threshold: 0.35 },
	)
	hologramObserver.observe(card)
})

onBeforeUnmount(() => {
	hologramObserver?.disconnect()
	hologramObserver = null

	if (initialHologramTimer !== null) {
		window.clearTimeout(initialHologramTimer)
		initialHologramTimer = null
	}

	if (hologramFrame !== null) {
		window.cancelAnimationFrame(hologramFrame)
	}
})
</script>

<style scoped>
.rank-emblem-shell {
	transform-style: preserve-3d;
}

.rank-emblem-image {
	position: relative;
	transition: transform 180ms ease-out;
	transform-style: preserve-3d;
	will-change: transform;
}

.rank-emblem-shell img:not(.rank-emblem-hologram) {
	position: relative;
	z-index: 1;
	filter: drop-shadow(0 3px 5px rgb(15 23 42 / 0.16));
	transform: translateZ(14px);
	transition: filter 180ms ease-out;
}

.rank-emblem-shell .rank-emblem-hologram {
	z-index: 2;
	pointer-events: none;
	filter: brightness(1.45) saturate(1.06);
	opacity: 0;
	mask-image: linear-gradient(
		108deg,
		transparent 0%,
		rgb(0 0 0 / 0.18) 28%,
		rgb(0 0 0 / 0.9) 48%,
		black 52%,
		rgb(0 0 0 / 0.18) 72%,
		transparent 100%
	);
	mask-position: -40% 0;
	mask-repeat: no-repeat;
	mask-size: 32% 100%;
	-webkit-mask-image: linear-gradient(
		108deg,
		transparent 0%,
		rgb(0 0 0 / 0.18) 28%,
		rgb(0 0 0 / 0.9) 48%,
		black 52%,
		rgb(0 0 0 / 0.18) 72%,
		transparent 100%
	);
	-webkit-mask-position: -40% 0;
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-size: 32% 100%;
}

.rank-emblem-hologram[data-hologram-active='true'][data-hologram-looping='false'] {
	animation: rank-emblem-hologram 1.4s ease-out both;
}

.rank-emblem-hologram[data-hologram-active='true'][data-hologram-looping='true'] {
	animation: rank-emblem-hologram 1.4s ease-out infinite;
}

@keyframes rank-emblem-hologram {
	0% {
		opacity: 0;
		mask-position: -40% 0;
		-webkit-mask-position: -40% 0;
	}

	18% {
		opacity: 0.64;
	}

	72% {
		opacity: 0.28;
	}

	100% {
		opacity: 0;
		mask-position: 140% 0;
		-webkit-mask-position: 140% 0;
	}
}

@media (prefers-reduced-motion: reduce) {
	.rank-emblem-hologram {
		animation: none;
	}

	.rank-emblem-image {
		transition: none;
	}
}
</style>
