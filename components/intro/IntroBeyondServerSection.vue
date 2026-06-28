<template>
	<section class="flex flex-col gap-6">
		<div class="flex justify-center">
			<h2
				class="text-center font-arkpixel text-3xl leading-tight tracking-wider text-slate-950 dark:text-slate-50 sm:text-4xl"
			>
				{{ t('content.intro.beyondServer.title') }}
			</h2>
		</div>

		<div class="grid gap-4 lg:grid-cols-3 lg:grid-rows-2">
			<article
				v-for="card in cards"
				:key="card.key"
				class="group relative overflow-hidden rounded-xl bg-slate-950 border border-slate-200 dark:border-slate-800"
				:class="card.layoutClass"
			>
				<div class="absolute inset-0">
					<div
						v-for="(image, imageIndex) in card.images"
						:key="image.src"
						class="absolute inset-0 transition-opacity duration-700 ease-out"
						:class="
							imageIndex === activeIndexes[card.key]
								? 'opacity-100'
								: 'opacity-0'
						"
					>
						<SkeletonImage
							:src="image.src"
							:alt="image.alt"
							:reveal-delay-ms="90"
							class="h-full w-full"
							image-class="block h-full w-full object-cover select-none"
							skeleton-class="rounded-none"
							:loading="imageIndex === 0 ? 'eager' : 'lazy'"
						/>
					</div>
					<p
						v-if="card.note"
						class="mt-auto text-xs leading-6 text-white/62 [text-shadow:0_1px_2px_rgba(15,23,42,0.35)]"
					>
						{{ card.note }}
					</p>
				</div>

				<div
					class="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-[linear-gradient(180deg,rgba(2,6,23,0.76)_0%,rgba(2,6,23,0.48)_52%,rgba(2,6,23,0)_100%)]"
				/>
				<div
					class="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(2,6,23,0)_26%,rgba(2,6,23,0.18)_100%)]"
				/>
				<div
					class="pointer-events-none absolute inset-0 z-10 bg-linear-to-t from-slate-950/76 via-slate-950/24 to-transparent"
				/>

				<div
					class="relative z-20 flex h-full min-h-60 flex-col justify-between p-5 text-white sm:p-6"
					:class="card.contentClass"
				>
					<div class="flex flex-col gap-3">
						<div class="flex items-center gap-3">
							<UIcon
								:name="card.icon"
								class="size-6 shrink-0 text-white translate-y-px"
							/>
							<h3 class="font-arkpixel text-2xl tracking-wide text-white">
								{{ card.title }}
							</h3>
						</div>
						<p
							class="line-clamp-3 max-w-xl text-base leading-8 text-white/88 [text-shadow:0_1px_2px_rgba(15,23,42,0.45)]"
						>
							{{ card.description }}
						</p>
					</div>
					<p
						v-if="card.note"
						class="mt-auto text-xs leading-6 text-white/62 [text-shadow:0_1px_2px_rgba(15,23,42,0.35)]"
					>
						{{ card.note }}
					</p>
				</div>
			</article>
		</div>
	</section>
</template>

<script setup lang="ts">
import gameImage1 from '~/assets/resources/livelihood/game_1.webp'
import gameImage2 from '~/assets/resources/livelihood/game_2.webp'
import lifeImage1 from '~/assets/resources/livelihood/life_1.webp'
import lifeImage2 from '~/assets/resources/livelihood/life_2.webp'
import meetupImage1 from '~/assets/resources/meetups/meetups_1.webp'
import meetupImage2 from '~/assets/resources/meetups/meetups_2.webp'
import meetupImage3 from '~/assets/resources/meetups/meetups_3.webp'
import meetupImage4 from '~/assets/resources/meetups/meetups_4.webp'
import { getStableAssetUrl } from '~/utils/assets/stable-asset-url'

interface IntroBeyondServerImage {
	alt: string
	src: string
}

interface IntroBeyondServerCard {
	contentClass?: string
	description: string
	icon: string
	images: IntroBeyondServerImage[]
	key: IntroBeyondServerCardKey
	layoutClass: string
	note?: string
	title: string
}

type IntroBeyondServerCardKey = 'games' | 'interests' | 'meetups'

const CARD_ROTATION_INTERVAL_MS = 3600

const { t } = useI18n()

const stableMeetupImages = [
	getStableAssetUrl(meetupImage1),
	getStableAssetUrl(meetupImage2),
	getStableAssetUrl(meetupImage3),
	getStableAssetUrl(meetupImage4),
]

const stableGameImages = [
	getStableAssetUrl(gameImage1),
	getStableAssetUrl(gameImage2),
]

const stableLifeImages = [
	getStableAssetUrl(lifeImage1),
	getStableAssetUrl(lifeImage2),
]

const cards = computed<IntroBeyondServerCard[]>(() => [
	{
		description: t('content.intro.beyondServer.cards.meetups.description'),
		icon: 'i-lucide-messages-square',
		images: stableMeetupImages.map((src, index) => ({
			alt: t('content.intro.beyondServer.cards.meetups.imageAlt', {
				index: index + 1,
			}),
			src,
		})),
		key: 'meetups',
		layoutClass: 'min-h-100 lg:col-span-2 lg:row-span-2',
		note: t('content.intro.beyondServer.cards.meetups.note'),
		title: t('content.intro.beyondServer.cards.meetups.title'),
	},
	{
		contentClass: 'min-h-60',
		description: t('content.intro.beyondServer.cards.games.description'),
		icon: 'i-lucide-gamepad-2',
		images: stableGameImages.map((src, index) => ({
			alt: t('content.intro.beyondServer.cards.games.imageAlt', {
				index: index + 1,
			}),
			src,
		})),
		key: 'games',
		layoutClass: 'lg:col-start-3 lg:row-start-1',
		title: t('content.intro.beyondServer.cards.games.title'),
	},
	{
		contentClass: 'min-h-60',
		description: t('content.intro.beyondServer.cards.interests.description'),
		icon: 'i-lucide-star',
		images: stableLifeImages.map((src, index) => ({
			alt: t('content.intro.beyondServer.cards.interests.imageAlt', {
				index: index + 1,
			}),
			src,
		})),
		key: 'interests',
		layoutClass: 'lg:col-start-3 lg:row-start-2',
		title: t('content.intro.beyondServer.cards.interests.title'),
	},
])

const activeIndexes = ref<Record<IntroBeyondServerCardKey, number>>({
	games: 0,
	interests: 0,
	meetups: 0,
})

let rotationTimer: ReturnType<typeof setInterval> | null = null

const stopRotation = (): void => {
	if (rotationTimer) {
		clearInterval(rotationTimer)
		rotationTimer = null
	}
}

const startRotation = (): void => {
	stopRotation()
	rotationTimer = setInterval(() => {
		const nextIndexes = { ...activeIndexes.value }

		cards.value.forEach((card) => {
			nextIndexes[card.key] =
				(activeIndexes.value[card.key] + 1) % card.images.length
		})

		activeIndexes.value = nextIndexes
	}, CARD_ROTATION_INTERVAL_MS)
}

watch(
	cards,
	(nextCards) => {
		const nextIndexes = { ...activeIndexes.value }

		nextCards.forEach((card) => {
			nextIndexes[card.key] = Math.min(
				nextIndexes[card.key] ?? 0,
				Math.max(0, card.images.length - 1),
			)
		})

		activeIndexes.value = nextIndexes
	},
	{
		immediate: true,
	},
)

onMounted(() => {
	startRotation()
})

onBeforeUnmount(() => {
	stopRotation()
})
</script>
