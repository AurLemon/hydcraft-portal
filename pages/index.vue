<template>
	<div
		class="flex flex-col justify-end min-h-[140vh] sm:min-h-[110vh] xl:min-h-[74vh] pt-24"
	>
		<div class="flex flex-col">
			<div
				class="absolute top-0 left-0 right-0 z-0 h-screen min-h-160 select-none pointer-events-none mask-[linear-gradient(to_bottom,#000_0%,#000_40%,rgba(0,0,0,0.98)_52%,rgba(0,0,0,0.9)_58%,rgba(0,0,0,0.76)_64%,rgba(0,0,0,0.56)_70%,rgba(0,0,0,0.34)_77%,rgba(0,0,0,0.14)_84%,transparent_90%)]"
				aria-hidden="true"
			>
				<video
					autoplay
					muted
					loop
					playsinline
					:src="backgroundVideo"
					class="h-full w-full object-cover brightness-75"
				/>
			</div>

			<div class="relative z-10">
				<div class="max-w-4xl">
					<h1
						class="text-left text-5xl leading-none font-medium tracking-tight text-white sm:text-6xl lg:text-7xl"
					>
						<span class="block text-4xl sm:inline sm:text-7xl">Here is </span>
						<span class="block sm:inline">
							<span class="font-semibold text-hydcraft-red">Hyd</span>
							<span class="font-semibold text-hydcraft-blue">Craft</span>
							<span>.</span>
						</span>
					</h1>
					<p
						class="mt-5 text-left text-xl leading-relaxed font-medium text-white sm:text-2xl"
					>
						{{ $t('home.lead') }}
					</p>
				</div>

				<section
					class="relative z-60 mt-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
				>
					<HomeInfoCard
						v-for="card in homeCards"
						:key="card.key"
						:title="card.title"
						:description="card.description"
						:background-src="card.backgroundSrc"
						:background-alt="
							$t('home.cards.backgroundAlt', { title: card.title })
						"
						:background-class="card.backgroundClass"
					/>
				</section>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import HomeInfoCard from '~/components/cards/HomeInfoCard.vue'
import cultureBackground from '~/assets/resources/homepage/image_card_background_culture_1.png'
import nitrogenBackground from '~/assets/resources/homepage/image_card_background_nitrogen_2.png'
import railwayBackground from '~/assets/resources/homepage/image_card_background_railway_1.png'
import citiesBackground from '~/assets/resources/homepage/image_home_background_240730.webp'
import backgroundVideo from '~/assets/resources/homepage/video_background_240726.webm'

definePageMeta({
	headerVariant: 'hero',
})

const { t } = useGlobalI18n()

type HomeCardKey = 'nitrogen' | 'railway' | 'culture' | 'cities'

interface HomeCard {
	key: HomeCardKey
	title: string
	description: string
	backgroundSrc: string
	backgroundClass?: string
}

const homeCards = computed<HomeCard[]>(() => [
	{
		key: 'nitrogen',
		title: 'Nitrogen',
		description: t('home.cards.nitrogen.description'),
		backgroundSrc: nitrogenBackground,
		backgroundClass: 'object-center',
	},
	{
		key: 'railway',
		title: 'Railway',
		description: t('home.cards.railway.description'),
		backgroundSrc: railwayBackground,
		backgroundClass: 'object-left',
	},
	{
		key: 'culture',
		title: 'Culture',
		description: t('home.cards.culture.description'),
		backgroundSrc: cultureBackground,
		backgroundClass: 'object-center',
	},
	{
		key: 'cities',
		title: 'Cities',
		description: t('home.cards.cities.description'),
		backgroundSrc: citiesBackground,
		backgroundClass: 'object-center',
	},
])
</script>
