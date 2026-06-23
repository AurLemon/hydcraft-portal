<template>
	<div class="home-hero-shell flex flex-col justify-end pt-24">
		<div class="flex flex-col">
			<div class="relative z-10">
				<div class="max-w-4xl [text-shadow:0_1px_2px_rgba(15,23,42,0.36)]">
					<h1
						class="text-left text-5xl leading-none font-medium tracking-tight text-white sm:text-6xl lg:text-7xl "
					>
						<span class="block text-4xl sm:inline sm:text-7xl">This is </span>
						<span class="block sm:inline">
							<span class="font-semibold text-hydcraft-red">Hyd</span>
							<span class="font-semibold text-hydcraft-blue">Craft</span>
							<span>.</span>
						</span>
					</h1>
					<p
						class="mt-3 text-left text-xl leading-relaxed font-medium text-white sm:text-2xl"
					>
						{{ t('home.lead') }}
					</p>
				</div>

				<section
					class="relative z-60 mt-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
				>
					<div
						v-for="card in homeCards"
						:key="card.key"
						:ref="setCardRef(card.index)"
						class="home-card-magnet"
						:style="cardMagnetStyle(card.index)"
					>
						<HomeInfoCard
							:title="card.title"
							:description="card.description"
							:background-src="card.backgroundSrc"
							:background-alt="
								t('home.cards.backgroundAlt', { title: card.title })
							"
							:background-class="card.backgroundClass"
						/>
					</div>
				</section>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import HomeInfoCard from '~/components/cards/HomeInfoCard.vue'
import cultureBackground from '~/assets/resources/homepage/culture_bg.webp'
import nitrogenBackground from '~/assets/resources/homepage/nitrogen_bg.webp'
import railwayBackground from '~/assets/resources/homepage/railway_bg.webp'
import citiesBackground from '~/assets/resources/homepage/cities_bg.webp'

definePageMeta({
	headerVariant: 'hero',
})

type HomeCardKey = 'nitrogen' | 'railway' | 'culture' | 'cities'

interface HomeCard {
	index: number
	key: HomeCardKey
	title: string
	description: string
	backgroundSrc: string
	backgroundClass?: string
}

interface Vector2D {
	x: number
	y: number
}

const HOME_HERO_PARALLAX_MAX_OFFSET = 24
const HOME_HERO_ROTATION_MAX_DEGREE = 1.4
const CARD_MAGNET_MAX_OFFSET = 6
const DESKTOP_POINTER_MIN_WIDTH = 1024

const cardRefs = ref<HTMLElement[]>([])
const cardOffsets = reactive<Vector2D[]>([
	{ x: 0, y: 0 },
	{ x: 0, y: 0 },
	{ x: 0, y: 0 },
	{ x: 0, y: 0 },
])
const pointer = reactive<Vector2D>({ x: 0, y: 0 })
const pointerActive = ref(false)
const pointerEffectsEnabled = ref(false)
const pointerListenersBound = ref(false)
const updateFrame = ref<number | null>(null)

const homeCards = computed<HomeCard[]>(() => [
	{
		index: 0,
		key: 'nitrogen',
		title: 'Nitrogen',
		description: t('home.cards.nitrogen.description'),
		backgroundSrc: nitrogenBackground,
		backgroundClass: 'object-center',
	},
	{
		index: 1,
		key: 'railway',
		title: 'Railway',
		description: t('home.cards.railway.description'),
		backgroundSrc: railwayBackground,
		backgroundClass: 'object-left',
	},
	{
		index: 2,
		key: 'culture',
		title: 'Culture',
		description: t('home.cards.culture.description'),
		backgroundSrc: cultureBackground,
		backgroundClass: 'object-center',
	},
	{
		index: 3,
		key: 'cities',
		title: 'Cities',
		description: t('home.cards.cities.description'),
		backgroundSrc: citiesBackground,
		backgroundClass: 'object-center',
	},
])

const setCardRef =
	(index: number) => (element: Element | ComponentPublicInstance | null) => {
		if (element instanceof HTMLElement) {
			cardRefs.value[index] = element
		}
	}

const resetCardOffsets = (): void => {
	for (const offset of cardOffsets) {
		offset.x = 0
		offset.y = 0
	}
}

const setHeroVideoTransform = (
	x = 0,
	y = 0,
	rotateX = 0,
	rotateY = 0,
): void => {
	if (!import.meta.client) {
		return
	}

	document.documentElement.style.setProperty('--home-hero-video-x', `${x}px`)
	document.documentElement.style.setProperty('--home-hero-video-y', `${y}px`)
	document.documentElement.style.setProperty(
		'--home-hero-video-rotate-x',
		`${rotateX}deg`,
	)
	document.documentElement.style.setProperty(
		'--home-hero-video-rotate-y',
		`${rotateY}deg`,
	)
}

const bindPointerListeners = (): void => {
	if (pointerListenersBound.value) {
		return
	}

	window.addEventListener('mousemove', handleMouseMove, { passive: true })
	window.addEventListener('mouseout', handleMouseOut, { passive: true })
	pointerListenersBound.value = true
}

const unbindPointerListeners = (): void => {
	if (!pointerListenersBound.value) {
		return
	}

	window.removeEventListener('mousemove', handleMouseMove)
	window.removeEventListener('mouseout', handleMouseOut)
	pointerListenersBound.value = false
}

const updatePointerEffectsEnabled = (): void => {
	pointerEffectsEnabled.value =
		window.innerWidth >= DESKTOP_POINTER_MIN_WIDTH &&
		window.matchMedia('(hover: hover) and (pointer: fine)').matches

	if (!pointerEffectsEnabled.value) {
		pointerActive.value = false
		resetCardOffsets()
		setHeroVideoTransform()
		unbindPointerListeners()
		return
	}

	bindPointerListeners()
}

const updateCardOffsets = (): void => {
	if (!pointerActive.value || !pointerEffectsEnabled.value) {
		resetCardOffsets()
		return
	}

	cardRefs.value.forEach((element, index) => {
		const offset = cardOffsets[index]

		if (!offset) {
			return
		}

		const rect = element.getBoundingClientRect()
		const pointerInsideCard =
			pointer.x >= rect.left &&
			pointer.x <= rect.right &&
			pointer.y >= rect.top &&
			pointer.y <= rect.bottom

		if (pointerInsideCard) {
			offset.x = 0
			offset.y = 0
			return
		}

		const centerX = rect.left + rect.width / 2
		const centerY = rect.top + rect.height / 2
		const deltaX = centerX - pointer.x
		const deltaY = centerY - pointer.y
		const distance = Math.hypot(deltaX, deltaY)
		const maxDistance = Math.max(rect.width, rect.height) * 1.1

		if (distance >= maxDistance) {
			offset.x = 0
			offset.y = 0
			return
		}

		const strength = 1 - distance / maxDistance
		const directionX = distance === 0 ? 0 : deltaX / distance
		const directionY = distance === 0 ? 0 : deltaY / distance

		offset.x = directionX * CARD_MAGNET_MAX_OFFSET * strength
		offset.y = directionY * CARD_MAGNET_MAX_OFFSET * strength
	})
}

const updateHeroParallax = (): void => {
	if (!pointerActive.value || !pointerEffectsEnabled.value) {
		setHeroVideoTransform()
		return
	}

	const viewportWidth = window.innerWidth || 1
	const viewportHeight = window.innerHeight || 1
	const relativeX = pointer.x / viewportWidth
	const relativeY = pointer.y / viewportHeight
	const offsetX = (relativeX - 0.5) * HOME_HERO_PARALLAX_MAX_OFFSET * -1
	const offsetY = (relativeY - 0.5) * HOME_HERO_PARALLAX_MAX_OFFSET * -1
	const rotateX = (relativeY - 0.5) * HOME_HERO_ROTATION_MAX_DEGREE
	const rotateY = (relativeX - 0.5) * HOME_HERO_ROTATION_MAX_DEGREE * -1

	setHeroVideoTransform(offsetX, offsetY, rotateX, rotateY)
}

const updatePointerEffects = (): void => {
	updateFrame.value = null
	updateCardOffsets()
	updateHeroParallax()
}

const schedulePointerEffectsUpdate = (): void => {
	if (updateFrame.value !== null) {
		return
	}

	updateFrame.value = window.requestAnimationFrame(updatePointerEffects)
}

const handleMouseMove = (event: MouseEvent): void => {
	if (!pointerEffectsEnabled.value) {
		return
	}

	pointer.x = event.clientX
	pointer.y = event.clientY
	pointerActive.value = true
	schedulePointerEffectsUpdate()
}

const handleMouseOut = (event: MouseEvent): void => {
	if (event.relatedTarget) {
		return
	}

	pointerActive.value = false
	schedulePointerEffectsUpdate()
}

const handleResize = (): void => {
	updatePointerEffectsEnabled()
	schedulePointerEffectsUpdate()
}

const cardMagnetStyle = (index: number): Record<string, string> => ({
	transform: `translate3d(${cardOffsets[index]?.x ?? 0}px, ${cardOffsets[index]?.y ?? 0}px, 0)`,
	transition: 'transform 400ms ease-out',
	willChange: 'transform',
})

onMounted(() => {
	updatePointerEffectsEnabled()
	window.addEventListener('resize', handleResize, { passive: true })
	schedulePointerEffectsUpdate()
})

onBeforeUnmount(() => {
	unbindPointerListeners()
	window.removeEventListener('resize', handleResize)

	if (updateFrame.value !== null) {
		window.cancelAnimationFrame(updateFrame.value)
		updateFrame.value = null
	}

	resetCardOffsets()
	setHeroVideoTransform()
})
</script>

<style scoped>
.home-card-magnet {
	will-change: transform;
}

.home-hero-shell {
	min-height: 140vh;
}

@media (width >= 40rem) {
	.home-hero-shell {
		min-height: 110vh;
	}
}

@media (width >= 80rem) {
	.home-hero-shell {
		min-height: 74vh;
	}
}
</style>
