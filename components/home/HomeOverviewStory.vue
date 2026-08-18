<template>
	<div
		class="pointer-events-none absolute inset-0 z-30 text-white"
		:style="{ opacity: overviewOpacity }"
	>
		<div class="immersive-site-shell absolute inset-0">
			<div class="relative h-full">
				<div
					class="absolute top-28 left-0 max-w-[min(42rem,calc(100vw-3rem))] font-serif [text-shadow:0_2px_14px_rgba(2,6,23,0.88)] lg:top-36"
					:class="isEnglish ? 'font-semibold' : 'font-extrabold'"
					:style="sceneLabelStyle"
					:aria-hidden="sceneLabelOpacity <= 0.01"
				>
					<p class="mt-4 text-4xl uppercase leading-tight sm:text-7xl">
						{{ sceneShortName }}
					</p>
					<p class="mt-1 text-lg uppercase sm:text-7xl">
						{{ t('home.immersive.overview.responsibleBy') }}
					</p>
				</div>
				<div
					class="absolute top-28 left-0 max-w-[min(48rem,calc(100vw-3rem))] font-serif [text-shadow:0_2px_14px_rgba(2,6,23,0.88)] lg:top-36"
					:class="isEnglish ? 'font-semibold' : 'font-extrabold'"
					:style="communityLabelStyle"
					:aria-hidden="communityLabelOpacity <= 0.01"
				>
					<p class="mt-4 text-4xl uppercase leading-tight sm:text-7xl">
						{{
							t('home.immersive.overview.beyondScene', {
								name: sceneShortName,
							})
						}}
					</p>
					<p class="mt-1 text-lg uppercase sm:text-7xl">
						{{ t('home.immersive.overview.communityHasThem') }}
					</p>
				</div>

				<Transition name="overview-panel">
					<div
						v-if="phase === 'community'"
						class="absolute bottom-8 left-0 font-medium [text-shadow:0_2px_14px_rgba(2,6,23,0.88)] lg:bottom-12"
					>
						<p class="text-sm font-medium text-white/70 sm:text-base">
							{{ t('home.immersive.overview.establishedFor') }}
							<HomeStatFlipNumber
								:value="foundedDays"
								class="mx-1 text-3xl font-medium text-white drop-shadow-[0_2px_8px_rgba(2,6,23,0.88)] sm:text-4xl"
							/>
							{{ t('home.immersive.overview.days') }}
						</p>
						<p class="mt-1 text-sm font-medium text-white/70 sm:text-base">
							{{ t('home.immersive.overview.memberCountPrefix') }}
							<HomeStatFlipNumber
								:value="memberCount"
								class="mx-1 text-3xl font-medium text-white drop-shadow-[0_2px_8px_rgba(2,6,23,0.88)] sm:text-4xl"
							/>
							{{ t('home.immersive.overview.people') }}
						</p>
					</div>
				</Transition>
			</div>
		</div>

		<section
			v-if="(phase === 'scene' || phase === 'players') && players.length"
			class="home-overview-player-rail absolute inset-x-0 bottom-8 flex h-68 items-end justify-center sm:bottom-10 lg:bottom-12"
			:aria-label="t('home.immersive.overview.scenePlayers')"
		>
			<article
				v-for="(player, index) in players"
				:key="player.id"
				role="button"
				class="home-overview-player-card pointer-events-auto group absolute bottom-0 flex h-60 w-[min(34rem,calc(100vw-3rem))] cursor-pointer overflow-hidden rounded-lg border border-white/18 bg-slate-950 transition-[background-color,border-color,box-shadow] duration-200 ease-out will-change-[opacity,transform,filter] hover:border-white/32 hover:bg-slate-900 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 active:border-white/40"
				:style="playerCardStyle(index)"
				:tabindex="playerCardIsInteractive(index) ? 0 : -1"
				:aria-hidden="playerCardIsInteractive(index) ? undefined : 'true'"
				@click="selectPlayer(player, index)"
				@keydown.enter.prevent="selectPlayer(player, index)"
				@keydown.space.prevent="selectPlayer(player, index)"
			>
				<span
					class="pointer-events-none absolute inset-0 z-20 bg-white/0 transition-colors duration-100 group-active:bg-white/8"
					aria-hidden="true"
				/>
				<div
					class="home-overview-player-avatar opacity-65 relative hidden w-48 shrink-0 overflow-hidden bg-slate-900/60 sm:block"
				>
					<SkeletonImage
						:src="player.avatarUrl"
						:alt="player.id"
						class="h-full w-full"
						image-class="h-full w-full scale-110 object-cover grayscale-[5%] [image-rendering:pixelated]"
						skeleton-class="rounded-none"
					/>
				</div>
				<div
					class="home-overview-player-content relative z-10 flex min-w-0 flex-1 flex-col p-5 sm:-ml-12 sm:p-6"
				>
					<div class="flex min-w-0 items-center gap-3 sm:hidden">
						<SkeletonImage
							:src="player.avatarUrl"
							:alt="player.id"
							class="size-12 shrink-0"
							image-class="size-12 rounded-md object-cover [image-rendering:pixelated]"
						/>
						<div class="min-w-0">
							<p class="truncate font-arkpixel text-xl leading-none">
								{{ player.nickname }}
							</p>
							<p class="truncate text-xs text-white/60">{{ player.id }}</p>
						</div>
					</div>
					<div class="hidden min-w-0 sm:block">
						<p class="truncate font-arkpixel text-2xl leading-none">
							{{ player.nickname }}
						</p>
						<p class="mt-1 truncate text-sm text-white/60">{{ player.id }}</p>
					</div>
					<p
						v-if="player.description"
						class="home-overview-player-description mt-4 line-clamp-3 font-serif text-lg leading-7 text-white"
					>
						{{ player.description }}
					</p>
					<Transition name="player-action" mode="out-in">
						<span
							v-if="playerActionVisible && index === activePlayerIndex"
							:key="`player-action-${activePlayerIndex}`"
							class="mt-auto inline-flex w-fit items-center gap-1.5 text-sm font-medium text-white/78 transition-colors group-hover:text-white"
						>
							{{ t('home.immersive.overview.viewFullIntroduction') }}
							<UIcon name="i-lucide-arrow-right" class="size-4" />
						</span>
					</Transition>
				</div>
			</article>
		</section>

		<Transition name="community-rail">
			<aside
				v-if="phase === 'community' && communityMembers.length && !detail"
				class="community-member-rail !pointer-events-auto absolute right-0 bottom-36 z-20 w-full sm:bottom-24 lg:top-24 lg:bottom-20 lg:w-[min(28rem,32vw)]"
				:data-hovered="communityRailHovered"
				:aria-label="t('home.immersive.overview.communityMembers')"
				@pointerenter="communityRailHovered = true"
				@pointerleave="communityRailHovered = false"
			>
				<div class="grid gap-2 lg:hidden">
					<UMarquee
						v-for="(row, rowIndex) in communityMemberRows"
						:key="`mobile-community-row-${rowIndex}`"
						class="pointer-events-auto"
						orientation="horizontal"
						:reverse="rowIndex === 1"
						pause-on-hover
						:repeat="2"
						:overlay="false"
						:ui="{
							root: 'pointer-events-auto h-14 min-w-0 [--gap:--spacing(2)] [--duration:120s]',
							content: 'pointer-events-auto !w-auto !min-w-0',
						}"
					>
						<button
							v-for="(member, index) in row"
							:key="`${member.id}-${index}`"
							type="button"
							class="community-member-card pointer-events-auto group flex h-14 w-64 shrink-0 items-center gap-3 rounded-lg border border-white/14 bg-slate-950/76 px-3 py-2 text-left text-white backdrop-blur-xl transition-colors hover:bg-slate-900/88 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
							:style="{ animationDelay: `${index * 55}ms` }"
							@click="openCommunityDetail(member)"
						>
							<SkeletonImage
								:src="member.avatarUrl"
								:alt="member.nickname"
								class="size-9 shrink-0 rounded-md border-2"
								:class="
									member.isAdministrator
										? 'border-amber-300 bg-amber-300/16'
										: 'border-transparent'
								"
								image-class="size-full rounded-md object-cover [image-rendering:pixelated]"
							/>
							<span class="min-w-0">
								<span
									class="block truncate font-arkpixel text-base leading-tight"
								>
									{{ member.nickname }}
								</span>
								<span
									v-if="member.description"
									class="mt-0.5 block truncate text-xs leading-4 text-white/62"
								>
									{{ member.description }}
								</span>
							</span>
						</button>
					</UMarquee>
				</div>

				<UMarquee
					class="pointer-events-auto hidden h-full lg:block"
					orientation="vertical"
					reverse
					pause-on-hover
					:repeat="2"
					:overlay="false"
					:ui="{
						root: 'pointer-events-auto h-full min-w-0 !gap-0 [--gap:0px] [--duration:150s]',
						content:
							'pointer-events-auto !h-fit !w-full !min-w-0 !justify-start !gap-3 !pb-3',
					}"
				>
					<button
						v-for="(member, index) in communityMembers"
						:key="`${member.id}-${index}`"
						type="button"
						class="community-member-card pointer-events-auto group ml-3 box-border flex min-w-0 max-w-[calc(100%_-_0.75rem)] w-[calc(100%_-_0.75rem)] items-center gap-3 rounded-lg border border-white/14 bg-slate-950/76 px-4 py-3 text-left text-white backdrop-blur-xl transition-colors hover:bg-slate-900/88 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 lg:rounded-r-none lg:border-r-0 lg:pl-5"
						:style="{ animationDelay: `${index * 55}ms` }"
						@click="openCommunityDetail(member)"
					>
						<SkeletonImage
							:src="member.avatarUrl"
							:alt="member.nickname"
							class="size-10 shrink-0 rounded-md border-2 sm:size-11"
							:class="
								member.isAdministrator
									? 'border-amber-300 bg-amber-300/16'
									: 'border-transparent'
							"
							image-class="size-full rounded-md object-cover [image-rendering:pixelated]"
						/>
						<span class="min-w-0">
							<span class="block truncate font-arkpixel text-lg leading-tight">
								{{ member.nickname }}
							</span>
							<span
								v-if="member.description"
								class="mt-1 block truncate text-xs leading-5 text-white/62"
							>
								{{ member.description }}
							</span>
						</span>
					</button>
				</UMarquee>
			</aside>
		</Transition>

		<button
			v-if="detail"
			type="button"
			class="pointer-events-auto absolute inset-0 z-40 lg:hidden"
			:aria-label="t('home.immersive.overview.back')"
			@click="closeDetail"
		/>

		<Transition name="detail-panel">
			<aside
				v-if="detail"
				class="pointer-events-auto absolute right-0 bottom-0 z-50 h-[min(34rem,64dvh)] max-h-[64dvh] w-full overflow-hidden border-t border-white/16 bg-slate-950/94 backdrop-blur-2xl lg:top-0 lg:h-auto lg:max-h-none lg:w-[min(30rem,78vw)] lg:border-t-0 lg:border-l"
			>
				<div
					ref="detailScrollRef"
					class="detail-scroll h-full overflow-y-auto overscroll-contain"
					data-home-detail-scroll
					@scroll.passive="handleDetailScroll"
				>
					<div
						ref="detailScrollContentRef"
						class="flex min-h-full flex-col p-5 sm:p-8 lg:p-10 lg:pt-36"
					>
						<button
							type="button"
							class="inline-flex w-fit items-center gap-1.5 py-1 text-sm font-medium text-white/72 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300"
							@click="closeDetail"
						>
							<UIcon name="i-lucide-chevrons-right" class="size-4" />
							<span class="leading-[normal]">{{
								t('home.immersive.overview.collapse')
							}}</span>
						</button>
						<div class="mt-8 flex items-center gap-4">
							<div class="grid size-20 shrink-0">
								<Transition name="detail-avatar">
									<SkeletonImage
										:key="detail.id"
										:src="detail.avatarUrl"
										:alt="detail.id"
										class="col-start-1 row-start-1 size-20"
										image-class="size-20 rounded-lg object-cover [image-rendering:pixelated]"
									/>
								</Transition>
							</div>
							<div class="grid min-w-0 flex-1">
								<Transition name="detail-identity">
									<div
										:key="detail.id"
										class="col-start-1 row-start-1 min-w-0 self-center"
									>
										<h2 class="truncate font-arkpixel text-3xl leading-none">
											{{ detail.nickname }}
										</h2>
										<p class="mt-1 truncate text-sm text-white/60">
											{{ detail.id }}
										</p>
									</div>
								</Transition>
							</div>
						</div>
						<div class="mt-8 flex flex-1 flex-col">
							<Transition name="detail-biography" mode="out-in">
								<div :key="`${detail.id}-${locale}`" class="overflow-hidden">
									<div
										class="detail-biography-content font-serif text-lg leading-8"
										:class="
											detailHasDescription
												? 'text-white'
												: 'flex flex-1 items-center justify-center text-center text-white/45'
										"
									>
										<p
											v-for="(paragraph, index) in detailParagraphs"
											:key="`${detail.id}-paragraph-${index}`"
											:lang="detailParagraphLang"
											:class="detailParagraphClass"
										>
											{{ paragraph }}
										</p>
									</div>
								</div>
							</Transition>
							<div class="mt-auto">
								<Transition name="detail-account" mode="out-in">
									<div
										v-if="detail.portalAccount"
										:key="`${detail.id}-${detail.portalAccount.username}`"
										class="overflow-hidden"
									>
										<div
											class="flex flex-wrap items-center gap-1 pt-8 text-sm text-white/72"
										>
											<UIcon
												name="i-lucide-corner-down-right"
												class="size-4 shrink-0 text-white/56"
											/>
											<span>{{
												t('home.immersive.overview.portalProfile')
											}}</span>
											<NuxtLink
												:to="localePath(`/u/${detail.portalAccount.username}`)"
												class="pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-1 py-0.5 font-medium text-white/88 transition-colors hover:bg-white/10 hover:text-white"
											>
												<UAvatar
													:src="detail.portalAccount.avatarUrl || undefined"
													:alt="detail.portalAccount.username"
													size="xs"
													:text="
														detail.portalAccount.username
															.slice(0, 1)
															.toUpperCase()
													"
												/>
												<span>@{{ detail.portalAccount.username }}</span>
												<UIcon
													name="i-lucide-arrow-up-right"
													class="size-3.5"
												/>
											</NuxtLink>
										</div>
									</div>
								</Transition>
							</div>
						</div>
					</div>
				</div>
				<Transition name="detail-scroll-hint">
					<div
						v-if="detailScrollState.canScroll && !detailScrollState.isAtEnd"
						class="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-20 items-end justify-center bg-linear-to-t from-slate-950 via-slate-950/88 to-transparent pb-3"
						aria-hidden="true"
					>
						<UIcon
							name="i-lucide-chevrons-down"
							class="mb-1 size-5 text-white/72 drop-shadow-md"
						/>
					</div>
				</Transition>
			</aside>
		</Transition>
	</div>
</template>

<script setup lang="ts">
import type { HomeImmersiveMapPosition } from '~/utils/home/immersive-scenes'
import type { HomePortalAccountSummary } from '~/utils/home/portal-accounts'

export type HomeOverviewPhase =
	| 'hidden'
	| 'scene'
	| 'players'
	| 'community'
	| 'outro'

export interface HomeOverviewPerson {
	id: string
	nickname: string
	description: string | null
	portalAccount: HomePortalAccountSummary | null
	avatarUrl: string
	isAdministrator: boolean
	position?: HomeImmersiveMapPosition
}

export interface HomeOverviewPlayerFocusPayload {
	playerIndex: number
	playerId: string
}

interface HomeOverviewStoryProps {
	phase: HomeOverviewPhase
	sceneShortName: string
	players: readonly HomeOverviewPerson[]
	activePlayerIndex: number
	playerProgress: number
	playerActionVisible: boolean
	playerStackEntryProgress: number
	playerStackExitProgress: number
	communityMembers: readonly HomeOverviewPerson[]
	foundedDays: number
	memberCount: number
	outroProgress: number
	detailPersonId: string | null
}

interface DetailScrollState {
	canScroll: boolean
	isAtEnd: boolean
}

const props = defineProps<HomeOverviewStoryProps>()
const emit = defineEmits<{
	'update:detailPersonId': [personId: string | null]
	'focus-player': [payload: HomeOverviewPlayerFocusPayload]
}>()
const { locale, t } = useI18n()
const localePath = useLocalePath()
const isEnglish = computed(() => locale.value.startsWith('en'))
const communityRailHovered = ref(false)
const overviewOpacity = computed(
	() => 1 - smoothStep(0.02, 0.42, props.outroProgress),
)
const detailScrollRef = ref<HTMLDivElement | null>(null)
const detailScrollContentRef = ref<HTMLDivElement | null>(null)
const detailScrollState = reactive<DetailScrollState>({
	canScroll: false,
	isAtEnd: true,
})
let detailResizeObserver: ResizeObserver | null = null
const detail = computed(() => {
	if (!props.detailPersonId) return null
	const people =
		props.phase === 'community' ? props.communityMembers : props.players

	return people.find((person) => person.id === props.detailPersonId) ?? null
})
const detailParagraphs = computed(() => {
	const description = detail.value?.description
	if (!description) return [t('home.immersive.overview.noBiography')]

	return description
		.split(/\r?\n\s*\r?\n/)
		.map((paragraph) => paragraph.trim())
		.filter(Boolean)
})
const detailHasDescription = computed(() => Boolean(detail.value?.description))
const detailParagraphLang = computed(() => {
	if (locale.value.startsWith('en')) return 'en'
	if (locale.value.startsWith('ja')) return 'ja'
	if (locale.value.startsWith('zh-TW')) return 'zh-Hant'
	return 'zh-Hans'
})
const detailParagraphClass = computed(() => {
	const baseClass =
		'my-2 w-full text-pretty text-justify first:mt-0 last:mb-0 [text-align-last:left]'
	return detailParagraphLang.value === 'en'
		? `${baseClass} break-words hyphens-auto [text-justify:inter-word]`
		: `${baseClass} break-normal [line-break:loose] [text-justify:inter-character]`
})
const communityMemberRows = computed(() => [
	props.communityMembers.filter((_, index) => index % 2 === 0),
	props.communityMembers.filter((_, index) => index % 2 === 1),
])

const smoothStep = (start: number, end: number, value: number): number => {
	const progress = Math.min(Math.max((value - start) / (end - start), 0), 1)
	return progress * progress * (3 - 2 * progress)
}

const sceneLabelOpacity = computed(() => {
	const entry = smoothStep(0.12, 0.48, props.playerStackEntryProgress)
	const exit = 1 - smoothStep(0.06, 0.42, props.playerStackExitProgress)
	return entry * exit
})
const communityLabelOpacity = computed(() =>
	smoothStep(0.08, 0.44, props.playerStackExitProgress),
)
const labelStyle = (opacity: number) => ({
	opacity,
	filter: `blur(${(1 - opacity) * 8}px)`,
	transform: `translate3d(0, ${(1 - opacity) * -16}px, 0)`,
})
const sceneLabelStyle = computed(() => labelStyle(sceneLabelOpacity.value))
const communityLabelStyle = computed(() =>
	labelStyle(communityLabelOpacity.value),
)

const playerCardStyle = (index: number) => {
	const offset = index - props.playerProgress
	const distance = Math.abs(offset)
	const translate = Math.max(-78, Math.min(78, offset * 52))
	const scale = Math.max(0.9, 1 - Math.min(distance, 1) * 0.06)
	const adjacentVisibility = 1 - smoothStep(0.45, 1.35, distance)
	const sideFocusProgress = smoothStep(0.2, 1.15, distance)
	const sideAttenuation = 1 - sideFocusProgress * 0.32
	const entryVisibility =
		index === 0
			? smoothStep(0, 1, props.playerStackEntryProgress)
			: smoothStep(0.15, 1, props.playerStackEntryProgress)
	const exitVisibility =
		index === props.players.length - 1
			? 1 - smoothStep(0.35, 1, props.playerStackExitProgress)
			: 1 - smoothStep(0, 0.7, props.playerStackExitProgress)
	const opacity =
		(1 - Math.min(distance, 1) * 0.18) *
		adjacentVisibility *
		sideAttenuation *
		entryVisibility *
		exitVisibility
	const disappearanceProgress =
		1 - adjacentVisibility * entryVisibility * exitVisibility
	const blurAmount = Math.max(
		smoothStep(0.65, 1, disappearanceProgress) * 6,
		sideFocusProgress * 2.25,
	)
	const verticalOffset = disappearanceProgress * 28

	return {
		opacity,
		transform: `translate3d(${translate}%, ${verticalOffset}px, 0) scale(${scale})`,
		filter: `blur(${blurAmount}px)`,
		zIndex: Math.round(10 + (1 - Math.min(distance, 1)) * 20),
		pointerEvents: playerCardIsInteractive(index)
			? ('auto' as const)
			: ('none' as const),
	}
}

const playerCardIsInteractive = (index: number): boolean =>
	Math.abs(index - props.playerProgress) < 1.35

const openPlayerDetail = (player: HomeOverviewPerson): void => {
	emit('update:detailPersonId', player.id)
}

const selectPlayer = (
	player: HomeOverviewPerson,
	playerIndex: number,
): void => {
	emit('focus-player', { playerIndex, playerId: player.id })
	openPlayerDetail(player)
}

const openCommunityDetail = (member: HomeOverviewPerson): void => {
	emit('update:detailPersonId', member.id)
}

const closeDetail = (): void => {
	emit('update:detailPersonId', null)
}

const updateDetailScrollState = (): void => {
	const scrollElement = detailScrollRef.value
	if (!scrollElement) {
		detailScrollState.canScroll = false
		detailScrollState.isAtEnd = true
		return
	}

	const remainingScroll =
		scrollElement.scrollHeight -
		scrollElement.clientHeight -
		scrollElement.scrollTop
	detailScrollState.canScroll =
		scrollElement.scrollHeight - scrollElement.clientHeight > 2
	detailScrollState.isAtEnd = remainingScroll <= 2
}

const observeDetailScrollSize = (): void => {
	detailResizeObserver?.disconnect()
	if (!detailResizeObserver) return
	if (detailScrollRef.value) detailResizeObserver.observe(detailScrollRef.value)
	if (detailScrollContentRef.value) {
		detailResizeObserver.observe(detailScrollContentRef.value)
	}
}

const handleDetailScroll = (): void => {
	updateDetailScrollState()
}

watch(
	() => props.phase,
	() => {
		if (props.detailPersonId) closeDetail()
	},
)

watch(
	() => props.detailPersonId,
	async (personId) => {
		await nextTick()
		if (personId && detailScrollRef.value) detailScrollRef.value.scrollTop = 0
		observeDetailScrollSize()
		updateDetailScrollState()
	},
)

watch(locale, async () => {
	await nextTick()
	observeDetailScrollSize()
	updateDetailScrollState()
})

onMounted(() => {
	detailResizeObserver = new ResizeObserver(updateDetailScrollState)
	observeDetailScrollSize()
	updateDetailScrollState()
})

onBeforeUnmount(() => {
	detailResizeObserver?.disconnect()
	detailResizeObserver = null
})
</script>

<style scoped>
.overview-panel-enter-active,
.overview-panel-leave-active,
.detail-panel-enter-active,
.detail-panel-leave-active,
.community-rail-enter-active,
.community-rail-leave-active {
	transition:
		opacity 220ms ease,
		transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
		filter 360ms ease;
}

.overview-panel-enter-from,
.overview-panel-leave-to {
	opacity: 0;
	filter: blur(10px);
	transform: translateY(1.5rem);
}

.detail-panel-enter-from,
.detail-panel-leave-to {
	opacity: 0;
	filter: blur(6px);
	transform: translateX(3rem);
}

.community-rail-enter-from,
.community-rail-leave-to {
	filter: blur(10px);
	transform: translateX(3rem);
}

.community-rail-leave-to {
	opacity: 0;
}

.player-action-enter-active,
.player-action-leave-active {
	transition:
		opacity 220ms ease,
		transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
		filter 260ms ease;
}

.player-action-enter-from,
.player-action-leave-to {
	opacity: 0;
	filter: blur(5px);
	transform: translateY(0.4rem);
}

.home-overview-player-avatar {
	mask-image: linear-gradient(
		to right,
		rgba(0, 0, 0, 1) 0%,
		rgba(0, 0, 0, 0.98) 10%,
		rgba(0, 0, 0, 0.93) 20%,
		rgba(0, 0, 0, 0.85) 30%,
		rgba(0, 0, 0, 0.75) 40%,
		rgba(0, 0, 0, 0.63) 50%,
		rgba(0, 0, 0, 0.49) 60%,
		rgba(0, 0, 0, 0.35) 70%,
		rgba(0, 0, 0, 0.22) 80%,
		rgba(0, 0, 0, 0.1) 90%,
		transparent 100%
	);

	-webkit-mask-image: linear-gradient(
		to right,
		rgba(0, 0, 0, 1) 0%,
		rgba(0, 0, 0, 0.98) 10%,
		rgba(0, 0, 0, 0.93) 20%,
		rgba(0, 0, 0, 0.85) 30%,
		rgba(0, 0, 0, 0.75) 40%,
		rgba(0, 0, 0, 0.63) 50%,
		rgba(0, 0, 0, 0.49) 60%,
		rgba(0, 0, 0, 0.35) 70%,
		rgba(0, 0, 0, 0.22) 80%,
		rgba(0, 0, 0, 0.1) 90%,
		transparent 100%
	);
}

.community-member-rail {
	-webkit-mask-image: linear-gradient(
		to bottom,
		transparent 0%,
		black 14%,
		black 86%,
		transparent 100%
	);
	mask-image: linear-gradient(
		to bottom,
		transparent 0%,
		black 14%,
		black 86%,
		transparent 100%
	);
}

.community-member-rail[data-hovered='true'] :deep([data-slot='content']) {
	animation-play-state: paused !important;
}

@media (min-width: 1024px) and (max-height: 850px) {
	.home-overview-player-rail {
		height: 13.5rem;
	}

	.home-overview-player-card {
		height: 12rem;
	}

	.home-overview-player-content {
		padding: 1rem 1.25rem;
	}

	.home-overview-player-description {
		margin-top: 0.5rem;
		overflow: hidden;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 1;
		font-size: 1rem;
		line-height: 1.5;
	}
}

.community-member-rail :deep([data-slot='root']),
.community-member-rail :deep([data-slot='content']),
.community-member-rail :deep(.community-member-card) {
	pointer-events: auto !important;
}

.detail-scroll {
	-ms-overflow-style: none;
	scrollbar-width: none;
}

.detail-scroll::-webkit-scrollbar {
	display: none;
}

.detail-avatar-enter-active,
.detail-avatar-leave-active {
	transition:
		opacity 240ms ease,
		filter 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

.detail-avatar-enter-active {
	z-index: 1;
}

.detail-avatar-enter-from {
	filter: blur(6px);
	opacity: 0;
}

.detail-avatar-leave-to {
	filter: blur(5px);
	opacity: 0;
}

.detail-identity-enter-active,
.detail-identity-leave-active {
	transition:
		opacity 240ms ease,
		filter 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

.detail-identity-enter-active {
	z-index: 1;
}

.detail-identity-enter-from {
	filter: blur(6px);
	opacity: 0;
}

.detail-identity-leave-to {
	filter: blur(5px);
	opacity: 0;
}

.detail-biography-enter-active,
.detail-biography-leave-active,
.detail-account-enter-active,
.detail-account-leave-active {
	display: grid;
	overflow: hidden;
	transition: grid-template-rows 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

.detail-biography-enter-active > *,
.detail-biography-leave-active > *,
.detail-account-enter-active > *,
.detail-account-leave-active > * {
	min-height: 0;
}

.detail-biography-enter-from,
.detail-biography-leave-to,
.detail-account-enter-from,
.detail-account-leave-to {
	grid-template-rows: 0fr;
}

.detail-biography-enter-to,
.detail-biography-leave-from,
.detail-account-enter-to,
.detail-account-leave-from {
	grid-template-rows: 1fr;
}

.detail-biography-enter-active .detail-biography-content {
	animation: detail-biography-reveal 460ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes detail-biography-reveal {
	from {
		clip-path: inset(0 0 100% 0);
		filter: blur(7px);
		opacity: 0;
	}

	to {
		clip-path: inset(0 0 0 0);
		filter: blur(0);
		opacity: 1;
	}
}

.detail-scroll-hint-enter-active,
.detail-scroll-hint-leave-active {
	transition:
		opacity 180ms ease,
		transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.detail-scroll-hint-enter-from,
.detail-scroll-hint-leave-to {
	opacity: 0;
	transform: translateY(0.5rem);
}

@media (max-width: 1023px) {
	.detail-panel-enter-from,
	.detail-panel-leave-to {
		transform: translateY(100%);
	}

	.community-member-rail {
		-webkit-mask-image: linear-gradient(
			to right,
			transparent 0%,
			black 8%,
			black 92%,
			transparent 100%
		);
		mask-image: linear-gradient(
			to right,
			transparent 0%,
			black 8%,
			black 92%,
			transparent 100%
		);
	}
}

.community-member-card {
	animation: community-member-card-in 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.community-rail-leave-active .community-member-card {
	animation: none;
}

@keyframes community-member-card-in {
	from {
		filter: blur(10px);
		transform: translateX(2rem);
	}

	to {
		filter: blur(0);
		transform: translateX(0);
	}
}

@media (prefers-reduced-motion: reduce) {
	.overview-panel-enter-active,
	.overview-panel-leave-active,
	.detail-panel-enter-active,
	.detail-panel-leave-active,
	.community-rail-enter-active,
	.community-rail-leave-active,
	.player-action-enter-active,
	.player-action-leave-active,
	.detail-avatar-enter-active,
	.detail-avatar-leave-active,
	.detail-identity-enter-active,
	.detail-identity-leave-active,
	.detail-biography-enter-active,
	.detail-biography-leave-active,
	.detail-account-enter-active,
	.detail-account-leave-active,
	.detail-scroll-hint-enter-active,
	.detail-scroll-hint-leave-active,
	.community-member-card,
	article {
		transition: none;
	}

	.community-member-card {
		animation: none;
	}

	.detail-biography-enter-active .detail-biography-content {
		animation: none;
	}
}
</style>
