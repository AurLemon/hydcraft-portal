<template>
	<section class="flex flex-col gap-6">
		<div class="flex justify-center">
			<h2
				class="text-center font-arkpixel text-3xl leading-tight tracking-wider text-slate-950 dark:text-slate-50 sm:text-4xl"
			>
				{{ t('content.intro.railways.title') }}
			</h2>
		</div>

		<div
			class="relative overflow-hidden rounded-xl border border-slate-200/80 bg-slate-950 dark:border-slate-800"
		>
			<div
				class="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
				:style="carouselTrackStyle"
			>
				<article
					v-for="route in railwayRoutes"
					:key="route.id"
					class="relative min-w-full overflow-hidden"
				>
					<div class="absolute inset-0 h-full w-full">
						<SkeletonImage
							:src="route.backgroundSrc"
							:alt="route.backgroundAlt"
							:reveal-delay-ms="90"
							class="h-full w-full select-none"
							image-class="block h-full w-full object-cover"
							skeleton-class="rounded-none"
						/>
					</div>
					<div
						class="absolute inset-0"
						:style="getRouteOverlayStyle(route.id)"
					/>
					<div
						class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_18%,rgba(2,6,23,0.16)_100%)]"
					/>

					<div
						class="relative z-10 flex min-h-120 flex-col gap-6 p-6 pb-12 lg:flex-row"
					>
						<div class="flex min-w-0 flex-1 flex-col">
							<div class="flex items-center gap-4">
								<div
									v-if="route.logoSrc"
									class="flex h-16 shrink-0 items-center justify-center"
								>
									<img
										:src="route.logoSrc"
										:alt="route.logoAlt ?? route.nameEn"
										class="max-h-full max-w-full object-contain"
									/>
								</div>
								<div class="min-w-0 flex-1">
									<p class="font-arkpixel text-3xl font-medium text-white">
										{{ route.nameZh }}
									</p>
									<div class="mt-1 flex flex-wrap items-center gap-2">
										<h3 class="text-sm text-white">
											{{ route.nameEn }}
										</h3>
										<div class="flex flex-wrap items-center gap-1">
											<UBadge
												v-for="tag in route.tags"
												:key="`${route.id}-${tag}`"
												color="neutral"
												variant="soft"
												size="xs"
											>
												{{ t(`content.intro.railways.tags.${tag}`) }}
											</UBadge>
										</div>
									</div>
								</div>
							</div>

							<p class="mt-5 line-clamp-3 max-w-3xl text-base text-white/88">
								{{ route.summary }}
							</p>

							<div
								class="mt-10 lg:mt-auto pt-1 lg:pt-6 flex items-center gap-3 sm:max-w-md"
							>
								<SkeletonImage
									:src="route.operatorHeadSrc"
									:alt="route.operatorId"
									class="size-12 shrink-0 drop-shadow select-none"
									image-class="size-12 rounded-xl object-cover"
								/>
								<div class="min-w-0">
									<div
										class="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1"
									>
										<p
											class="min-w-0 truncate font-arkpixel text-2xl leading-none tracking-wide text-white"
										>
											{{ route.operatorNickname }}
										</p>
										<p class="truncate text-sm text-white/68">
											{{ route.operatorId }}
										</p>
									</div>
								</div>
							</div>

							<div class="mt-3">
								<div
									class="grid gap-3 sm:grid-cols-3"
									:class="route.routeMap ? 'lg:max-w-xl' : 'lg:max-w-2xl'"
								>
									<button
										v-for="(galleryItem, galleryIndex) in route.gallery"
										:key="galleryItem.src"
										type="button"
										class="group relative block overflow-hidden rounded-xl border border-white/12 bg-white/8 text-left shadow-[0_14px_28px_rgba(2,6,23,0.24)] transition focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-sky-300"
										:aria-label="
											t('content.intro.railways.openGalleryImage', {
												index: galleryIndex + 1,
												route: route.nameEn,
											})
										"
										@click="openPreview(galleryItem)"
									>
										<SkeletonImage
											:src="galleryItem.src"
											:alt="galleryItem.alt"
											:reveal-delay-ms="90"
											class="h-28 w-full lg:h-32"
											image-class="block h-full w-full object-cover"
											skeleton-class="rounded-none"
										/>
										<div class="pointer-events-none absolute inset-0">
											<div
												class="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0)_48%,rgba(2,6,23,0.22)_100%)]"
											/>
											<div
												class="absolute inset-0 bg-linear-to-t from-slate-950/82 via-slate-950/42 to-transparent mask-[linear-gradient(to_top,black_0%,rgba(0,0,0,0.94)_12%,rgba(0,0,0,0.4)_22%,transparent_36%)]"
											/>
											<div
												class="absolute inset-0 bg-slate-950/0 transition-colors duration-300 ease-out group-hover:bg-slate-950/14"
											/>
										</div>
										<div
											class="absolute inset-x-0 bottom-0 p-2 text-xs text-white"
										>
											<p class="line-clamp-2 leading-4">
												{{ galleryItem.caption }}
											</p>
										</div>
									</button>
									<button
										v-if="route.routeMap"
										type="button"
										class="group relative block overflow-hidden rounded-xl border border-white/12 bg-white/8 text-left shadow-[0_14px_28px_rgba(2,6,23,0.24)] transition focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-sky-300 lg:hidden"
										:aria-label="
											t('content.intro.railways.openRouteMap', {
												route: route.nameEn,
											})
										"
										@click="openPreview(route.routeMap)"
									>
										<SkeletonImage
											:src="route.routeMap.src"
											:alt="route.routeMap.alt"
											:reveal-delay-ms="90"
											class="h-28 w-full sm:h-32"
											image-class="block h-full w-full object-cover"
											skeleton-class="rounded-none"
										/>
										<div class="pointer-events-none absolute inset-0">
											<div
												class="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0)_48%,rgba(2,6,23,0.22)_100%)]"
											/>
											<div
												class="absolute inset-0 bg-linear-to-t from-slate-950/82 via-slate-950/42 to-transparent mask-[linear-gradient(to_top,black_0%,rgba(0,0,0,0.94)_12%,rgba(0,0,0,0.4)_22%,transparent_36%)]"
											/>
											<div
												class="absolute inset-0 bg-slate-950/0 transition-colors duration-300 ease-out group-hover:bg-slate-950/14"
											/>
										</div>
										<div
											class="absolute inset-x-0 bottom-0 p-2 text-xs text-white"
										>
											<p class="leading-4">
												{{ t('content.intro.railways.routeMapLabel') }}
											</p>
										</div>
									</button>
								</div>
							</div>
						</div>

						<div
							v-if="route.routeMap"
							class="hidden lg:flex lg:w-76 lg:shrink-0 lg:items-end"
						>
							<button
								type="button"
								class="group relative w-full focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-sky-300"
								:aria-label="
									t('content.intro.railways.openRouteMap', {
										route: route.nameEn,
									})
								"
								@click="openPreview(route.routeMap)"
							>
								<div
									class="relative mx-auto lg:mr-0 w-fit overflow-hidden rounded-xl"
								>
									<SkeletonImage
										:src="route.routeMap.src"
										:alt="route.routeMap.alt"
										:reveal-delay-ms="90"
										class="flex w-full items-center justify-center"
										image-class="ml-auto block max-h-[12rem] w-auto max-w-full rounded-xl object-contain sm:max-h-[16rem]"
										skeleton-class="rounded-xl"
									/>
									<div
										class="pointer-events-none absolute inset-0 rounded-xl bg-slate-950/0 transition-colors duration-300 ease-out group-hover:bg-slate-950/14"
									/>
								</div>
							</button>
						</div>
					</div>
				</article>
			</div>

			<div
				class="absolute inset-x-4 bottom-4 z-20 flex items-center justify-center gap-3 sm:inset-x-6"
			>
				<UButton
					color="neutral"
					variant="ghost"
					size="xs"
					icon="i-lucide-chevron-left"
					class="text-white hover:bg-white/14 hover:text-white dark:text-white dark:hover:bg-white/12"
					:aria-label="t('content.intro.railways.prev')"
					@click="goPrevRoute"
				/>
				<div class="flex items-center gap-1.5">
					<button
						v-for="(route, routeIndex) in railwayRoutes"
						:key="`${route.id}-dot`"
						type="button"
						class="block size-2 rounded-full transition-all duration-200"
						:class="
							routeIndex === currentRouteIndex
								? 'bg-white'
								: 'bg-white/35 hover:bg-white/60'
						"
						:aria-label="
							t('content.intro.railways.goto', {
								index: routeIndex + 1,
							})
						"
						@click="goToRoute(routeIndex)"
					/>
				</div>
				<UButton
					color="neutral"
					variant="ghost"
					size="xs"
					icon="i-lucide-chevron-right"
					class="text-white hover:bg-white/14 hover:text-white dark:text-white dark:hover:bg-white/12"
					:aria-label="t('content.intro.railways.next')"
					@click="goNextRoute"
				/>
			</div>
		</div>

		<ContentImageLightbox
			:open="lightboxOpen"
			:image="activeImage"
			@update:open="handleLightboxOpenChange"
		/>
	</section>
</template>

<script setup lang="ts">
import type { NormalizedContentImageItem } from '~/components/content/utils/content-image'
import { getMinecraftHeadRendererUrl } from '~/utils/minecraft/body-renderer'
import {
	DEFAULT_IMAGE_ACCENT,
	loadImageAccentColor,
	type ImageAccentRgbColor,
} from '~/utils/minecraft/skin-accent'
import { getSiteMediaUrl } from '~/utils/assets/site-media-url'

type RailwayRouteId = 'gtr' | 'hrJianghu' | 'hrYiheng'
type RailwayTag = 'create' | 'mtr'

interface RailwayGalleryItem {
	src: string
	caption: string
	alt: string
}

interface RailwayRouteDefinition {
	id: RailwayRouteId
	logoSrc?: string
	backgroundSrc: string
	routeMapSrc?: string
	tags: RailwayTag[]
	operatorId: string
	gallerySrcs: string[]
}

interface RailwayRouteCard {
	id: RailwayRouteId
	nameZh: string
	nameEn: string
	summary: string
	logoSrc?: string
	logoAlt?: string
	backgroundSrc: string
	backgroundAlt: string
	routeMap?: RailwayGalleryItem
	tags: RailwayTag[]
	operatorId: string
	operatorHeadSrc: string
	operatorNickname: string
	gallery: RailwayGalleryItem[]
}

type RouteAccentColorMap = Record<RailwayRouteId, ImageAccentRgbColor>

const RAILWAY_CAROUSEL_INTERVAL = 5000
const railwayRouteDefinitions: RailwayRouteDefinition[] = [
	{
		id: 'gtr',
		logoSrc: getSiteMediaUrl('routes-system/gtr_logo.webp'),
		backgroundSrc: getSiteMediaUrl('minecraft-gallery/routes/gtr_bg.webp'),
		routeMapSrc: getSiteMediaUrl('routes-map/gtr_routes_map.webp'),
		tags: ['create'],
		operatorId: 'FisheyeArtist59',
		gallerySrcs: [
			getSiteMediaUrl('minecraft-gallery/routes/gtr_gallery_1.webp'),
			getSiteMediaUrl('minecraft-gallery/routes/gtr_gallery_2.webp'),
			getSiteMediaUrl('minecraft-gallery/routes/gtr_gallery_3.webp'),
		],
	},
	{
		id: 'hrJianghu',
		backgroundSrc: getSiteMediaUrl(
			'minecraft-gallery/routes/hr_jianghu_bg.webp',
		),
		tags: ['mtr'],
		operatorId: 'Nina_Naganohara',
		gallerySrcs: [
			getSiteMediaUrl('minecraft-gallery/routes/hr_jianghu_gallery_1.webp'),
			getSiteMediaUrl('minecraft-gallery/routes/hr_jianghu_gallery_2.webp'),
			getSiteMediaUrl('minecraft-gallery/routes/hr_jianghu_gallery_3.webp'),
		],
	},
	{
		id: 'hrYiheng',
		logoSrc: getSiteMediaUrl('routes-system/hr_yiheng_logo.webp'),
		backgroundSrc: getSiteMediaUrl(
			'minecraft-gallery/routes/hr_yiheng_bg.webp',
		),
		routeMapSrc: getSiteMediaUrl('routes-map/hr_yiheng_routes_map.webp'),
		tags: ['mtr'],
		operatorId: 'larker_package',
		gallerySrcs: [
			getSiteMediaUrl('minecraft-gallery/routes/hr_yiheng_gallery_1.webp'),
			getSiteMediaUrl('minecraft-gallery/routes/hr_yiheng_gallery_2.webp'),
			getSiteMediaUrl('minecraft-gallery/routes/hr_yiheng_gallery_3.webp'),
		],
	},
]

const { t } = useI18n()

const currentRouteIndex = ref(0)
const activeImage = ref<NormalizedContentImageItem | null>(null)
const routeAccentColors = ref<RouteAccentColorMap>({
	gtr: { ...DEFAULT_IMAGE_ACCENT },
	hrJianghu: { ...DEFAULT_IMAGE_ACCENT },
	hrYiheng: { ...DEFAULT_IMAGE_ACCENT },
})

let railwayCarouselTimer: ReturnType<typeof setInterval> | null = null
let accentLoadToken = 0

const lightboxOpen = computed<boolean>(() => activeImage.value !== null)

const carouselTrackStyle = computed(() => ({
	transform: `translate3d(-${currentRouteIndex.value * 100}%, 0, 0)`,
}))

const getRouteOverlayStyle = (routeId: RailwayRouteId) => {
	const accentColor = routeAccentColors.value[routeId] ?? DEFAULT_IMAGE_ACCENT
	const accentRgbText = `${accentColor.r}, ${accentColor.g}, ${accentColor.b}`

	return {
		background: `radial-gradient(circle at 84% 18%, rgba(${accentRgbText}, 0.3) 0%, rgba(${accentRgbText}, 0.16) 24%, rgba(2,6,23,0) 46%), linear-gradient(118deg, rgba(2,6,23,0.94) 0%, rgba(15,23,42,0.78) 34%, rgba(15,23,42,0.42) 58%, rgba(${accentRgbText}, 0.22) 78%, rgba(2,6,23,0.9) 100%)`,
	}
}

const toLightboxImage = (
	item: RailwayGalleryItem,
): NormalizedContentImageItem => ({
	src: item.src,
	alt: item.alt,
	caption: item.caption,
	width: '100%',
	height: '100%',
	aspectRatio: null,
})

const railwayRoutes = computed<RailwayRouteCard[]>(() =>
	railwayRouteDefinitions.map((route) => ({
		id: route.id,
		nameZh: t(`content.intro.railways.routes.${route.id}.nameZh`),
		nameEn: t(`content.intro.railways.routes.${route.id}.nameEn`),
		summary: t(`content.intro.railways.routes.${route.id}.summary`),
		logoSrc: route.logoSrc,
		logoAlt: route.logoSrc
			? t(`content.intro.railways.routes.${route.id}.logoAlt`)
			: undefined,
		backgroundSrc: route.backgroundSrc,
		backgroundAlt: t(`content.intro.railways.routes.${route.id}.backgroundAlt`),
		routeMap: route.routeMapSrc
			? {
					src: route.routeMapSrc,
					alt: t(`content.intro.railways.routes.${route.id}.routeMapAlt`),
					caption: '',
				}
			: undefined,
		tags: route.tags,
		operatorId: route.operatorId,
		operatorHeadSrc: getMinecraftHeadRendererUrl(route.operatorId),
		operatorNickname: t(
			`content.intro.railways.routes.${route.id}.operator.nickname`,
		),
		gallery: route.gallerySrcs.map((src, index) => ({
			src,
			caption: t(
				`content.intro.railways.routes.${route.id}.gallery.${index}.caption`,
			),
			alt: t(`content.intro.railways.routes.${route.id}.gallery.${index}.alt`),
		})),
	})),
)

const stopRailwayCarousel = (): void => {
	if (railwayCarouselTimer) {
		clearInterval(railwayCarouselTimer)
		railwayCarouselTimer = null
	}
}

const startRailwayCarousel = (): void => {
	if (!import.meta.client) {
		return
	}
	stopRailwayCarousel()
	if (railwayRoutes.value.length <= 1) {
		return
	}
	railwayCarouselTimer = setInterval(() => {
		currentRouteIndex.value =
			(currentRouteIndex.value + 1) % railwayRoutes.value.length
	}, RAILWAY_CAROUSEL_INTERVAL)
}

const resetRailwayCarousel = (): void => {
	startRailwayCarousel()
}

const goToRoute = (index: number): void => {
	currentRouteIndex.value = index
	resetRailwayCarousel()
}

const goPrevRoute = (): void => {
	currentRouteIndex.value =
		(currentRouteIndex.value - 1 + railwayRoutes.value.length) %
		railwayRoutes.value.length
	resetRailwayCarousel()
}

const goNextRoute = (): void => {
	currentRouteIndex.value =
		(currentRouteIndex.value + 1) % railwayRoutes.value.length
	resetRailwayCarousel()
}

const openPreview = (item: RailwayGalleryItem): void => {
	stopRailwayCarousel()
	activeImage.value = toLightboxImage(item)
}

const handleLightboxOpenChange = (open: boolean): void => {
	if (!open) {
		activeImage.value = null
	}
}

const syncRouteAccentColors = async (): Promise<void> => {
	if (!import.meta.client) {
		return
	}

	const currentToken = ++accentLoadToken

	const accentEntries = await Promise.all(
		railwayRouteDefinitions.map(
			async (route) =>
				[route.id, await loadImageAccentColor(route.backgroundSrc)] as const,
		),
	)

	if (currentToken !== accentLoadToken) {
		return
	}

	routeAccentColors.value = Object.fromEntries(
		accentEntries,
	) as RouteAccentColorMap
}

watch(
	() => railwayRoutes.value.length,
	(routeCount) => {
		if (routeCount === 0) {
			currentRouteIndex.value = 0
			stopRailwayCarousel()
			return
		}

		if (currentRouteIndex.value >= routeCount) {
			currentRouteIndex.value = 0
		}

		if (import.meta.client) {
			startRailwayCarousel()
		}
	},
	{ immediate: true },
)

watch(lightboxOpen, (open) => {
	if (open) {
		stopRailwayCarousel()
		return
	}

	if (!import.meta.client || railwayRoutes.value.length <= 1) {
		return
	}

	window.setTimeout(() => {
		if (lightboxOpen.value) {
			return
		}

		startRailwayCarousel()
	}, 0)
})

onMounted(() => {
	void syncRouteAccentColors()
})

onBeforeUnmount(() => {
	accentLoadToken += 1
	stopRailwayCarousel()
})
</script>
