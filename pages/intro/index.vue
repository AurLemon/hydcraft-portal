<template>
	<div class="flex flex-col gap-16">
		<IntroHeroBanner />
		<IntroRequirementsCard />
		<IntroMarquee
			:title="t('content.intro.ourWorks.title')"
			:images="serverShowcaseImages"
		/>
		<IntroMarquee
			:title="t('content.intro.goodAndBad.title')"
			:images="serverDarkSideImages"
		/>
		<IntroDailyLifeCard
			:title="t('content.intro.dailyLife.title')"
			:items="dailyLifeItems"
		/>
		<IntroRailwaysCard />
		<section class="flex flex-col gap-6">
			<div class="flex justify-center">
				<h2
					class="text-center font-arkpixel text-3xl leading-tight tracking-wider text-slate-950 dark:text-slate-50 sm:text-4xl"
				>
					{{ t('content.intro.participation.title') }}
				</h2>
			</div>
			<IntroParticipationMap />
		</section>
		<section class="flex flex-col gap-6">
			<div class="flex justify-center">
				<h2
					class="text-center font-arkpixel text-3xl leading-tight tracking-wider text-slate-950 dark:text-slate-50 sm:text-4xl"
				>
					{{ t('content.intro.fit.title') }}
				</h2>
			</div>
			<IntroFitCard />
		</section>
		<IntroCommunityChatSection />
		<section class="flex flex-col gap-6">
			<div class="flex justify-center">
				<h2
					class="text-center font-arkpixel text-3xl leading-tight tracking-wider text-slate-950 dark:text-slate-50 sm:text-4xl"
				>
					{{ t('content.intro.staff.title') }}
				</h2>
			</div>
			<IntroStaffCard />
			<IntroChiefArchitectCard />
			<IntroSeniorArchitectCard />
		</section>
		<IntroBeyondServerSection />
		<IntroFaq />
		<IntroJoinUsCard />
	</div>
</template>

<script setup lang="ts">
import type { NormalizedContentImageItem } from '~/components/content/utils/content-image'
import { getSiteMediaUrl } from '~/utils/assets/site-media-url'

definePageMeta({
	headerVariant: 'solid',
})

interface IntroImageGroupOptions {
	altKey: string
	paths: string[]
}

const unfinishedImagePaths = [
	'minecraft-gallery/unfinished/unfinished_screenshots_1.webp',
	'minecraft-gallery/unfinished/unfinished_screenshots_2.webp',
	'minecraft-gallery/unfinished/unfinished_screenshots_3.webp',
	'minecraft-gallery/unfinished/unfinished_screenshots_4.webp',
	'minecraft-gallery/unfinished/unfinished_screenshots_5.webp',
	'minecraft-gallery/unfinished/unfinished_screenshots_6.webp',
	'minecraft-gallery/unfinished/unfinished_screenshots_7.webp',
	'minecraft-gallery/unfinished/unfinished_screenshots_8.webp',
	'minecraft-gallery/unfinished/unfinished_screenshots_9.webp',
	'minecraft-gallery/unfinished/unfinished_screenshots_10.webp',
	'minecraft-gallery/unfinished/unfinished_screenshots_11.webp',
	'minecraft-gallery/unfinished/unfinished_screenshots_12.webp',
	'minecraft-gallery/unfinished/unfinished_screenshots_13.webp',
	'minecraft-gallery/unfinished/unfinished_screenshots_14.webp',
	'minecraft-gallery/unfinished/unfinished_screenshots_15.webp',
	'minecraft-gallery/unfinished/unfinished_screenshots_16.webp',
	'minecraft-gallery/unfinished/unfinished_screenshots_17.webp',
]

const { t } = useI18n()

const serverShowcaseImagePaths = [
	"minecraft-gallery/season_7/bei'an_screenshots_2.webp",
	"minecraft-gallery/season_7/bei'an_screenshots_3.webp",
	"minecraft-gallery/season_7/bei'an_screenshots_4.webp",
	"minecraft-gallery/season_7/bei'an_screenshots_5.webp",
	"minecraft-gallery/season_7/bei'an_screenshots_6.webp",
	'minecraft-gallery/season_7/gtr_screenshots_1.webp',
	'minecraft-gallery/season_7/gtr_screenshots_2.webp',
	'minecraft-gallery/season_7/guangyang_screenshots_1.webp',
	'minecraft-gallery/season_7/guangyang_screenshots_2.webp',
	'minecraft-gallery/season_7/guangyang_screenshots_3.webp',
	'minecraft-gallery/season_7/guangyang_screenshots_4.webp',
	'minecraft-gallery/season_7/guangyang_screenshots_6.webp',
	'minecraft-gallery/season_7/owen_screenshots_1.webp',
	'minecraft-gallery/season_7/owen_screenshots_2.webp',
	'minecraft-gallery/season_7/owen_screenshots_3.webp',
	'minecraft-gallery/season_7/owen_screenshots_4.webp',
	'minecraft-gallery/season_7/owen_screenshots_5.webp',
	'minecraft-gallery/season_7/spawnpoint_screenshots_1.webp',
	'minecraft-gallery/season_7/xw_hotel_screenshots_2.webp',
]

const serverDarkSideImagePaths = [...unfinishedImagePaths].sort(
	(left, right) => {
		const leftIndex = Number(left.match(/(\d+)\.webp$/)?.[1] ?? 0)
		const rightIndex = Number(right.match(/(\d+)\.webp$/)?.[1] ?? 0)

		return leftIndex - rightIndex
	},
)

const dailyLifeImagePaths = [
	'minecraft-gallery/season_7/daily_screenshots_1_mixue.webp',
	'minecraft-gallery/season_7/daily_screenshots_2_cafe.webp',
	'minecraft-gallery/season_7/daily_screenshots_3_noodle.webp',
	'minecraft-gallery/season_7/daily_screenshots_4_noodle.webp',
	'minecraft-gallery/season_7/daily_screenshots_5_711.webp',
	'minecraft-gallery/season_7/daily_screenshots_6_711.webp',
	'minecraft-gallery/season_7/daily_screenshots_7_xiaomi.webp',
	'minecraft-gallery/season_7/daily_screenshots_8_classroom.webp',
]

const buildIntroImages = (
	options: IntroImageGroupOptions,
): NormalizedContentImageItem[] =>
	options.paths.map((path, index) => ({
		alt: t(options.altKey, {
			index: index + 1,
		}),
		aspectRatio: 1.8,
		caption: '',
		height: '10rem',
		src: getSiteMediaUrl(path),
		width: '18rem',
	}))

const serverShowcaseImages = computed<NormalizedContentImageItem[]>(() =>
	buildIntroImages({
		altKey: 'content.intro.ourWorks.imageAlt',
		paths: serverShowcaseImagePaths,
	}),
)

const serverDarkSideImages = computed<NormalizedContentImageItem[]>(() =>
	buildIntroImages({
		altKey: 'content.intro.goodAndBad.imageAlt',
		paths: serverDarkSideImagePaths,
	}),
)

const dailyLifeItems = computed(() =>
	dailyLifeImagePaths.map((path, index) => ({
		image: {
			alt: t('content.intro.dailyLife.imageAlt', {
				index: index + 1,
			}),
			aspectRatio: null,
			caption: '',
			height: '100%',
			src: getSiteMediaUrl(path),
			width: '100%',
		},
		subtitle: t(`content.intro.dailyLife.items.${index}.subtitle`),
		title: t(`content.intro.dailyLife.items.${index}.title`),
	})),
)
</script>
