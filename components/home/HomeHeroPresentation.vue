<template>
	<div
		data-home-hero-panel
		:data-desktop-gallery-count="sceneGallery.length"
		class="immersive-site-shell pointer-events-none relative z-10 flex h-full touch-pan-y flex-col px-6 pt-28 pb-8 text-white transition-[opacity,transform] ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-10 lg:px-16 lg:pb-12"
		:class="
			sceneSwitching
				? '!opacity-0 translate-y-2 duration-[625ms]'
				: 'duration-[625ms]'
		"
	>
		<div
			ref="heroRootRef"
			data-home-horizontal-swipe
			class="pointer-events-none absolute inset-0 z-0 touch-pan-y max-[639px]:pointer-events-auto lg:hidden"
			aria-hidden="true"
		/>
		<div class="mt-auto flex flex-col gap-3 lg:contents">
			<p
				data-home-exit="content"
				:lang="props.locale"
				class="home-hero-mobile-scene-name lg:hidden lg:-translate-x-2 pointer-events-none inline-block max-w-full self-start bg-[linear-gradient(to_right,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_22%,rgba(255,255,255,0.8)_100%)] bg-clip-text font-serif text-[clamp(4.5rem,12vw,8rem)] tracking-[-0.04em] whitespace-pre-line text-transparent uppercase leading-[0.98] drop-shadow-[0_2px_16px_rgba(2,6,23,0.8)] lg:mt-16 select-none break-words hyphens-auto [text-wrap:balance]"
				:class="[
					props.locale.startsWith('en') ? 'font-semibold' : 'font-extrabold',
					scenePresentation.credit ? 'mb-0' : 'mb-2',
				]"
				aria-hidden="true"
			>
				<template v-if="mobileSceneNamePrefix">
					<span
						class="relative left-1.5 block bg-none text-[clamp(1.5rem,4.5vw,2.75rem)] leading-[1.15] tracking-[0.08em] text-white"
					>
						{{ mobileSceneNamePrefix }}
					</span>
					<span class="block leading-[1.15]">{{ mobileSceneName }}</span>
				</template>
				<template v-else>{{ scenePresentation.name }}</template>
			</p>
			<div
				data-home-exit="content"
				class="lg:-translate-x-2 pointer-events-none mt-auto hidden self-start bg-[linear-gradient(to_right,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_22%,rgba(255,255,255,0.8)_100%)] bg-clip-text font-serif text-transparent lg:flex"
				:class="[
					props.locale.startsWith('en') ? 'font-semibold' : 'font-extrabold',
					desktopDisplayName?.layout === 'vertical'
						? 'items-start gap-4'
						: 'lg:mt-16 flex-col items-start gap-1',
				]"
				aria-hidden="true"
			>
				<template v-if="desktopDisplayName?.layout === 'vertical'">
					<div
						class="home-hero-display-prefix relative mt-2 left-1.5 text-[clamp(1.5rem,2.5vw,3.5rem)] leading-[1.16] tracking-[0.08em] [writing-mode:vertical-lr] [text-orientation:upright]"
					>
						{{ desktopDisplayName.prefix }}
					</div>
					<div class="flex items-start gap-4">
						<p
							v-for="column in desktopVerticalNameColumns"
							:key="column"
							class="home-hero-display-name text-[clamp(4.5rem,11vw,11rem)] leading-[1.05] tracking-[0.08em] [writing-mode:vertical-lr] [text-orientation:upright]"
						>
							{{ column }}
						</p>
					</div>
				</template>
				<template v-else-if="desktopDisplayName">
					<div
						class="home-hero-display-prefix relative left-1.5 whitespace-pre-line text-[clamp(1.5rem,2.5vw,3.5rem)] leading-[1.16] tracking-[0.08em]"
					>
						{{ desktopDisplayName.prefix }}
					</div>
					<div
						class="home-hero-display-name text-[clamp(4.5rem,11vw,11rem)] leading-[1.05] tracking-[0.08em] whitespace-pre-line"
					>
						{{ desktopDisplayName.name }}
					</div>
				</template>
				<p
					v-else
					class="home-hero-display-name inline-block max-w-full text-[clamp(4.5rem,11vw,11rem)] tracking-[-0.04em] whitespace-pre-line uppercase leading-[1.05] drop-shadow-[0_2px_16px_rgba(2,6,23,0.8)] select-none break-words hyphens-auto"
					:class="
						props.locale.startsWith('en') ? 'font-semibold' : 'font-extrabold'
					"
				>
					{{ scenePresentation.name }}
				</p>
			</div>
		</div>
		<div
			data-home-exit="content"
			class="pointer-events-auto inline-flex w-fit items-center gap-1 text-sm text-white/90 select-none"
			:class="scenePresentation.credit ? 'lg:-translate-x-2 lg:mx-4' : 'hidden'"
		>
			<template v-if="scenePresentation.credit">
				<UIcon
					:name="scene.presentation.credit.icon"
					class="size-12 object-cover shrink-0 text-[#fd354f] leading-none"
				/>
				<a
					:href="scenePresentation.credit.href"
					target="_blank"
					rel="noopener noreferrer"
					class="pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-base font-medium transition-colors hover:bg-white/14 hover:text-white"
				>
					<span>{{ scenePresentation.credit.handle }}</span>
					<UIcon name="i-lucide-external-link" class="size-3.5" />
				</a>
			</template>
		</div>

		<div
			v-if="mobileSceneGallery.length"
			data-home-exit="gallery-mobile"
			class="pointer-events-auto home-scene-gallery mobile-scene-gallery absolute top-34 right-6 z-20 flex w-28 flex-col gap-2 lg:hidden"
		>
			<button
				v-for="(image, imageIndex) in mobileSceneGallery"
				:key="image.asset"
				type="button"
				class="pointer-events-auto home-scene-gallery-frame mobile-scene-gallery-frame group relative w-full cursor-zoom-in overflow-hidden rounded-lg border border-white/30 bg-slate-950/55 shadow-[0_12px_28px_rgba(2,6,23,0.38)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-sky-300"
				:style="{
					animationDelay: `${(mobileSceneGallery.length - imageIndex - 1) * 120}ms`,
				}"
				@click="openSceneGalleryImage(image)"
			>
				<SkeletonImage
					:src="image.src"
					:alt="image.alt"
					:reveal-delay-ms="90"
					class="aspect-[4/5] w-full"
					image-class="block h-full w-full object-cover"
					skeleton-class="rounded-none"
				/>
				<span
					class="pointer-events-none absolute inset-0 bg-slate-950/0 transition-colors duration-300 ease-out group-hover:bg-slate-950/14"
				/>
				<span
					class="absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-950/88 via-slate-950/46 to-transparent px-2 pt-8 pb-2 text-left text-xs font-medium text-white [text-shadow:0_1px_6px_rgba(2,6,23,0.9)]"
				>
					{{ image.caption }}
				</span>
			</button>
		</div>

		<div
			data-home-exit="content"
			class="mt-2 max-w-full pb-8 [text-shadow:0_2px_16px_rgba(2,6,23,0.8)] lg:mt-auto lg:pb-12"
		>
			<div class="home-hero-copy-content max-w-xl">
				<h1
					:lang="props.locale"
					class="home-hero-copy-title text-pretty uppercase whitespace-pre-line break-words hyphens-auto [text-wrap:balance] text-xl font-semibold tracking-[0.08em] sm:text-3xl"
				>
					{{ scenePresentation.title }}
				</h1>
				<div
					ref="descriptionViewportRef"
					class="home-hero-description-shell pointer-events-auto mt-2"
				>
					<template v-if="descriptionExpanded">
						<p
							id="home-hero-description"
							ref="descriptionExpandedRef"
							data-home-detail-scroll
							:lang="props.locale"
							class="home-hero-copy-description home-hero-copy-description--expanded whitespace-pre-line break-words hyphens-auto [text-wrap:pretty] text-sm leading-6 text-white/72 sm:text-lg sm:leading-normal"
							:class="
								props.locale.startsWith('en')
									? 'text-justify [text-align-last:left]'
									: ''
							"
							@pointerdown.stop
							@touchstart.stop
							@touchmove.stop
							@wheel.stop
						>
							{{ scenePresentation.description }}
							<button
								type="button"
								class="home-hero-description-toggle pointer-events-auto inline-flex items-center gap-1 text-xs font-medium text-white/90 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
								:aria-expanded="true"
								aria-controls="home-hero-description"
								@click="setDescriptionExpanded(false)"
							>
								<span>{{ t('home.immersive.hero.collapseDescription') }}</span>
								<UIcon name="i-lucide-chevron-up" class="size-3.5" />
							</button>
						</p>
					</template>
					<p
						v-else
						id="home-hero-description"
						ref="descriptionCollapsedRef"
						:lang="props.locale"
						class="home-hero-copy-description home-hero-copy-description--collapsed whitespace-pre-line break-words hyphens-auto [text-wrap:pretty] text-sm leading-6 text-white/72 sm:text-lg sm:leading-normal"
						:class="
							props.locale.startsWith('en')
								? 'text-justify [text-align-last:left]'
								: ''
						"
						@pointerdown.stop
						@touchstart.stop
						@touchmove.stop
						@wheel.stop
					>
						{{ collapsedDescription
						}}<template v-if="descriptionHasOverflow">… </template>
						<button
							v-if="descriptionHasOverflow"
							type="button"
							class="home-hero-description-toggle pointer-events-auto inline-flex items-center gap-1 text-xs font-medium text-white/90 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
							:aria-expanded="false"
							aria-controls="home-hero-description"
							@click="setDescriptionExpanded(true)"
						>
							<span>{{ t('home.immersive.hero.expandDescription') }}</span>
							<UIcon name="i-lucide-chevron-down" class="size-3.5" />
						</button>
					</p>
					<p
						ref="descriptionMeasureRef"
						aria-hidden="true"
						:lang="props.locale"
						class="home-hero-copy-description home-hero-description-measure whitespace-pre-line break-words hyphens-auto [text-wrap:pretty] text-sm leading-6 text-white/72 sm:text-lg sm:leading-normal"
						:class="
							props.locale.startsWith('en')
								? 'text-justify [text-align-last:left]'
								: ''
						"
					>
						{{ scenePresentation.description }}
					</p>
				</div>
			</div>
		</div>

		<div
			data-home-exit="gallery-desktop"
			class="pointer-events-auto home-scene-gallery absolute right-16 bottom-24 z-20 hidden gap-2 lg:flex"
		>
			<div v-if="sceneGallery.length" class="flex justify-end gap-2">
				<button
					v-for="(image, imageIndex) in sceneGallery"
					:key="image.asset"
					type="button"
					class="pointer-events-auto home-scene-gallery-frame group relative w-52 shrink-0 cursor-zoom-in overflow-hidden rounded-lg border border-white/30 bg-slate-950/55 shadow-[0_12px_28px_rgba(2,6,23,0.38)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-sky-300"
					:style="{
						animationDelay: `${(sceneGallery.length - imageIndex - 1) * 120}ms`,
					}"
					@click="openSceneGalleryImage(image)"
				>
					<SkeletonImage
						:src="image.src"
						:alt="image.alt"
						:reveal-delay-ms="90"
						class="aspect-[4/3] w-full"
						image-class="block h-full w-full object-cover"
						skeleton-class="rounded-none"
					/>
					<span
						class="pointer-events-none absolute inset-0 bg-slate-950/0 transition-colors duration-300 ease-out group-hover:bg-slate-950/14"
					/>
					<span
						class="absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-950/88 via-slate-950/46 to-transparent px-2 pt-7 pb-2 text-left text-sm text-white [text-shadow:0_1px_6px_rgba(2,6,23,0.9)]"
					>
						{{ image.caption }}
					</span>
				</button>
			</div>
		</div>
		<div
			data-home-exit="content"
			class="pointer-events-auto absolute right-6 bottom-8 z-20 flex items-center gap-2 text-base font-medium tracking-wide text-white/90 [text-shadow:0_2px_12px_rgba(2,6,23,0.8)] sm:right-10 lg:right-16 lg:bottom-12"
		>
			<span
				class="h-2 w-2 rounded-full"
				:class="online ? 'bg-emerald-400' : 'bg-slate-400'"
			/>
			<span>{{ serverName }}</span>
			<span class="text-white/62">{{ onlineCount }}/{{ maxPlayers }}</span>
		</div>

		<ContentImageLightbox
			:open="sceneGalleryLightboxOpen"
			:image="activeSceneGalleryImage"
			@update:open="handleSceneGalleryLightboxOpenChange"
		/>
	</div>
</template>

<script setup lang="ts">
import guangyangScreenshots1 from '~/assets/resources/minecraft-gallery/season_8/guangyang_screenshots_1.webp'
import guangyangScreenshots2 from '~/assets/resources/minecraft-gallery/season_8/guangyang_screenshots_2.webp'
import owenCoastConcert1 from '~/assets/resources/minecraft-gallery/season_8/owen_coast_concert_1.webp'
import owenWpgh1 from '~/assets/resources/minecraft-gallery/season_8/owen_wpgh_1.webp'
import outroSpawn from '~/assets/resources/minecraft-gallery/season_8/spawnpoint_screenshots_1.webp'
import saikongScreenshots1 from '~/assets/resources/minecraft-gallery/season_8/saikong_screenshots_1.webp'
import xwHotelScreenshots1 from '~/assets/resources/minecraft-gallery/season_7/xw_hotel_screenshots_1.webp'
import xwHotelScreenshots2 from '~/assets/resources/minecraft-gallery/season_7/xw_hotel_screenshots_2.webp'
import type { NormalizedContentImageItem } from '~/components/content/utils/content-image'
import type {
	HomeImmersiveScene,
	HomeImmersiveSceneGalleryAsset,
} from '~/utils/home/immersive-scenes'
import { useHomeHorizontalSwipe } from '~/composables/home/useHomeHorizontalSwipe'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface HomeHeroPresentationProps {
	scene: HomeImmersiveScene
	locale: string
	sceneSwitching: boolean
	serverName: string
	onlineCount: number
	maxPlayers: number
	online: boolean
}

const props = defineProps<HomeHeroPresentationProps>()
const { t } = useI18n()
const emit = defineEmits<{
	'swipe-scene': [direction: -1 | 1]
	'description-scroll-change': [expanded: boolean]
}>()
const heroRootRef = ref<HTMLElement | null>(null)
const descriptionViewportRef = ref<HTMLElement | null>(null)
const descriptionCollapsedRef = ref<HTMLElement | null>(null)
const descriptionExpandedRef = ref<HTMLElement | null>(null)
const descriptionMeasureRef = ref<HTMLElement | null>(null)
const descriptionExpanded = ref(false)
const descriptionHasOverflow = ref(false)
const collapsedDescription = ref('')
let descriptionResizeObserver: ResizeObserver | null = null
const heroSwipeEnabled = computed(() => !props.sceneSwitching)
useHomeHorizontalSwipe(heroRootRef, {
	enabled: heroSwipeEnabled,
	onCommit: (direction) => emit('swipe-scene', direction),
})

const sceneGallerySources: Record<HomeImmersiveSceneGalleryAsset, string> = {
	owenCoastConcert1,
	owenWpgh1,
	xwHotelScreenshots1,
	xwHotelScreenshots2,
	guangyangScreenshots1,
	guangyangScreenshots2,
	spawnpointScreenshots1: outroSpawn,
	saikongScreenshots1,
}
const scenePresentation = computed(
	() =>
		props.scene.presentation.locales[props.locale] ??
		props.scene.presentation.locales['en-US']!,
)
const mobileSceneNameParts = computed(() =>
	scenePresentation.value.name.split('\n'),
)
const mobileSceneNamePrefix = computed(() => {
	const prefix = mobileSceneNameParts.value[0]
	return prefix === '这里是' || prefix === '這裡是' ? prefix : null
})
const mobileSceneName = computed(() =>
	mobileSceneNamePrefix.value
		? mobileSceneNameParts.value.slice(1).join('\n')
		: scenePresentation.value.name,
)
const sceneGallery = computed(() =>
	scenePresentation.value.gallery.slice(0, 3).map((image) => ({
		...image,
		src: sceneGallerySources[image.asset],
	})),
)
const selectMobileSceneGalleryIndices = (galleryLength: number): number[] => {
	if (galleryLength <= 2) {
		return Array.from({ length: galleryLength }, (_, index) => index)
	}

	return Array.from({ length: galleryLength }, (_, index) => index)
		.sort(() => Math.random() - 0.5)
		.slice(0, 2)
		.sort((left, right) => left - right)
}
const mobileSceneGalleryIndices = useState<number[]>(
	'home-scene-gallery-selection',
	() => selectMobileSceneGalleryIndices(sceneGallery.value.length),
)
const mobileSceneGallery = computed(() =>
	mobileSceneGalleryIndices.value
		.map((index) => sceneGallery.value[index])
		.filter((image): image is (typeof sceneGallery.value)[number] =>
			Boolean(image),
		),
)
const activeSceneGalleryImage = ref<NormalizedContentImageItem | null>(null)
const sceneGalleryLightboxOpen = computed(
	() => activeSceneGalleryImage.value !== null,
)
const desktopDisplayName = computed(() =>
	props.locale.startsWith('zh')
		? scenePresentation.value.desktopDisplayName
		: undefined,
)
const desktopVerticalNameColumns = computed(() =>
	desktopDisplayName.value?.layout === 'vertical'
		? desktopDisplayName.value.name.split('\n')
		: [],
)

const isMobileDescription = (): boolean =>
	typeof window !== 'undefined' &&
	window.matchMedia('(max-width: 1023px)').matches

const trimDescriptionCandidate = (value: string): string =>
	value.replace(/[\s\n]+$/, '')

const setDescriptionExpanded = (expanded: boolean): void => {
	descriptionExpanded.value = expanded
	emit('description-scroll-change', expanded)
}

const updateDescriptionOverflow = async (): Promise<void> => {
	await nextTick()
	const measure = descriptionMeasureRef.value
	const collapsed = descriptionCollapsedRef.value
	const fullDescription = scenePresentation.value.description
	if (!measure || !collapsed || !isMobileDescription()) {
		descriptionHasOverflow.value = false
		collapsedDescription.value = fullDescription
		return
	}

	const lineHeight = Number.parseFloat(getComputedStyle(collapsed).lineHeight)
	const maxHeight = (Number.isFinite(lineHeight) ? lineHeight : 24) * 5
	const fullOverflow = measure.scrollHeight > maxHeight + 1
	descriptionHasOverflow.value = fullOverflow
	if (!fullOverflow) {
		collapsedDescription.value = fullDescription
		return
	}

	// Fit the visible copy and its inline button into exactly five lines.
	let low = 1
	let high = fullDescription.length
	collapsedDescription.value = fullDescription
	await nextTick()
	while (low < high) {
		const middle = Math.ceil((low + high) / 2)
		collapsedDescription.value = trimDescriptionCandidate(
			fullDescription.slice(0, middle),
		)
		await nextTick()
		if (collapsed.scrollHeight <= maxHeight + 1) low = middle
		else high = middle - 1
	}
	const candidate = trimDescriptionCandidate(fullDescription.slice(0, low))
	const wordBoundary = candidate.lastIndexOf(' ')
	collapsedDescription.value =
		wordBoundary > candidate.length * 0.6
			? candidate.slice(0, wordBoundary)
			: candidate
}

watch([() => props.scene.id, () => props.locale], async () => {
	setDescriptionExpanded(false)
	await updateDescriptionOverflow()
})

onMounted(async () => {
	await updateDescriptionOverflow()
	if (typeof ResizeObserver === 'undefined') return

	descriptionResizeObserver = new ResizeObserver(updateDescriptionOverflow)
	if (descriptionViewportRef.value) {
		descriptionResizeObserver.observe(descriptionViewportRef.value)
	}
	if (descriptionMeasureRef.value) {
		descriptionResizeObserver.observe(descriptionMeasureRef.value)
	}
})

onBeforeUnmount(() => {
	descriptionResizeObserver?.disconnect()
	descriptionResizeObserver = null
})

const openSceneGalleryImage = (image: {
	src: string
	alt: string
	caption: string
}): void => {
	activeSceneGalleryImage.value = {
		src: image.src,
		alt: image.alt,
		caption: image.caption,
		width: '100%',
		height: '100%',
		aspectRatio: null,
	}
}

const handleSceneGalleryLightboxOpenChange = (open: boolean): void => {
	if (!open) activeSceneGalleryImage.value = null
}
</script>

<style scoped>
.home-scene-gallery-frame {
	animation: home-scene-gallery-frame-in 620ms cubic-bezier(0.22, 1, 0.36, 1)
		both;
	will-change: opacity, transform, filter;
}

[data-home-exit] {
	will-change: opacity, transform, filter;
}

.home-hero-description-shell {
	position: relative;
	min-width: 0;
}

.home-hero-copy-description {
	margin: 0;
	overflow-wrap: break-word;
}

.home-hero-description-toggle {
	position: static;
	vertical-align: baseline;
	white-space: nowrap;
	text-shadow: 0 2px 12px rgba(2, 6, 23, 0.8);
}

.home-hero-description-measure {
	position: absolute;
	inset-inline: 0;
	top: 0;
	height: auto;
	max-height: none;
	overflow: visible;
	pointer-events: none;
	visibility: hidden;
}

@media (max-width: 1023px) {
	:lang(en).home-hero-mobile-scene-name {
		font-size: clamp(2.75rem, 11vw, 5rem);
		max-height: 1.96em;
		overflow: hidden;
	}

	.home-hero-description-shell {
		display: block;
		block-size: 7.5rem;
		overflow: hidden;
	}

	.home-hero-copy-description {
		block-size: 100%;
		min-height: 0;
		overflow: hidden;
		touch-action: pan-y;
		-webkit-overflow-scrolling: touch;
	}

	.home-hero-copy-description--collapsed {
		block-size: 100%;
		overflow: hidden;
	}

	.home-hero-copy-description--expanded {
		overflow-y: auto;
		overflow-x: hidden;
		overflow-wrap: break-word;
		overflow-anchor: none;
		padding-bottom: 1.5rem;
		overscroll-behavior: contain;
		touch-action: pan-y;
	}

	.home-hero-description-measure {
		block-size: auto;
	}

	.home-hero-description-toggle {
		padding-inline: 0.15rem;
	}
}

@media (min-width: 640px) and (max-width: 1023px) {
	.home-hero-description-shell {
		block-size: 8.5rem;
	}
}

@media (min-width: 1024px) {
	.home-hero-description-shell {
		max-width: 100%;
	}

	.home-hero-description-toggle {
		display: none;
	}
}

@keyframes home-scene-gallery-frame-in {
	from {
		filter: blur(10px);
		opacity: 0;
		transform: translateX(2rem);
	}

	to {
		filter: blur(0);
		opacity: 1;
		transform: translateX(0);
	}
}

@media (max-width: 1023px) {
	.mobile-scene-gallery-frame {
		animation-name: home-mobile-scene-gallery-frame-in;
	}
}

@keyframes home-mobile-scene-gallery-frame-in {
	from {
		filter: blur(10px);
		opacity: 0;
		transform: translateY(-2rem);
	}

	to {
		filter: blur(0);
		opacity: 1;
		transform: translateY(0);
	}
}

@media (prefers-reduced-motion: reduce) {
	.home-scene-gallery-frame {
		animation: none;
	}
}

@media (min-width: 1024px) {
	[data-home-hero-panel] {
		--home-hero-gallery-width: 0rem;
	}

	[data-home-hero-panel][data-desktop-gallery-count='1'] {
		--home-hero-gallery-width: 13rem;
	}

	[data-home-hero-panel][data-desktop-gallery-count='2'] {
		--home-hero-gallery-width: 26.5rem;
	}

	[data-home-hero-panel][data-desktop-gallery-count='3'] {
		--home-hero-gallery-width: 40rem;
	}

	.home-hero-copy-content {
		max-width: min(36rem, calc(100% - var(--home-hero-gallery-width) - 2rem));
	}
}

@media (min-width: 1024px) and (max-height: 850px) {
	.home-hero-display-prefix {
		font-size: clamp(1.25rem, 4dvh, 2.25rem);
		line-height: 1.08;
	}

	.home-hero-display-name {
		font-size: clamp(3.75rem, 15dvh, 8rem);
		line-height: 0.98;
	}

	.home-hero-copy-title {
		font-size: clamp(1rem, 3.2dvh, 1.5rem);
		line-height: 1.15;
	}

	.home-hero-copy-description {
		margin-top: 0.25rem;
		font-size: clamp(0.75rem, 2.4dvh, 1rem);
		line-height: 1.35;
	}
}

@media (max-height: 850px) {
	.mobile-scene-gallery-frame:nth-child(n + 2) {
		display: none;
	}

	.mobile-scene-gallery-frame {
		aspect-ratio: 1;
	}
}
</style>
