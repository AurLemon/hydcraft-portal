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
import { getStableAssetUrl } from '~/utils/assets/stable-asset-url'

definePageMeta({
	headerVariant: 'solid',
})

interface IntroImageGroupOptions {
	altKey: string
	paths: string[]
}

const { t } = useI18n()

const introImageModules = import.meta.glob<string>(
	'~/assets/resources/minecraft-gallery/**/*.webp',
	{
		eager: true,
		import: 'default',
	},
)

const normalizeIntroImagePath = (path: string): string =>
	path
		.replace(/^.*\/assets\/resources\/minecraft-gallery\//, '')
		.replace(/^\//, '')

const introImageMap = Object.fromEntries(
	Object.entries(introImageModules).flatMap(([path, url]) => {
		const normalizedPath = normalizeIntroImagePath(path)
		const filename = normalizedPath.split('/').at(-1) ?? normalizedPath
		const stableUrl = getStableAssetUrl(url)

		return [
			[normalizedPath, stableUrl],
			[`minecraft-gallery/${normalizedPath}`, stableUrl],
			[filename, stableUrl],
		]
	}),
) as Record<string, string>

const serverShowcaseImagePaths = [
	"season_7/bei'an_screenshots_2.webp",
	"season_7/bei'an_screenshots_3.webp",
	"season_7/bei'an_screenshots_4.webp",
	"season_7/bei'an_screenshots_5.webp",
	"season_7/bei'an_screenshots_6.webp",
	'season_7/gtr_screenshots_1.webp',
	'season_7/gtr_screenshots_2.webp',
	'season_7/guangyang_screenshots_1.webp',
	'season_7/guangyang_screenshots_2.webp',
	'season_7/guangyang_screenshots_3.webp',
	'season_7/guangyang_screenshots_4.webp',
	'season_7/guangyang_screenshots_6.webp',
	'season_7/owen_screenshots_1.webp',
	'season_7/owen_screenshots_2.webp',
	'season_7/owen_screenshots_3.webp',
	'season_7/owen_screenshots_4.webp',
	'season_7/owen_screenshots_5.webp',
	'season_7/spawnpoint_screenshots_1.webp',
	'season_7/xw_hotel_screenshots_2.webp',
]

const serverDarkSideImagePaths = Object.keys(introImageModules)
	.map(normalizeIntroImagePath)
	.filter((path) => path.startsWith('unfinished/unfinished_screenshots_'))
	.sort((left, right) => {
		const leftIndex = Number(left.match(/(\d+)\.webp$/)?.[1] ?? 0)
		const rightIndex = Number(right.match(/(\d+)\.webp$/)?.[1] ?? 0)

		return leftIndex - rightIndex
	})

const dailyLifeImagePaths = [
	'season_7/daily_screenshots_1_mixue.webp',
	'season_7/daily_screenshots_2_cafe.webp',
	'season_7/daily_screenshots_3_noodle.webp',
	'season_7/daily_screenshots_4_noodle.webp',
	'season_7/daily_screenshots_5_711.webp',
	'season_7/daily_screenshots_6_711.webp',
	'season_7/daily_screenshots_7_xiaomi.webp',
	'season_7/daily_screenshots_8_classroom.webp',
]

const buildIntroImages = (
	options: IntroImageGroupOptions,
): NormalizedContentImageItem[] =>
	options.paths.flatMap((path, index) => {
		const src = introImageMap[path]

		if (!src) {
			return []
		}

		return [
			{
				alt: t(options.altKey, {
					index: index + 1,
				}),
				aspectRatio: 1.8,
				caption: '',
				height: '10rem',
				src,
				width: '18rem',
			},
		]
	})

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
	dailyLifeImagePaths.flatMap((path, index) => {
		const src = introImageMap[path]

		if (!src) {
			return []
		}

		return [
			{
				image: {
					alt: t('content.intro.dailyLife.imageAlt', {
						index: index + 1,
					}),
					aspectRatio: null,
					caption: '',
					height: '100%',
					src,
					width: '100%',
				},
				subtitle: t(`content.intro.dailyLife.items.${index}.subtitle`),
				title: t(`content.intro.dailyLife.items.${index}.title`),
			},
		]
	}),
)
</script>
