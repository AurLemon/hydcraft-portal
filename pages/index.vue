<template>
	<div :lang="locale">
		<div
			ref="scrollStoryRef"
			class="relative w-full bg-[var(--color-surface-0)]"
			:style="{ height: `${sceneStoryHeightDvh}dvh` }"
		>
			<section
				class="sticky top-0 isolate h-dvh min-h-160 w-full overflow-hidden bg-[var(--color-surface-0)]"
			>
				<div
					class="absolute inset-0 transition-[opacity,filter,transform] duration-500"
					:class="[
						sceneSwitching ? 'scale-[1.01] opacity-40 blur-[2px]' : '',
						developerControlsEnabled && heroActive ? 'z-50' : '',
					]"
					:style="{
						opacity: sceneSwitching ? Math.min(mapOpacity, 0.4) : mapOpacity,
					}"
				>
					<HomeImmersiveBlueMap
						ref="homeMapRef"
						:key="scene.mapAssetsBaseUrl"
						:assets-base-url="mapAssetsProxyBaseUrl"
						:camera="scene.camera"
						:overview-camera="scene.overviewCamera"
						:mobile-overview-camera="scene.mobileOverviewCamera"
						:outro-camera="outroCamera"
						:mobile-outro-camera="mobileOutroCamera"
						:outro-transition-start="sceneCommunityProgressEnd"
						:outro-transition-end="outroProgressStart"
						:lighting="scene.lighting"
						:water="homeImmersiveWater"
						:focus-positions="scenePlayerFocusPositions"
						:focus-progress-end="sceneFocusProgressEnd"
						:world-player-markers="worldPlayerMarkers"
						:marker-clicks-only="!developerControlsEnabled"
						:developer-controls-enabled="developerControlsEnabled"
						:developer-controls-active="developerControlsEnabled && heroActive"
						@world-player-marker-click="handleWorldPlayerMarkerClick"
						@ready="handleSceneMapSettled"
						@error="handleSceneMapSettled"
						@scene-camera-settled="handleSceneMapSettled"
					/>
				</div>

				<HomeSceneSwitcher
					v-model="selectedSceneIndex"
					:scenes="sceneSwitcherItems"
					:active="heroActive"
					:counting="!sceneCountdownPaused"
				/>
				<div ref="firstBackdropRef" class="absolute inset-0">
					<div
						class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_45%,transparent_0%,rgba(2,6,23,0.12)_42%,rgba(2,6,23,0.7)_100%)]"
					/>
					<div
						class="pointer-events-none absolute inset-y-0 left-0 w-full bg-linear-to-r from-slate-950/82 via-slate-950/34 to-transparent lg:w-[72%]"
					/>
					<div
						class="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] bg-linear-to-t from-slate-950/80 via-slate-950/24 to-transparent"
					/>
				</div>

				<div
					ref="firstPanelRef"
					class="immersive-site-shell pointer-events-none relative z-10 flex h-full flex-col px-6 pt-28 pb-8 text-white transition-[opacity,filter,transform] ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-10 lg:px-16 lg:pb-12"
					:class="
						sceneSwitching
							? '!opacity-0 !blur-md translate-y-2 duration-500'
							: 'duration-200'
					"
				>
					<div class="mt-auto flex flex-col gap-3 lg:contents">
						<p
							data-home-exit="content"
							class="lg:hidden lg:-translate-x-2 pointer-events-none inline-block max-w-full self-start bg-[linear-gradient(to_right,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_22%,rgba(255,255,255,0.8)_100%)] bg-clip-text font-serif text-[clamp(4.5rem,11vw,11rem)] font-extrabold tracking-[-0.04em] whitespace-pre-line text-transparent uppercase leading-[1.05] drop-shadow-[0_2px_16px_rgba(2,6,23,0.8)] lg:mt-16 select-none break-all hyphens-auto"
							aria-hidden="true"
						>
							<template v-if="mobileSceneNamePrefix">
								<span
									class="relative left-1.5 block text-[clamp(1.5rem,4.5vw,2.75rem)] leading-[1.16] tracking-[0.08em]"
								>
									{{ mobileSceneNamePrefix }}
								</span>
								<span class="block">{{ mobileSceneName }}</span>
							</template>
							<template v-else>{{ scenePresentation.name }}</template>
						</p>
						<div
							data-home-exit="content"
							class="lg:-translate-x-2 pointer-events-none mt-auto hidden self-start bg-[linear-gradient(to_right,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_22%,rgba(255,255,255,0.8)_100%)] bg-clip-text font-serif font-extrabold text-transparent lg:flex"
							:class="
								desktopDisplayName?.layout === 'vertical'
									? 'items-start gap-4'
									: 'lg:mt-16 flex-col items-start gap-1'
							"
							aria-hidden="true"
						>
							<template v-if="desktopDisplayName?.layout === 'vertical'">
								<div
									class="relative mt-2 left-1.5 text-[clamp(1.5rem,2.5vw,3.5rem)] leading-[1.16] tracking-[0.08em] [writing-mode:vertical-lr] [text-orientation:upright]"
								>
									{{ desktopDisplayName.prefix }}
								</div>
								<div class="flex items-start gap-4">
									<p
										v-for="column in desktopVerticalNameColumns"
										:key="column"
										class="text-[clamp(4.5rem,11vw,11rem)] leading-[1.05] tracking-[0.08em] [writing-mode:vertical-lr] [text-orientation:upright]"
									>
										{{ column }}
									</p>
								</div>
							</template>
							<template v-else-if="desktopDisplayName">
								<div
									class="relative left-1.5 whitespace-pre-line text-[clamp(1.5rem,2.5vw,3.5rem)] leading-[1.16] tracking-[0.08em]"
								>
									{{ desktopDisplayName.prefix }}
								</div>
								<div
									class="text-[clamp(4.5rem,11vw,11rem)] leading-[1.05] tracking-[0.08em] whitespace-pre-line"
								>
									{{ desktopDisplayName.name }}
								</div>
							</template>
							<p
								v-else
								class="inline-block max-w-full text-[clamp(4.5rem,11vw,11rem)] font-extrabold tracking-[-0.04em] whitespace-pre-line uppercase leading-[1.05] drop-shadow-[0_2px_16px_rgba(2,6,23,0.8)] select-none break-all hyphens-auto"
							>
								{{ scenePresentation.name }}
							</p>
						</div>
					</div>
					<div
						data-home-exit="content"
						class="pointer-events-auto inline-flex w-fit items-center gap-1 text-sm text-white/90 select-none"
						:class="
							scenePresentation.credit
								? 'lg:-translate-x-2 mt-3 lg:mx-4'
								: 'hidden'
						"
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
						<span class="text-white/62"
							>{{ onlineCount }}/{{ maxPlayers }}</span
						>
					</div>

					<ContentImageLightbox
						:open="sceneGalleryLightboxOpen"
						:image="activeSceneGalleryImage"
						@update:open="handleSceneGalleryLightboxOpenChange"
					/>
				</div>

				<div class="pointer-events-none absolute inset-0 z-30">
					<HomeOverviewStory
						:phase="overviewPhase"
						:scene-short-name="sceneShortName"
						:players="sceneOverviewPlayers"
						:active-player-index="activePlayerIndex"
						:player-progress="playerCarouselProgress"
						:player-stack-entry-progress="playerStackEntryProgress"
						:player-stack-exit-progress="playerStackExitProgress"
						:community-members="overviewCommunityMembers"
						:founded-days="foundedDays"
						:member-count="homeImmersiveOverview.stats.memberCount"
						v-model:detail-person-id="overviewDetailPersonId"
					/>
				</div>

				<div class="pointer-events-none absolute inset-0 z-40">
					<HomeOutroSection
						mode="story"
						:progress="outroProgress"
						:background-src="outroBackground"
						:screenshots="outroScreenshots"
					/>
				</div>
			</section>
		</div>
	</div>
</template>

<script setup lang="ts">
import owenCoastConcert1 from '~/assets/resources/minecraft-gallery/season_8/owen_coast_concert_1.webp'
import owenWpgh1 from '~/assets/resources/minecraft-gallery/season_8/owen_wpgh_1.webp'
import outroBackground from '~/assets/resources/minecraft-gallery/season_8/owen_screenshots_1.webp'
import outroTerrain from '~/assets/resources/minecraft-gallery/season_8/terrain_advance_screenshots.webp'
import outroSpawn from '~/assets/resources/minecraft-gallery/season_8/spawnpoint_screenshots_1.webp'
import guangyangScreenshots1 from '~/assets/resources/minecraft-gallery/season_8/guangyang_screenshots_1.webp'
import guangyangScreenshots2 from '~/assets/resources/minecraft-gallery/season_8/guangyang_screenshots_2.webp'
import saikongScreenshots1 from '~/assets/resources/minecraft-gallery/season_8/saikong_screenshots_1.webp'
import xwHotelScreenshots1 from '~/assets/resources/minecraft-gallery/season_7/xw_hotel_screenshots_1.webp'
import xwHotelScreenshots2 from '~/assets/resources/minecraft-gallery/season_7/xw_hotel_screenshots_2.webp'
import type { NormalizedContentImageItem } from '~/components/content/utils/content-image'
import type {
	HomeOverviewPerson,
	HomeOverviewPhase,
} from '~/components/home/HomeOverviewStory.vue'
import type {
	BlueMapWorldPlayerMarker,
	BlueMapWorldPlayerMarkerClickEventPayload,
} from '~/utils/map'
import {
	defaultHomeImmersiveScene,
	homeImmersiveOverview,
	homeImmersiveScenes,
	homeImmersiveWater,
	getHomeImmersiveMapAssetsProxyBaseUrl,
	HOME_IMMERSIVE_DEVELOPER_CONTROLS_ENABLED,
	type HomeImmersiveLocalizedText,
	type HomeImmersiveMapPosition,
	type HomeImmersiveSceneGalleryAsset,
	type HomeImmersiveSceneCamera,
} from '~/utils/home/immersive-scenes'
import type { MinecraftAccountSummary } from '~/utils/minecraft/accounts'
import { getMinecraftAvatarRendererUrl } from '~/utils/minecraft/body-renderer'
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
const selectedSceneIndex = useState<number>('home-immersive-scene-index', () =>
	homeImmersiveScenes.length > 1
		? Math.floor(Math.random() * homeImmersiveScenes.length)
		: 0,
)
const activeSceneIndex = ref(selectedSceneIndex.value)
const scene = computed(
	() =>
		homeImmersiveScenes[activeSceneIndex.value] ?? defaultHomeImmersiveScene,
)
const overviewMemberOrder = useState<string[]>(
	'home-immersive-overview-member-order',
	() =>
		homeImmersiveOverview.members
			.map((member) => member.id)
			.sort(() => Math.random() - 0.5),
)
const { data: liveOverview, refresh: refreshLiveOverview } =
	await useFetch<ServerOverviewLiveResponse>('/api/public/server/overview-live')
interface HomeImmersiveBlueMapHandle {
	setScrollProgress(progress: number): void
}
const scrollStoryRef = ref<HTMLElement | null>(null)
const homeMapRef = ref<HomeImmersiveBlueMapHandle | null>(null)
const firstBackdropRef = ref<HTMLElement | null>(null)
const firstPanelRef = ref<HTMLElement | null>(null)
const heroActive = ref(true)
const sceneSwitching = ref(false)
const sceneCountdownPaused = ref(false)
const overviewPhase = ref<HomeOverviewPhase>('hidden')
const outroProgress = ref(0)
const overviewDetailPersonId = ref<string | null>(null)
const activePlayerIndex = ref(0)
const playerCarouselProgress = ref(0)
const playerStackEntryProgress = ref(0)
const playerStackExitProgress = ref(0)
const mapOpacity = ref(1)
const scenePlayerPositions = shallowRef<
	Record<string, HomeImmersiveMapPosition>
>({})
const overviewMemberPositions = shallowRef<
	Record<string, HomeImmersiveMapPosition>
>({})
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
		scene.value.presentation.locales[locale.value] ??
		scene.value.presentation.locales['en-US']!,
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
	locale.value.startsWith('zh')
		? scenePresentation.value.desktopDisplayName
		: undefined,
)
const desktopVerticalNameColumns = computed(() =>
	desktopDisplayName.value?.layout === 'vertical'
		? desktopDisplayName.value.name.split('\n')
		: [],
)
const resolveLocalizedText = (text: HomeImmersiveLocalizedText): string =>
	text[locale.value] ?? text['en-US'] ?? Object.values(text)[0] ?? ''
const sceneShortName = computed(() =>
	resolveLocalizedText(scene.value.shortName),
)
const sceneSwitcherItems = computed(() =>
	homeImmersiveScenes.map((item) => ({
		id: item.id,
		label: resolveLocalizedText(item.shortName),
	})),
)
const sceneLocatedPlayers = computed(() =>
	[...scene.value.players]
		.sort((left, right) => left.focusOrder - right.focusOrder)
		.flatMap((player) => {
			const position = scenePlayerPositions.value[player.id]
			return position ? [{ player, position }] : []
		}),
)
const scenePlayerFocusPositions = computed(() =>
	sceneLocatedPlayers.value.map(({ position }) => position),
)
const scenePlayerCount = computed(() => scene.value.players.length)
const heroProgressEnd = 0.14
const scenePlayerEntryProgressEnd = 0.24
const PLAYER_FIRST_FOCUS_DWELL_SHARE = 0.42
const PLAYER_FOCUS_DWELL_SHARE = 0.17
const communityScrollDvh = 16
const outroTransitionDvh = 32
const sceneStoryHeightDvh = computed(() => {
	if (scenePlayerCount.value <= 1) return 300
	if (scenePlayerCount.value === 2) return 400
	return 450
})
const sceneFocusProgressEnd = computed(() => {
	if (scenePlayerCount.value <= 1) return 0.34
	if (scenePlayerCount.value === 2) return 0.46
	return 0.56
})
const sceneCommunityProgressStart = computed(() =>
	Math.min(sceneFocusProgressEnd.value + 0.04, 0.94),
)
const sceneCommunityProgressEnd = computed(() =>
	Math.min(
		sceneCommunityProgressStart.value +
			communityScrollDvh / (sceneStoryHeightDvh.value - 100),
		0.98,
	),
)
const outroProgressStart = computed(() =>
	Math.max(
		sceneCommunityProgressEnd.value,
		1 - outroTransitionDvh / Math.max(sceneStoryHeightDvh.value - 100, 1),
	),
)
const outroPresentationStart = computed(() => sceneCommunityProgressEnd.value)
const outroCamera = computed<HomeImmersiveSceneCamera>(() => ({
	...homeImmersiveOverview.map.camera,
	x: homeImmersiveOverview.map.fallbackSpawn.x,
	y: homeImmersiveOverview.map.fallbackSpawn.y,
	z: homeImmersiveOverview.map.fallbackSpawn.z,
	distance: 5200,
	angle: 0.34,
}))
const mobileOutroCamera = computed<HomeImmersiveSceneCamera>(() => ({
	...homeImmersiveOverview.map.mobileCamera,
	x: homeImmersiveOverview.map.fallbackSpawn.x,
	y: homeImmersiveOverview.map.fallbackSpawn.y,
	z: homeImmersiveOverview.map.fallbackSpawn.z,
	distance: 7600,
	angle: 0.3,
}))
const sceneOverviewPlayers = computed<HomeOverviewPerson[]>(() =>
	[...scene.value.players]
		.sort((left, right) => left.focusOrder - right.focusOrder)
		.map((player) => ({
			id: player.id,
			nickname: player.nickname,
			description: resolveLocalizedText(player.bio),
			avatarUrl: getMinecraftAvatarRendererUrl(player.id),
			isAdministrator: false,
			position: scenePlayerPositions.value[player.id],
		})),
)
const overviewCommunityMembers = computed<HomeOverviewPerson[]>(() =>
	overviewMemberOrder.value
		.map((memberId) =>
			homeImmersiveOverview.members.find((member) => member.id === memberId),
		)
		.filter(
			(member): member is (typeof homeImmersiveOverview.members)[number] =>
				Boolean(member),
		)
		.map((member) => {
			const position = overviewMemberPositions.value[member.id]

			return {
				id: member.id,
				nickname: member.nickname,
				description: resolveLocalizedText(member.bio),
				avatarUrl: getMinecraftAvatarRendererUrl(member.id),
				isAdministrator:
					member.roles.includes('owner') || member.roles.includes('committee'),
				position,
			}
		}),
)
const worldPlayerMarkers = computed<BlueMapWorldPlayerMarker[]>(() => {
	const people =
		overviewPhase.value === 'community'
			? overviewCommunityMembers.value
			: overviewPhase.value === 'scene' || overviewPhase.value === 'players'
				? sceneOverviewPlayers.value
				: []
	const markerGroup =
		overviewPhase.value === 'community' ? 'community' : 'scene'
	const focusedScenePlayerId =
		markerGroup === 'scene'
			? sceneOverviewPlayers.value[activePlayerIndex.value]?.id
			: undefined

	return people.flatMap((person) => {
		if (!person.position) return []

		return [
			{
				id: `${markerGroup}-${person.id}`,
				playerId: person.id,
				label: person.id,
				avatarUrl: person.avatarUrl,
				isAdministrator: person.isAdministrator,
				isFocused:
					markerGroup === 'scene'
						? person.id === focusedScenePlayerId
						: undefined,
				x: person.position.x,
				y: person.position.y,
				z: person.position.z,
			},
		]
	})
})
const foundedDays = computed(() =>
	Math.max(
		0,
		Math.floor(
			(Date.now() - new Date(homeImmersiveOverview.stats.foundedAt).getTime()) /
				86_400_000,
		),
	),
)
const outroScreenshots = computed(() => [
	{
		src: outroTerrain,
		alt: t('home.immersive.outro.screenshotAlt', { index: 1 }),
	},
	{
		src: outroSpawn,
		alt: t('home.immersive.outro.screenshotAlt', { index: 2 }),
	},
	{
		src: owenCoastConcert1,
		alt: t('home.immersive.outro.screenshotAlt', { index: 3 }),
	},
])
const mapAssetsProxyBaseUrl = computed(() =>
	getHomeImmersiveMapAssetsProxyBaseUrl(scene.value.id),
)
const developerControlsEnabled = HOME_IMMERSIVE_DEVELOPER_CONTROLS_ENABLED
let liveOverviewRefreshTimer: ReturnType<typeof setInterval> | null = null
let revertScrollStory: (() => void) | null = null
let stopSceneLocationWatch: (() => void) | null = null
let sceneLocationLoadGeneration = 0
let overviewLocationLoadGeneration = 0
let sceneLocationRefreshTimer: ReturnType<typeof setInterval> | null = null
let sceneSwitchTimer: ReturnType<typeof setTimeout> | null = null
let sceneCountdownResumeTimer: ReturnType<typeof setTimeout> | null = null
let sceneSwitchWatchdogTimer: ReturnType<typeof setTimeout> | null = null
let refreshScrollStory: (() => void) | null = null
let latestStoryProgress = 0
const SCENE_SWITCH_OUT_DURATION_MS = 650
const SCENE_SWITCH_IN_DURATION_MS = 200
const SCENE_SWITCH_MAX_WAIT_MS = SCENE_SWITCH_IN_DURATION_MS

const handleSceneMapSettled = (): void => {
	if (!sceneSwitching.value) return

	if (sceneSwitchWatchdogTimer) {
		clearTimeout(sceneSwitchWatchdogTimer)
		sceneSwitchWatchdogTimer = null
	}
	sceneSwitching.value = false
	if (sceneCountdownResumeTimer) clearTimeout(sceneCountdownResumeTimer)
	sceneCountdownResumeTimer = setTimeout(() => {
		sceneCountdownPaused.value = false
		sceneCountdownResumeTimer = null
	}, SCENE_SWITCH_IN_DURATION_MS)
}

interface HomePublicPlayerResponse {
	account: MinecraftAccountSummary
}

type HomePlayerPositionEntry = readonly [string, HomeImmersiveMapPosition]

const isHomePlayerPositionEntry = (
	entry: HomePlayerPositionEntry | null,
): entry is HomePlayerPositionEntry => entry !== null

const resolveServerPlayerPosition = (
	account: MinecraftAccountSummary,
	serverId: string,
): HomeImmersiveMapPosition | null => {
	const location = account.serverViews.find(
		(view) => view.serverId === serverId,
	)?.presence?.lastSavedLocation
	if (
		!location ||
		!Number.isFinite(location.x) ||
		!Number.isFinite(location.y) ||
		!Number.isFinite(location.z)
	) {
		return null
	}
	const dimension =
		`${location.dimension ?? ''} ${location.worldName ?? ''}`.toLowerCase()
	if (dimension.includes('nether') || dimension.includes('the_end')) return null

	return {
		x: location.x!,
		y: location.y!,
		z: location.z!,
	}
}

const refreshScenePlayerLocations = async (): Promise<void> => {
	const currentScene = scene.value
	const generation = ++sceneLocationLoadGeneration
	const entries = await Promise.all(
		currentScene.players.map(async (player) => {
			try {
				const response = await $fetch<HomePublicPlayerResponse>(
					`/api/public/players/${encodeURIComponent(player.id)}`,
				)
				const position = resolveServerPlayerPosition(
					response.account,
					player.serverId,
				)
				return position ? ([player.id, position] as const) : null
			} catch {
				return null
			}
		}),
	)
	if (generation !== sceneLocationLoadGeneration) return
	scenePlayerPositions.value = Object.fromEntries(
		entries.filter(isHomePlayerPositionEntry),
	)
}

const refreshOverviewMemberLocations = async (): Promise<void> => {
	const generation = ++overviewLocationLoadGeneration
	const entries: HomePlayerPositionEntry[] = []
	const batchSize = 6

	for (
		let offset = 0;
		offset < homeImmersiveOverview.members.length;
		offset += batchSize
	) {
		const batchEntries = await Promise.all(
			homeImmersiveOverview.members
				.slice(offset, offset + batchSize)
				.map(async (member) => {
					try {
						const response = await $fetch<HomePublicPlayerResponse>(
							`/api/public/players/${encodeURIComponent(member.id)}`,
						)
						const position = resolveServerPlayerPosition(
							response.account,
							member.serverId,
						)
						return position ? ([member.id, position] as const) : null
					} catch {
						return null
					}
				}),
		)
		if (generation !== overviewLocationLoadGeneration) return
		entries.push(...batchEntries.filter(isHomePlayerPositionEntry))
	}

	overviewMemberPositions.value = Object.fromEntries(entries)
}

const defaultServer = computed(() => {
	const overview = liveOverview.value
	if (!overview) return null
	const sceneServerId = scene.value.players[0]?.serverId

	return (
		overview.servers.find((server) => server.serverId === sceneServerId) ??
		overview.servers.find(
			(server) => server.serverId === overview.defaultServerId,
		) ??
		null
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

const handleWorldPlayerMarkerClick = (
	payload: BlueMapWorldPlayerMarkerClickEventPayload,
): void => {
	const people =
		overviewPhase.value === 'community'
			? overviewCommunityMembers.value
			: overviewPhase.value === 'scene' || overviewPhase.value === 'players'
				? sceneOverviewPlayers.value
				: []
	if (!people.some((person) => person.id === payload.marker.playerId)) return

	overviewDetailPersonId.value = payload.marker.playerId
}

const resolveMapProgress = (storyProgress: number): number => {
	return Math.min(Math.max(storyProgress, 0), 1)
}

const resolvePlayerCarouselProgress = (
	progress: number,
	playerCount: number,
): number => {
	if (playerCount <= 1) return 0

	const totalDwellShare =
		PLAYER_FIRST_FOCUS_DWELL_SHARE +
		PLAYER_FOCUS_DWELL_SHARE * (playerCount - 1)
	const transitionShare = (1 - totalDwellShare) / Math.max(playerCount - 1, 1)
	let cursor = 0

	for (let index = 0; index < playerCount; index++) {
		const dwellShare =
			index === 0 ? PLAYER_FIRST_FOCUS_DWELL_SHARE : PLAYER_FOCUS_DWELL_SHARE
		const dwellEnd = cursor + dwellShare
		if (progress <= dwellEnd || index === playerCount - 1) return index
		cursor = dwellEnd

		const transitionEnd = cursor + transitionShare
		if (progress <= transitionEnd) {
			return index + (progress - cursor) / transitionShare
		}
		cursor = transitionEnd
	}

	return playerCount - 1
}

interface HomeStoryStop {
	id: 'hero' | 'player' | 'community' | 'outro-start' | 'outro-end'
	progress: number
}

const resolveOverviewStoryStops = (): HomeStoryStop[] => {
	const playerCount = sceneOverviewPlayers.value.length
	if (playerCount <= 0) return []

	const focusStart = scenePlayerEntryProgressEnd
	const focusSpan = Math.max(sceneFocusProgressEnd.value - focusStart, 0.01)
	const totalDwellShare =
		PLAYER_FIRST_FOCUS_DWELL_SHARE +
		PLAYER_FOCUS_DWELL_SHARE * (playerCount - 1)
	const transitionShare = (1 - totalDwellShare) / Math.max(playerCount - 1, 1)
	let carouselProgress = 0

	return Array.from({ length: playerCount }, (_, index) => {
		const stop = {
			id: 'player' as const,
			progress: focusStart + carouselProgress * focusSpan,
		}
		const dwellShare =
			index === 0 ? PLAYER_FIRST_FOCUS_DWELL_SHARE : PLAYER_FOCUS_DWELL_SHARE
		carouselProgress += dwellShare
		if (index < playerCount - 1) carouselProgress += transitionShare
		return stop
	})
}

const resolveStoryStops = (): HomeStoryStop[] => {
	const stops: HomeStoryStop[] = [
		{ id: 'hero', progress: 0 },
		{ id: 'hero', progress: heroProgressEnd },
		...resolveOverviewStoryStops(),
		{ id: 'community', progress: sceneCommunityProgressStart.value },
		{ id: 'community', progress: sceneCommunityProgressEnd.value },
		{ id: 'outro-start', progress: outroProgressStart.value },
		{ id: 'outro-end', progress: 1 },
	]

	return stops
		.filter(
			(stop, index, allStops) =>
				Number.isFinite(stop.progress) &&
				allStops.findIndex(
					(candidate) => Math.abs(candidate.progress - stop.progress) < 0.0001,
				) === index,
		)
		.sort((left, right) => left.progress - right.progress)
}

const resolveStorySnapProgress = (progress: number): number => {
	const stops = resolveStoryStops()
	const nearest = stops.reduce((closest, stop) =>
		Math.abs(stop.progress - progress) < Math.abs(closest.progress - progress)
			? stop
			: closest,
	)

	return Math.abs(nearest.progress - progress) <= 0.035
		? nearest.progress
		: progress
}

const syncStoryProgress = (progress: number): void => {
	const normalized = Math.min(Math.max(progress, 0), 1)
	latestStoryProgress = normalized
	heroActive.value = normalized < heroProgressEnd
	outroProgress.value = Math.min(
		Math.max(
			(normalized - outroPresentationStart.value) /
				Math.max(1 - outroPresentationStart.value, 0.01),
			0,
		),
		1,
	)

	if (normalized >= outroPresentationStart.value) {
		overviewPhase.value = 'outro'
	} else if (normalized < heroProgressEnd) {
		overviewPhase.value = 'hidden'
	} else if (normalized < 0.24) {
		overviewPhase.value = 'scene'
	} else if (normalized < sceneCommunityProgressStart.value) {
		overviewPhase.value = 'players'
	} else {
		overviewPhase.value = 'community'
	}
	mapOpacity.value = 1 - Math.min(outroProgress.value * 3.2, 1)
	playerStackEntryProgress.value = Math.min(
		Math.max(
			(normalized - heroProgressEnd) /
				Math.max(scenePlayerEntryProgressEnd - heroProgressEnd, 0.01),
			0,
		),
		1,
	)
	playerStackExitProgress.value = Math.min(
		Math.max(
			(normalized - sceneFocusProgressEnd.value) /
				Math.max(
					sceneCommunityProgressStart.value - sceneFocusProgressEnd.value,
					0.01,
				),
			0,
		),
		1,
	)

	const playerCount = sceneOverviewPlayers.value.length
	if (playerCount > 0) {
		const playerProgress = Math.min(
			Math.max(
				(normalized - heroProgressEnd) /
					Math.max(sceneFocusProgressEnd.value - heroProgressEnd, 0.01),
				0,
			),
			1,
		)
		playerCarouselProgress.value = resolvePlayerCarouselProgress(
			playerProgress,
			playerCount,
		)
		activePlayerIndex.value = Math.round(playerCarouselProgress.value)
		return
	}
	playerCarouselProgress.value = 0
}

onMounted(async () => {
	void refreshScenePlayerLocations()
	void refreshOverviewMemberLocations()

	sceneLocationRefreshTimer = setInterval(() => {
		void refreshScenePlayerLocations()
	}, 20_000)

	stopSceneLocationWatch = watch(
		() => scene.value.id,
		() => {
			scenePlayerPositions.value = {}
			activePlayerIndex.value = 0
			requestAnimationFrame(() => {
				homeMapRef.value?.setScrollProgress(
					resolveMapProgress(latestStoryProgress),
				)
			})
			void refreshScenePlayerLocations()
		},
	)

	watch(selectedSceneIndex, (nextSceneIndex) => {
		if (sceneSwitchTimer) clearTimeout(sceneSwitchTimer)
		if (sceneCountdownResumeTimer) clearTimeout(sceneCountdownResumeTimer)
		if (sceneSwitchWatchdogTimer) clearTimeout(sceneSwitchWatchdogTimer)
		if (nextSceneIndex === activeSceneIndex.value) {
			sceneSwitchTimer = null
			sceneCountdownResumeTimer = null
			sceneSwitchWatchdogTimer = null
			sceneSwitching.value = false
			sceneCountdownPaused.value = false
			return
		}

		sceneSwitching.value = true
		sceneCountdownPaused.value = true
		sceneSwitchTimer = setTimeout(() => {
			activeSceneIndex.value = nextSceneIndex
			void nextTick(() => {
				requestAnimationFrame(() => refreshScrollStory?.())
			})
			sceneSwitchTimer = null
			sceneSwitchWatchdogTimer = setTimeout(
				handleSceneMapSettled,
				SCENE_SWITCH_MAX_WAIT_MS,
			)
		}, SCENE_SWITCH_OUT_DURATION_MS)
	})

	liveOverviewRefreshTimer = setInterval(() => {
		void refreshLiveOverview()
	}, 10_000)

	const [gsapModule, scrollTriggerModule] = await Promise.all([
		import('gsap'),
		import('gsap/ScrollTrigger'),
	])
	const { gsap } = gsapModule
	const { ScrollTrigger } = scrollTriggerModule
	const scrollStory = scrollStoryRef.value
	const firstBackdrop = firstBackdropRef.value
	const firstPanel = firstPanelRef.value
	if (!scrollStory || !firstBackdrop || !firstPanel) return
	const contentExitElements = Array.from(
		firstPanel.querySelectorAll<HTMLElement>('[data-home-exit="content"]'),
	)
	const desktopGalleryElements = Array.from(
		firstPanel.querySelectorAll<HTMLElement>(
			'[data-home-exit="gallery-desktop"]',
		),
	)
	const mobileGalleryElements = Array.from(
		firstPanel.querySelectorAll<HTMLElement>(
			'[data-home-exit="gallery-mobile"]',
		),
	)

	gsap.registerPlugin(ScrollTrigger)
	const context = gsap.context(() => {
		const timelineClock = { progress: 0 }
		const syncMapProgress = (progress: number): void => {
			homeMapRef.value?.setScrollProgress(resolveMapProgress(progress))
			syncStoryProgress(progress)
		}
		const timeline = gsap.timeline({
			scrollTrigger: {
				trigger: scrollStory,
				start: 'top top',
				end: 'bottom bottom',
				scrub: true,
				snap: {
					snapTo: resolveStorySnapProgress,
					directional: true,
					inertia: false,
					delay: 0.12,
					duration: { min: 0.12, max: 0.28 },
					ease: 'power2.out',
				},
				onUpdate: (scrollTrigger) => {
					syncMapProgress(scrollTrigger.progress)
				},
				onRefresh: (scrollTrigger) => {
					syncMapProgress(scrollTrigger.progress)
				},
			},
		})
		timeline
			.to(
				timelineClock,
				{
					progress: 1,
					duration: 1,
					ease: 'none',
				},
				0,
			)
			.to(
				contentExitElements,
				{
					autoAlpha: 0,
					filter: 'blur(14px)',
					y: -28,
					stagger: 0,
					duration: 0.12,
					ease: 'power1.out',
				},
				0.02,
			)
			.to(
				desktopGalleryElements,
				{
					autoAlpha: 0,
					filter: 'blur(12px)',
					x: -40,
					duration: 0.12,
					ease: 'power1.out',
				},
				0.02,
			)
			.to(
				mobileGalleryElements,
				{
					autoAlpha: 0,
					filter: 'blur(12px)',
					y: 32,
					duration: 0.12,
					ease: 'power1.out',
				},
				0.02,
			)
			.to(firstBackdrop, { autoAlpha: 0, duration: 0.12, ease: 'none' }, 0.02)
	}, scrollStory)
	revertScrollStory = () => context.revert()
	refreshScrollStory = () => ScrollTrigger.refresh()
})

onBeforeUnmount(() => {
	clearNuxtState('home-immersive-scene-index')
	clearNuxtState('home-immersive-overview-member-order')
	sceneLocationLoadGeneration++
	overviewLocationLoadGeneration++

	if (sceneLocationRefreshTimer) {
		clearInterval(sceneLocationRefreshTimer)
		sceneLocationRefreshTimer = null
	}
	if (sceneSwitchTimer) {
		clearTimeout(sceneSwitchTimer)
		sceneSwitchTimer = null
	}
	if (sceneCountdownResumeTimer) {
		clearTimeout(sceneCountdownResumeTimer)
		sceneCountdownResumeTimer = null
	}
	if (sceneSwitchWatchdogTimer) {
		clearTimeout(sceneSwitchWatchdogTimer)
		sceneSwitchWatchdogTimer = null
	}
	stopSceneLocationWatch?.()
	stopSceneLocationWatch = null
	revertScrollStory?.()
	revertScrollStory = null
	refreshScrollStory = null

	if (!liveOverviewRefreshTimer) return
	clearInterval(liveOverviewRefreshTimer)
	liveOverviewRefreshTimer = null
})
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

@media (max-height: 700px) {
	.mobile-scene-gallery-frame:nth-child(n + 2) {
		display: none;
	}

	.mobile-scene-gallery-frame {
		aspect-ratio: 1;
	}
}
</style>
