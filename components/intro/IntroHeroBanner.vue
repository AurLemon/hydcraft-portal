<template>
	<section
		class="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
	>
		<div class="absolute inset-0">
			<SkeletonImage
				:src="stableIntroCover"
				:alt="t('content.intro.hero.coverAlt')"
				class="h-full w-full"
				image-class="block h-full w-full object-cover brightness-105 dark:brightness-110"
				skeleton-class="rounded-none"
				loading="eager"
			/>
		</div>
		<div
			class="pointer-events-none absolute inset-0 z-10 bg-linear-to-t from-slate-500/78 dark:from-slate-950/78 via-transparent dark:via-slate-950/1 to-transparent backdrop-blur-sm mask-[linear-gradient(to_top,black_0%,rgba(0,0,0,0.92)_18%,rgba(0,0,0,0.5)_34%,transparent_62%)]"
		/>
		<div
			class="relative z-20 flex min-h-170 flex-col justify-end px-6 py-8 lg:px-10 lg:py-10"
		>
			<div
				class="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"
			>
				<div class="flex flex-col items-start gap-4 lg:mb-6">
					<div class="flex flex-col">
						<div class="flex items-center gap-1">
							<span
								class="text-xs tracking-widest uppercase text-white [text-shadow:0_1px_2px_rgba(15,23,42,0.5)]"
							>
								{{ t('content.intro.hero.eyebrow') }}
							</span>
							<UBadge
								color="neutral"
								variant="subtle"
								size="xs"
								class="leading-[normal]"
							>
								{{ currentYear }}
							</UBadge>
						</div>

						<h1
							class="mb-1 font-arkpixel text-6xl leading-tight tracking-wider text-white [text-shadow:0_2px_10px_rgba(15,23,42,0.5)] sm:text-6xl lg:text-7xl"
						>
							{{ t('content.intro.hero.title') }}
						</h1>

						<div
							class="flex items-baseline gap-2 font-arkpixel text-3xl uppercase tracking-wide text-white dark:text-slate-100 [text-shadow:0_1px_4px_rgba(15,23,42,0.5)] sm:text-3xl"
						>
							<span>{{ t('content.intro.hero.subtitle') }}</span>
							<span
								class="select-none text-base text-white sm:text-lg"
								aria-hidden="true"
							>
								※
							</span>
						</div>
					</div>

					<ul class="mt-2 flex flex-col gap-2">
						<li
							v-for="(item, index) in highlights"
							:key="index"
							class="flex items-center gap-2 text-sm text-white dark:text-slate-100/95 [text-shadow:0_1px_2px_rgba(15,23,42,0.5)] sm:text-base"
						>
							<span
								class="shrink-0 select-none leading-none text-slate-300"
								aria-hidden="true"
							>
								—
							</span>
							<span class="min-w-0">{{ item }}</span>
							<span
								class="ml-2 inline-flex shrink-0 items-center gap-1 font-arkpixel text-[13px] leading-none text-emerald-200/95"
							>
								<UIcon name="i-lucide-check" class="size-5" />
								<span>{{ highlightBadges[index] }}</span>
							</span>
						</li>
					</ul>
				</div>

				<div
					class="pointer-events-none flex w-full max-w-full gap-3 self-end lg:w-fit"
				>
					<div
						v-for="card in heroToastCards"
						:key="card.key"
						class="relative w-full max-w-full min-w-0 overflow-hidden rounded-md drop-shadow-[0_14px_30px_rgba(15,23,42,0.34)] lg:w-50"
					>
						<img
							:src="stableToastFrame"
							alt=""
							aria-hidden="true"
							class="absolute inset-0 h-full w-full object-fill select-none"
						/>
						<div class="absolute inset-0 bg-slate-950/10" />
						<div
							class="relative z-10 flex h-full min-h-16 items-center gap-2.5 px-4 py-2.5"
						>
							<img
								:src="card.iconSrc"
								alt=""
								aria-hidden="true"
								class="h-8 w-8 shrink-0 select-none [image-rendering:pixelated]"
							/>
							<div
								class="flex min-w-0 items-baseline gap-1 font-arkpixel leading-[normal] tracking-wide text-[#fff4cc] [text-shadow:0_1px_0_rgba(15,23,42,0.8)]"
							>
								<span v-if="card.prefix" class="text-base">
									{{ card.prefix }}
								</span>
								<span v-if="card.accent" class="text-2xl leading-none">
									{{ card.accent }}
								</span>
								<span v-if="card.suffix" class="text-base">
									{{ card.suffix }}
								</span>
								<span v-if="card.label" class="text-base">
									{{ card.label }}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import toastFrame from '~/assets/resources/material/minecraft_achievement_toast_frame.webp'
import barrierIcon from '~/assets/resources/material/minecraft_item_barrier.webp'
import clockIcon from '~/assets/resources/material/minecraft_item_clock.webp'
import introCover from '~/assets/resources/pages/intro_cover.webp'
import { getStableAssetUrl } from '~/utils/assets/stable-asset-url'

const { t } = useI18n()

const introNow = useState<number>('intro-hero-now', () => Date.now())
const stableIntroCover = getStableAssetUrl(introCover)
const stableToastFrame = getStableAssetUrl(toastFrame)
const stableBarrierIcon = getStableAssetUrl(barrierIcon)
const stableClockIcon = getStableAssetUrl(clockIcon)

const currentYear = dayjs(introNow.value).year()
const serverEstablishedAt = dayjs('2018-09-01')

const HIGHLIGHT_COUNT = 4

interface HeroToastCard {
	accent?: string
	iconSrc: string
	key: string
	label?: string
	prefix?: string
	suffix?: string
}

const highlights = computed<string[]>(() =>
	Array.from({ length: HIGHLIGHT_COUNT }, (_, index) =>
		t(`content.intro.hero.highlights.${index}`),
	),
)

const highlightBadges = computed<string[]>(() =>
	Array.from({ length: HIGHLIGHT_COUNT }, (_, index) =>
		t(`content.intro.hero.highlightBadges.${index}`),
	),
)

const serverAgeYears = computed<number>(() =>
	dayjs(introNow.value).diff(serverEstablishedAt, 'year'),
)

const heroToastCards = computed<HeroToastCard[]>(() => [
	{
		accent: String(serverAgeYears.value),
		iconSrc: stableClockIcon,
		key: 'anniversary',
		prefix: t('content.intro.hero.toasts.anniversaryPrefix'),
		suffix: t('content.intro.hero.toasts.anniversarySuffix'),
	},
	{
		iconSrc: stableBarrierIcon,
		key: 'pipeline',
		label: t('content.intro.hero.toasts.pipeline'),
	},
])
</script>
