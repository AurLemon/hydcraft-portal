<template>
	<div :lang="locale">
		<div
			ref="scrollStoryRef"
			class="relative w-full bg-[var(--color-surface-0)]"
			:style="{ height: sceneStoryHeightStyle }"
		>
			<section
				class="sticky top-0 isolate h-dvh min-h-160 w-full overflow-hidden bg-[var(--color-surface-0)]"
				:class="overviewDetailPersonId ? 'touch-auto' : 'touch-none'"
			>
				<div
					class="absolute inset-0 transition-[opacity,filter,transform] duration-[625ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
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
						:story-layout="storyLayout"
						:lighting="scene.lighting"
						:water="homeImmersiveWater"
						:focus-positions="scenePlayerFocusPositions"
						:community-focus-position="communityFocusPosition"
						:world-player-markers="worldPlayerMarkers"
						:render-active="mapOpacity > 0"
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
				<div data-home-first-backdrop class="absolute inset-0">
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

				<div class="contents" :class="heroActive ? 'visible' : 'invisible'">
					<HomeHeroPresentation
						:scene="scene"
						:locale="locale"
						:scene-switching="sceneSwitching"
						:server-name="serverName"
						:online-count="onlineCount"
						:max-players="maxPlayers"
						:online="online"
					/>
				</div>

				<div class="pointer-events-none absolute inset-0 z-30">
					<HomeOverviewStory
						:phase="overviewPhase"
						:scene-short-name="sceneShortName"
						:players="sceneOverviewPlayers"
						:active-player-index="activePlayerIndex"
						:player-progress="playerCarouselProgress"
						:player-action-visible="playerActionVisible"
						:player-stack-entry-progress="playerStackEntryProgress"
						:player-stack-exit-progress="playerStackExitProgress"
						:community-members="overviewCommunityMembers"
						:founded-days="foundedDays"
						:member-count="homeImmersiveOverview.stats.memberCount"
						:outro-progress="outroProgress"
						v-model:detail-person-id="overviewDetailPersonId"
						@focus-player="handleOverviewPlayerFocus"
					/>
				</div>

				<div
					class="pointer-events-none absolute inset-0"
					:class="outroProgress > 0.18 ? 'z-40' : 'z-20'"
				>
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
import outroBackground from '~/assets/resources/minecraft-gallery/season_8/owen_screenshots_1.webp'
import outroTerrain from '~/assets/resources/minecraft-gallery/season_8/terrain_advance_screenshots.webp'
import outroSpawn from '~/assets/resources/minecraft-gallery/season_8/spawnpoint_screenshots_1.webp'
import type {
	HomeOverviewPerson,
	HomeOverviewPlayerFocusPayload,
} from '~/components/home/HomeOverviewStory.vue'
import { useHomePlayerLocations } from '~/composables/home/useHomePlayerLocations'
import {
	type HomeStoryMapHandle,
	useHomeStoryProgress,
} from '~/composables/home/useHomeStoryProgress'
import {
	defaultHomeImmersiveScene,
	getHomeImmersiveMapAssetsProxyBaseUrl,
	HOME_IMMERSIVE_DEVELOPER_CONTROLS_ENABLED,
	homeImmersiveOverview,
	homeImmersiveScenes,
	homeImmersiveWater,
	type HomeImmersiveLocalizedText,
	type HomeImmersiveSceneCamera,
} from '~/utils/home/immersive-scenes'
import type {
	HomePortalAccountSummary,
	HomePortalAccountsResponse,
} from '~/utils/home/portal-accounts'
import type {
	BlueMapWorldPlayerMarker,
	BlueMapWorldPlayerMarkerClickEventPayload,
} from '~/utils/map'
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
const homeMapRef = ref<HomeStoryMapHandle | null>(null)
const scenePlayerCount = computed(() => scene.value.players.length)
const {
	scrollStoryRef,
	storyLayout,
	sceneStoryHeightStyle,
	heroActive,
	overviewPhase,
	outroProgress,
	activePlayerIndex,
	playerCarouselProgress,
	playerStackEntryProgress,
	playerStackExitProgress,
	mapOpacity,
	playerActionVisible,
	scrollToPlayerFocus,
	refreshScrollStory,
	reapplyMapProgress,
} = useHomeStoryProgress({ playerCount: scenePlayerCount, homeMapRef })
const { scenePlayerPositions, overviewMemberPositions } =
	useHomePlayerLocations(scene)
const overviewMemberOrder = useState<string[]>(
	'home-immersive-overview-member-order',
	() =>
		homeImmersiveOverview.members
			.map((member) => member.id)
			.sort(() => Math.random() - 0.5),
)
const [liveOverviewRequest, portalAccountsRequest] = await Promise.all([
	useFetch<ServerOverviewLiveResponse>('/api/public/server/overview-live'),
	useFetch<HomePortalAccountsResponse>('/api/public/home-portal-accounts'),
])
const { data: liveOverview, refresh: refreshLiveOverview } = liveOverviewRequest
const { data: homePortalAccounts } = portalAccountsRequest
const sceneSwitching = ref(false)
const sceneCountdownPaused = ref(false)
const overviewDetailPersonId = ref<string | null>(null)
const developerControlsEnabled = HOME_IMMERSIVE_DEVELOPER_CONTROLS_ENABLED
let liveOverviewRefreshTimer: ReturnType<typeof setInterval> | null = null
let sceneSwitchTimer: ReturnType<typeof setTimeout> | null = null
let sceneCountdownResumeTimer: ReturnType<typeof setTimeout> | null = null
let sceneSwitchWatchdogTimer: ReturnType<typeof setTimeout> | null = null

const HERO_TO_PLAYER_DURATION_MS = 1250
const SCENE_SWITCH_OUT_DURATION_MS = HERO_TO_PLAYER_DURATION_MS / 2
const SCENE_SWITCH_IN_DURATION_MS = HERO_TO_PLAYER_DURATION_MS / 2
const SCENE_SWITCH_MAX_WAIT_MS = SCENE_SWITCH_IN_DURATION_MS

const resolveLocalizedText = (text: HomeImmersiveLocalizedText): string =>
	text[locale.value] ?? text['en-US'] ?? Object.values(text)[0] ?? ''
const resolveLocalizedBio = (
	bio: HomeImmersiveLocalizedText | null,
): string | null => (bio ? resolveLocalizedText(bio) : null)
const portalAccountByUsername = computed(
	() =>
		new Map(
			(homePortalAccounts.value?.accounts ?? []).map(
				(account) => [account.username.toLowerCase(), account] as const,
			),
		),
)
const resolvePortalAccount = (
	username: string | undefined,
): HomePortalAccountSummary | null =>
	username
		? (portalAccountByUsername.value.get(username.toLowerCase()) ?? null)
		: null
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
			description: resolveLocalizedBio(player.bio),
			portalAccount: resolvePortalAccount(player.portalUsername),
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
		.map((member) => ({
			id: member.id,
			nickname: member.nickname,
			description: resolveLocalizedBio(member.bio),
			portalAccount: resolvePortalAccount(member.portalUsername),
			avatarUrl: getMinecraftAvatarRendererUrl(member.id),
			isAdministrator:
				member.roles.includes('owner') || member.roles.includes('committee'),
			position: overviewMemberPositions.value[member.id],
		})),
)
const communityFocusPosition = computed(() => {
	if (overviewPhase.value !== 'community' || !overviewDetailPersonId.value) {
		return null
	}

	return (
		overviewCommunityMembers.value.find(
			(member) => member.id === overviewDetailPersonId.value,
		)?.position ?? null
	)
})
const worldPlayerMarkers = computed<BlueMapWorldPlayerMarker[]>(() => {
	const people =
		overviewPhase.value === 'community'
			? overviewCommunityMembers.value
			: overviewPhase.value === 'players'
				? sceneOverviewPlayers.value
				: []
	const markerGroup =
		overviewPhase.value === 'community' ? 'community' : 'scene'
	const focusedScenePlayerId =
		markerGroup === 'scene'
			? sceneOverviewPlayers.value[activePlayerIndex.value]?.id
			: undefined
	const focusedCommunityMemberId =
		markerGroup === 'community' ? overviewDetailPersonId.value : undefined

	return people.flatMap((person) =>
		person.position
			? [
					{
						id: `${markerGroup}-${person.id}`,
						playerId: person.id,
						label: person.id,
						avatarUrl: person.avatarUrl,
						isAdministrator: person.isAdministrator,
						isFocused:
							markerGroup === 'scene'
								? person.id === focusedScenePlayerId
								: person.id === focusedCommunityMemberId
									? true
									: undefined,
						x: person.position.x,
						y: person.position.y,
						z: person.position.z,
					},
				]
			: [],
	)
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

const handleSceneMapSettled = (): void => {
	if (!sceneSwitching.value) return
	if (sceneSwitchWatchdogTimer) clearTimeout(sceneSwitchWatchdogTimer)
	sceneSwitchWatchdogTimer = null
	sceneSwitching.value = false
	if (sceneCountdownResumeTimer) clearTimeout(sceneCountdownResumeTimer)
	sceneCountdownResumeTimer = setTimeout(() => {
		sceneCountdownPaused.value = false
		sceneCountdownResumeTimer = null
	}, SCENE_SWITCH_IN_DURATION_MS)
}

const handleWorldPlayerMarkerClick = (
	payload: BlueMapWorldPlayerMarkerClickEventPayload,
): void => {
	const people =
		overviewPhase.value === 'community'
			? overviewCommunityMembers.value
			: overviewPhase.value === 'players'
				? sceneOverviewPlayers.value
				: []
	if (!people.some((person) => person.id === payload.marker.playerId)) return
	overviewDetailPersonId.value = payload.marker.playerId
}

const handleOverviewPlayerFocus = (
	payload: HomeOverviewPlayerFocusPayload,
): void => {
	const player = sceneOverviewPlayers.value[payload.playerIndex]
	if (!player || player.id !== payload.playerId) return

	scrollToPlayerFocus(payload.playerIndex)
}

watch(
	() => scene.value.id,
	() => {
		activePlayerIndex.value = 0
		requestAnimationFrame(reapplyMapProgress)
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
		void nextTick(() => requestAnimationFrame(refreshScrollStory))
		sceneSwitchTimer = null
		sceneSwitchWatchdogTimer = setTimeout(
			handleSceneMapSettled,
			SCENE_SWITCH_MAX_WAIT_MS,
		)
	}, SCENE_SWITCH_OUT_DURATION_MS)
})

onMounted(() => {
	liveOverviewRefreshTimer = setInterval(
		() => void refreshLiveOverview(),
		10_000,
	)
})

onBeforeUnmount(() => {
	clearNuxtState('home-immersive-scene-index')
	clearNuxtState('home-immersive-overview-member-order')
	if (liveOverviewRefreshTimer) clearInterval(liveOverviewRefreshTimer)
	if (sceneSwitchTimer) clearTimeout(sceneSwitchTimer)
	if (sceneCountdownResumeTimer) clearTimeout(sceneCountdownResumeTimer)
	if (sceneSwitchWatchdogTimer) clearTimeout(sceneSwitchWatchdogTimer)
	liveOverviewRefreshTimer = null
	sceneSwitchTimer = null
	sceneCountdownResumeTimer = null
	sceneSwitchWatchdogTimer = null
})
</script>
