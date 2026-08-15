<template>
	<section
		class="relative isolate h-dvh min-h-160 w-full overflow-hidden bg-slate-950"
		:lang="locale"
	>
		<div class="absolute inset-0">
			<HomeImmersiveBlueMap
				:key="scene.id"
				:assets-base-url="mapAssetsProxyBaseUrl"
				:camera="scene.camera"
				:lighting="scene.lighting"
				:water="scene.water"
				:class="developerControlsEnabled ? undefined : 'pointer-events-none'"
			/>
		</div>
		<div
			class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_45%,transparent_0%,rgba(2,6,23,0.12)_42%,rgba(2,6,23,0.7)_100%)]"
		/>
		<div
			class="pointer-events-none absolute inset-y-0 left-0 w-full bg-linear-to-r from-slate-950/82 via-slate-950/34 to-transparent lg:w-[72%]"
		/>
		<div
			class="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] bg-linear-to-t from-slate-950/80 via-slate-950/24 to-transparent"
		/>

		<div
			class="immersive-site-shell pointer-events-none relative z-10 flex h-full flex-col px-6 pt-28 pb-8 text-white sm:px-10 lg:px-16 lg:pb-12"
		>
			<div class="mt-auto flex flex-col gap-3 lg:contents">
				<p
					v-if="scenePresentation.desktopVerticalName"
					class="lg:hidden lg:-translate-x-2 pointer-events-none inline-block max-w-full self-start bg-[linear-gradient(to_right,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_22%,rgba(255,255,255,0.8)_100%)] bg-clip-text font-serif text-[clamp(4.5rem,11vw,11rem)] font-bold tracking-[-0.04em] whitespace-pre-line text-transparent uppercase leading-[1.05] drop-shadow-[0_2px_16px_rgba(2,6,23,0.8)] lg:mt-16 select-none break-all hyphens-auto"
					aria-hidden="true"
				>
					{{ scenePresentation.name }}
				</p>
				<div
					v-if="scenePresentation.desktopVerticalName"
					class="lg:-translate-x-2 pointer-events-none mt-auto hidden items-start gap-4 self-start bg-[linear-gradient(to_right,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_22%,rgba(255,255,255,0.8)_100%)] bg-clip-text font-serif font-bold text-transparent lg:flex"
					aria-hidden="true"
				>
					<p
						class="text-[clamp(2rem,3vw,4rem)] leading-[1.16] tracking-[0.08em] [writing-mode:vertical-lr] [text-orientation:upright] mt-2"
					>
						{{ scenePresentation.desktopVerticalName.prefix }}
					</p>
					<div class="flex items-start gap-4">
						<p
							v-for="column in desktopVerticalNameColumns"
							:key="column"
							class="text-[clamp(4.5rem,11vw,11rem)] leading-[1.05] tracking-[0.08em] [writing-mode:vertical-lr] [text-orientation:upright]"
						>
							{{ column }}
						</p>
					</div>
				</div>
				<p
					v-else
					class="lg:-translate-x-2 pointer-events-none lg:mt-auto inline-block max-w-full self-start bg-[linear-gradient(to_right,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_22%,rgba(255,255,255,0.8)_100%)] bg-clip-text font-serif text-[clamp(4.5rem,11vw,11rem)] font-bold tracking-[-0.04em] whitespace-pre-line text-transparent uppercase leading-[1.05] drop-shadow-[0_2px_16px_rgba(2,6,23,0.8)] lg:mt-16 select-none break-all hyphens-auto"
					aria-hidden="true"
				>
					{{ scenePresentation.name }}
				</p>
			</div>
			<div
				class="lg:-translate-x-2 mt-3 lg:mx-4 inline-flex gap-1 w-fit items-center text-sm text-white/90 select-none"
			>
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
			</div>

			<div
				v-if="mobileSceneGallery.length"
				class="pointer-events-auto home-scene-gallery mobile-scene-gallery absolute top-28 right-6 z-20 flex w-28 flex-col gap-2 lg:hidden"
			>
				<button
					v-for="(image, imageIndex) in mobileSceneGallery"
					:key="image.asset"
					type="button"
					class="home-scene-gallery-frame mobile-scene-gallery-frame relative w-full cursor-zoom-in overflow-hidden rounded-lg border border-white/30 bg-slate-950/55 shadow-[0_12px_28px_rgba(2,6,23,0.38)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-sky-300"
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
						class="absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-950/88 via-slate-950/46 to-transparent px-2 pt-8 pb-2 text-left text-xs font-medium text-white [text-shadow:0_1px_6px_rgba(2,6,23,0.9)]"
					>
						{{ image.caption }}
					</span>
				</button>
			</div>

			<div
				class="mt-2 max-w-full pb-8 [text-shadow:0_2px_16px_rgba(2,6,23,0.8)] lg:mt-auto lg:pb-12"
			>
				<div class="max-w-xl">
					<h1
						class="uppercase whitespace-pre-line break-all hyphens-auto text-xl font-semibold tracking-[0.08em] sm:text-3xl"
					>
						{{ scenePresentation.title }}
					</h1>
					<p
						class="mt-2 whitespace-pre-line break-all hyphens-auto text-sm text-white/72 sm:text-lg"
					>
						{{ scenePresentation.description }}
					</p>
				</div>
			</div>

			<div
				class="pointer-events-auto home-scene-gallery absolute right-16 bottom-24 z-20 hidden gap-2 lg:flex"
			>
				<div v-if="sceneGallery.length" class="flex justify-end gap-2">
					<button
						v-for="(image, imageIndex) in sceneGallery"
						:key="image.asset"
						type="button"
						class="home-scene-gallery-frame relative w-52 shrink-0 cursor-zoom-in overflow-hidden rounded-lg border border-white/30 bg-slate-950/55 shadow-[0_12px_28px_rgba(2,6,23,0.38)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-sky-300"
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
							class="absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-950/88 via-slate-950/46 to-transparent px-2 pt-7 pb-2 text-left text-sm text-white [text-shadow:0_1px_6px_rgba(2,6,23,0.9)]"
						>
							{{ image.caption }}
						</span>
					</button>
				</div>
			</div>
			<div
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
	</section>
</template>

<script setup lang="ts">
import owenCoastConcert1 from '~/assets/resources/minecraft-gallery/season_8/owen_coast_concert_1.webp'
import owenWpgh1 from '~/assets/resources/minecraft-gallery/season_8/owen_wpgh_1.webp'
import type { NormalizedContentImageItem } from '~/components/content/utils/content-image'
import {
	defaultHomeImmersiveScene,
	HOME_IMMERSIVE_DEVELOPER_CONTROLS_ENABLED,
	HOME_IMMERSIVE_MAP_ASSETS_PROXY_BASE_URL,
	type HomeImmersiveSceneGalleryAsset,
} from '~/utils/home/immersive-scenes'
import { resolveMinecraftServerLocalizedName } from '~/utils/minecraft/server-name'
import type { ServerOverviewLiveResponse } from '~/utils/server/overview'

definePageMeta({
	headerVariant: 'hero',
	pageContainerVariant: 'immersive',
	pageTransition: {
		name: 'immersive-page',
		mode: 'out-in',
	},
})

const { locale, t } = useI18n()
const scene = defaultHomeImmersiveScene
const sceneGallerySources: Record<HomeImmersiveSceneGalleryAsset, string> = {
	owenCoastConcert1,
	owenWpgh1,
}
const scenePresentation = computed(
	() =>
		scene.presentation.locales[locale.value] ??
		scene.presentation.locales['en-US']!,
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
const desktopVerticalNameColumns = computed(
	() => scenePresentation.value.desktopVerticalName?.name.split('\n') ?? [],
)
const mapAssetsProxyBaseUrl = HOME_IMMERSIVE_MAP_ASSETS_PROXY_BASE_URL
const developerControlsEnabled = HOME_IMMERSIVE_DEVELOPER_CONTROLS_ENABLED
const { data: liveOverview, refresh: refreshLiveOverview } =
	await useFetch<ServerOverviewLiveResponse>('/api/public/server/overview-live')
let liveOverviewRefreshTimer: ReturnType<typeof setInterval> | null = null

const defaultServer = computed(() => {
	const overview = liveOverview.value
	if (!overview) return null

	return (
		overview.servers.find(
			(server) => server.serverId === overview.defaultServerId,
		) ?? null
	)
})
const serverName = computed(
	() =>
		(defaultServer.value &&
			resolveMinecraftServerLocalizedName(
				defaultServer.value.names,
				locale.value,
			)) ||
		t('home.immersive.serverUnavailable'),
)
const onlineCount = computed(
	() => defaultServer.value?.bridgeStatus.onlineCount ?? 0,
)
const maxPlayers = computed(
	() => defaultServer.value?.bridgeStatus.maxPlayers ?? 0,
)
const online = computed(() =>
	Boolean(defaultServer.value?.bridgeStatus.connected),
)

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
	if (!open) {
		activeSceneGalleryImage.value = null
	}
}

onMounted(() => {
	liveOverviewRefreshTimer = setInterval(() => {
		void refreshLiveOverview()
	}, 10_000)
})

onBeforeUnmount(() => {
	if (!liveOverviewRefreshTimer) return
	clearInterval(liveOverviewRefreshTimer)
	liveOverviewRefreshTimer = null
})
</script>

<style scoped>
.home-scene-gallery-frame {
	animation: home-scene-gallery-frame-in 620ms cubic-bezier(0.22, 1, 0.36, 1)
		both;
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

@media (prefers-reduced-motion: reduce) {
	.home-scene-gallery-frame {
		animation: none;
	}
}

@media (max-height: 700px) {
	.mobile-scene-gallery-frame:nth-child(n + 2) {
		display: none;
	}

	.mobile-scene-gallery-frame {
		aspect-ratio: 1;
	}
}
</style>
