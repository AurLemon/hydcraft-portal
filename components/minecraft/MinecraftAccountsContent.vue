<template>
	<div>
		<section
			v-if="selectedAccount"
			class="relative isolate min-h-160 w-full overflow-hidden rounded-3xl shadow-sm bg-slate-900"
		>
			<div class="absolute inset-0">
				<MinecraftPresenceMap
					:account="selectedAccount"
					:selected-uuid="selectedUuid"
					@pointermove="handleMapPointerMove"
					@pointerleave="handleMapPointerLeave"
				/>
			</div>

			<div
				class="absolute left-3 top-3 z-999 flex flex-col items-end gap-2 sm:flex-row"
			>
				<div class="flex flex-col items-start gap-2">
					<UBadge
						class="gap-1.5"
						:color="isOnline ? 'success' : 'neutral'"
						variant="solid"
					>
						<span
							class="block size-2 rounded-full"
							:class="isOnline ? 'bg-emerald-400' : 'bg-slate-400'"
						/>

						{{
							isOnline
								? t('minecraftAccounts.identity.online')
								: t('minecraftAccounts.identity.offline')
						}}
					</UBadge>
					<UBadge v-if="selectedAccount.isPrimary" color="primary">
						{{ t('minecraftAccounts.badges.primary') }}
					</UBadge>
				</div>
			</div>

			<div class="absolute right-3 top-3 z-999 flex flex-col items-end gap-2">
				<USelect
					v-if="uuidItems.length > 1"
					v-model="selectedUuidModel"
					:items="uuidItems"
					value-key="value"
					label-key="label"
					size="sm"
					class="w-56"
				/>
			</div>

			<div
				class="pointer-events-none absolute inset-x-0 top-16 z-999 flex justify-center px-18 sm:top-3 sm:px-24"
			>
				<Transition name="hover-coords" mode="out-in">
					<div
						v-if="hoverCoordsVisible && hoveredBlockPoint"
						key="hover-coords"
						class="pointer-events-none inline-flex max-w-full items-center gap-1.5 text-sm text-white"
						style="text-shadow: rgba(0, 0, 0, 0.7) 0px 0px 5px"
						aria-live="polite"
					>
						<div class="flex items-center gap-1 whitespace-nowrap">
							<span
								class="text-[11px] font-medium tracking-[0.24em] text-white/55 translate-y-0.5"
							>
								X
							</span>
							<span class="hover-coords-text" :aria-label="hoverXText">
								<span class="hover-coords-text__inner">
									<template
										v-for="(character, index) in hoverXCharacters"
										:key="`hover-x-${hoverXCharacters.length}-${index}`"
									>
										<span
											v-if="isDigitCharacter(character)"
											class="digit-flip"
											aria-hidden="true"
										>
											<span
												class="digit-flip__reel transition-transform duration-150 ease-out"
												:style="{
													transform: `translate3d(0, -${Number(character) * digitStepEm}em, 0)`,
												}"
											>
												<span
													v-for="digitCharacter in digitCharacters"
													:key="`hover-x-${index}-${digitCharacter}`"
													class="digit-flip__digit"
												>
													{{ digitCharacter }}
												</span>
											</span>
										</span>
										<span
											v-else
											class="hover-coords-text__char"
											aria-hidden="true"
										>
											{{ character }}
										</span>
									</template>
								</span>
							</span>
						</div>

						<div class="flex items-center gap-1 whitespace-nowrap">
							<span
								class="text-[11px] font-medium tracking-[0.24em] text-white/55 translate-y-0.5"
							>
								Z
							</span>
							<span class="hover-coords-text" :aria-label="hoverZText">
								<span class="hover-coords-text__inner">
									<template
										v-for="(character, index) in hoverZCharacters"
										:key="`hover-z-${hoverZCharacters.length}-${index}`"
									>
										<span
											v-if="isDigitCharacter(character)"
											class="digit-flip"
											aria-hidden="true"
										>
											<span
												class="digit-flip__reel transition-transform duration-150 ease-out"
												:style="{
													transform: `translate3d(0, -${Number(character) * digitStepEm}em, 0)`,
												}"
											>
												<span
													v-for="digitCharacter in digitCharacters"
													:key="`hover-z-${index}-${digitCharacter}`"
													class="digit-flip__digit"
												>
													{{ digitCharacter }}
												</span>
											</span>
										</span>
										<span
											v-else
											class="hover-coords-text__char"
											aria-hidden="true"
										>
											{{ character }}
										</span>
									</template>
								</span>
							</span>
						</div>
					</div>
					<div
						v-else-if="hoverDisplayVisible"
						key="hover-dimension"
						class="pointer-events-none inline-flex max-w-full items-center text-sm text-white"
						style="text-shadow: rgba(0, 0, 0, 0.7) 0px 0px 5px"
						aria-live="polite"
					>
						<span class="truncate font-semibold uppercase">
							{{ displayDimensionLabel }}
						</span>
					</div>
				</Transition>
			</div>

			<div
				class="pointer-events-none absolute inset-x-0 bottom-0 z-998 flex items-end p-4"
			>
				<div
					class="absolute inset-x-0 bottom-0 z-0 h-54 bg-linear-to-t from-slate-950/62 via-slate-950/24 to-transparent backdrop-blur-[32px] mask-[linear-gradient(to_top,black_0%,rgba(0,0,0,0.96)_18%,rgba(0,0,0,0.78)_34%,rgba(0,0,0,0.38)_56%,transparent_100%)]"
				/>

				<div
					class="relative z-20 flex w-full min-w-0 flex-col gap-3 text-white sm:flex-row sm:items-end sm:justify-between"
					style="text-shadow: rgba(0, 0, 0, 0.7) 0px 0px 5px"
				>
					<div class="min-w-0 flex-1">
						<div
							v-if="bodyRendererUrl"
							class="relative z-10 mb-3 w-22 shrink-0 sm:absolute sm:bottom-0 sm:left-4 sm:mb-0 sm:w-26"
							aria-hidden="true"
						>
							<img
								ref="bodyImageElement"
								:src="bodyRendererUrl"
								:alt="displayName"
								class="block w-full transition-opacity duration-500 ease-out drop-shadow-sm translate-y-0 sm:translate-y-20"
								:class="bodyImageLoaded ? 'opacity-100' : 'opacity-0'"
								@load="bodyImageLoaded = true"
								@error="bodyImageLoaded = true"
							/>
						</div>

						<div class="min-w-0 sm:pl-30">
							<div
								class="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-baseline sm:gap-2 sm:translate-y-1"
							>
								<span
									class="block max-w-full truncate text-3xl sm:text-[42px] leading-[normal] font-arkpixel"
								>
									{{ displayName }}
								</span>
								<UBadge
									v-if="displayPrimaryGroup"
									style="text-shadow: none"
									class="sm:-translate-y-1"
									color="neutral"
									variant="solid"
									size="xs"
								>
									{{ displayPrimaryGroup }}
								</UBadge>
							</div>
							<div class="flex flex-wrap items-baseline gap-x-2">
								<div class="flex items-baseline gap-1">
									<span class="text-xs text-white/80">
										{{ t('minecraftAccounts.overlay.lastLogin') }}
									</span>
									<span class="text-[17px] font-medium">{{ coordsText }}</span>
								</div>
								<div class="flex items-baseline gap-1">
									<UTooltip
										v-if="playTimeHoursLabel !== notAvailableLabel"
										:text="playTimeTooltip"
										class="flex items-baseline gap-1"
									>
										<span class="text-xs text-white/80">
											{{ t('minecraftAccounts.summary.playTime') }}
										</span>
										<span class="text-[17px] font-medium">{{
											playTimeHoursLabel
										}}</span>
									</UTooltip>
								</div>
							</div>

							<div v-if="isMobileViewport" class="sm:hidden">
								<Transition name="stats-fade" mode="out-in">
									<div
										:key="statsCarouselIndex"
										class="inline-flex items-baseline gap-1.5 text-xs text-white/90"
									>
										<span
											class="inline-flex items-baseline gap-1 text-white/70"
										>
											<UIcon
												:name="currentStat.icon"
												class="size-3 translate-y-0.5"
											/>
											{{ currentStat.label }}
										</span>
										<span class="text-[17px] font-medium">{{
											currentStat.value
										}}</span>
									</div>
								</Transition>
							</div>
						</div>
					</div>

					<div class="hidden shrink-0 sm:block">
						<div class="space-y-0.5 text-right text-[11px] text-white/90">
							<div
								v-for="item in summaryItems"
								:key="item.key"
								class="flex items-baseline justify-end gap-2"
							>
								<span class="inline-flex items-baseline gap-1 text-white/70">
									<UIcon :name="item.icon" class="size-3 translate-y-0.5" />
									{{ item.label }}
								</span>
								<span class="text-base font-medium">
									{{ item.value }}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section v-else>
			<PageInlineException
				icon="i-lucide-link"
				:title="t('minecraftAccounts.bind.title')"
			>
				<p
					class="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300/80"
				>
					{{ t('minecraftAccounts.empty.description') }}
				</p>
				<UButton
					type="button"
					size="xl"
					variant="link"
					icon="i-lucide-link"
					@click="emit('bind')"
				>
					{{ t('minecraftAccounts.empty.bindAction') }}
				</UButton>
			</PageInlineException>
		</section>
	</div>
</template>

<script setup lang="ts">
import type { MinecraftMapPointerMoveEventPayload } from '~/utils/map'
import { getMinecraftBodyRendererUrl } from '~/utils/minecraft/body-renderer'
import {
	formatMinecraftDateTime,
	getDefaultObservedPlayerUuid,
	resolveObservedPlayerSummary,
	type MinecraftAccountForm,
	type MinecraftLocationSummary,
} from '~/utils/minecraft/accounts'

interface MinecraftAccountsContentProps {
	accounts: MinecraftAccountForm[]
	selectedAccount: MinecraftAccountForm | null
	savingId: string | null
}

interface SummaryItem {
	key: string
	label: string
	value: string
	icon: string
}

const props = defineProps<MinecraftAccountsContentProps>()

const emit = defineEmits<{
	save: [account: MinecraftAccountForm]
	bind: []
}>()

const { locale, t } = useI18n()
const selectedUuid = ref<string | null>(null)
const bodyImageLoaded = ref(false)
const bodyImageElement = useTemplateRef<HTMLImageElement>('bodyImageElement')
const hoveredBlockPoint = ref<{ x: number; z: number } | null>(null)
const hoverCoordsVisible = ref(false)
const isMobileViewport = ref(false)
let bodyImageAnimationFrameId: number | null = null
let hoverCoordsHideTimer: ReturnType<typeof setTimeout> | null = null
let mobileViewportMediaQuery: MediaQueryList | null = null
const HOVER_COORDS_HIDE_DELAY = 5000
const digitCharacters = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
const digitStepEm = 1.2

const formatDateTime = (value: string | null): string =>
	formatMinecraftDateTime(
		value,
		locale.value,
		t('minecraftAccounts.fields.notAvailable'),
	)

const selectedObservedPlayer = computed(() =>
	props.selectedAccount
		? resolveObservedPlayerSummary(props.selectedAccount, selectedUuid.value)
		: null,
)

const displayName = computed(
	() =>
		props.selectedAccount?.playerIdentity.playerId ??
		props.selectedAccount?.authmeRealname ??
		props.selectedAccount?.username ??
		'',
)

const bodyRendererUrl = computed(() =>
	displayName.value ? getMinecraftBodyRendererUrl(displayName.value) : '',
)

const queueBodyImageReveal = () => {
	if (import.meta.client && bodyImageAnimationFrameId != null) {
		cancelAnimationFrame(bodyImageAnimationFrameId)
	}

	if (!import.meta.client) {
		bodyImageLoaded.value = true
		return
	}

	bodyImageAnimationFrameId = window.requestAnimationFrame(() => {
		bodyImageLoaded.value = true
		bodyImageAnimationFrameId = null
	})
}

const syncBodyImageLoadedState = () => {
	const isReady = Boolean(
		bodyImageElement.value?.complete && bodyImageElement.value.naturalWidth > 0,
	)

	if (isReady) {
		queueBodyImageReveal()
	}
}

const clearHoverCoordsHideTimer = () => {
	if (hoverCoordsHideTimer) {
		clearTimeout(hoverCoordsHideTimer)
		hoverCoordsHideTimer = null
	}
}

const scheduleHoverCoordsHide = () => {
	clearHoverCoordsHideTimer()
	hoverCoordsHideTimer = setTimeout(() => {
		hoverCoordsVisible.value = false
	}, HOVER_COORDS_HIDE_DELAY)
}

const handleMapPointerMove = (payload: MinecraftMapPointerMoveEventPayload) => {
	hoveredBlockPoint.value = {
		x: Math.round(payload.blockPoint.x),
		z: Math.round(payload.blockPoint.z),
	}
	hoverCoordsVisible.value = true
	scheduleHoverCoordsHide()
}

const handleMapPointerLeave = () => {
	scheduleHoverCoordsHide()
}

const hoverXText = computed(() =>
	hoveredBlockPoint.value ? String(hoveredBlockPoint.value.x) : '--',
)
const hoverZText = computed(() =>
	hoveredBlockPoint.value ? String(hoveredBlockPoint.value.z) : '--',
)
const hoverXCharacters = computed(() => hoverXText.value.split(''))
const hoverZCharacters = computed(() => hoverZText.value.split(''))
const isDigitCharacter = (character: string) => /\d/.test(character)
const hoverDisplayVisible = computed(
	() => Boolean(displayDimensionLabel.value) || hoverCoordsVisible.value,
)

const isOnline = computed(
	() =>
		selectedObservedPlayer.value?.online ??
		props.selectedAccount?.presence?.online ??
		false,
)

const displayLocation = computed<MinecraftLocationSummary | null>(
	() =>
		selectedObservedPlayer.value?.lastSavedLocation ??
		props.selectedAccount?.presence?.lastSavedLocation ??
		null,
)
const displayDimensionLabel = computed(() => {
	const dimension = displayLocation.value?.dimension?.trim()
	if (!dimension) {
		return ''
	}

	return dimension.toUpperCase()
})

const coordsText = computed(() => {
	const location = displayLocation.value
	if (
		!location ||
		location.x == null ||
		location.z == null ||
		!Number.isFinite(location.x) ||
		!Number.isFinite(location.z)
	) {
		return t('minecraftAccounts.fields.unknownCoords')
	}

	return `${Math.round(location.x)}, ${Math.round(location.z)}`
})

const displayFirstJoinedAt = computed(
	() =>
		selectedObservedPlayer.value?.playerProfile.firstPlayedAt ??
		props.selectedAccount?.firstJoinedAt ??
		null,
)

const displayLastSeenAt = computed(
	() =>
		selectedObservedPlayer.value?.playerProfile.lastPlayedAt ??
		selectedObservedPlayer.value?.lastSeenAt ??
		props.selectedAccount?.lastSeenAt ??
		null,
)

const displayPlayerProfile = computed(
	() =>
		selectedObservedPlayer.value?.playerProfile ??
		props.selectedAccount?.playerProfile ?? {
			firstPlayedAt: null,
			lastPlayedAt: null,
			hasStats: false,
			hasAdvancements: false,
			statsCount: 0,
			advancementsTotalCount: 0,
			advancementsCompletedCount: 0,
			distanceTraveledCm: 0,
			deaths: 0,
			leaveCount: 0,
			playTimeTicks: 0,
		},
)

const notAvailableLabel = computed(() =>
	t('minecraftAccounts.fields.notAvailable'),
)

const displayPrimaryGroup = computed(
	() =>
		selectedObservedPlayer.value?.luckPermsPrimaryGroup ??
		props.selectedAccount?.luckPermsPrimaryGroup ??
		null,
)

const advancementsDisplayValue = computed(() =>
	t('minecraftAccounts.summary.advancementsValue', {
		completed: displayPlayerProfile.value.advancementsCompletedCount,
		total: displayPlayerProfile.value.advancementsTotalCount,
	}),
)

const distanceLabel = computed(() => {
	if (!displayPlayerProfile.value.hasStats) {
		return notAvailableLabel.value
	}
	return `${(displayPlayerProfile.value.distanceTraveledCm / 100000).toFixed(1)}km`
})

const deathsLabel = computed(() =>
	displayPlayerProfile.value.hasStats
		? String(displayPlayerProfile.value.deaths)
		: notAvailableLabel.value,
)

const leaveCountLabel = computed(() =>
	displayPlayerProfile.value.hasStats
		? String(displayPlayerProfile.value.leaveCount)
		: notAvailableLabel.value,
)

const TICKS_PER_SECOND = 20
const playTimeHoursLabel = computed(() => {
	const ticks = displayPlayerProfile.value.playTimeTicks
	if (!displayPlayerProfile.value.hasStats || !ticks) {
		return notAvailableLabel.value
	}
	const hours = ticks / TICKS_PER_SECOND / 3600
	return `${Math.round(hours * 10) / 10}h`
})

const playTimeTooltip = computed(() => {
	const ticks = displayPlayerProfile.value.playTimeTicks
	if (!displayPlayerProfile.value.hasStats || !ticks) {
		return notAvailableLabel.value
	}
	const totalSeconds = Math.floor(ticks / TICKS_PER_SECOND)
	const days = Math.floor(totalSeconds / 86400)
	const hours = Math.floor((totalSeconds % 86400) / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60
	return [
		`${days}${t('minecraftAccounts.summary.durationDay')}`,
		`${hours}${t('minecraftAccounts.summary.durationHour')}`,
		`${minutes}${t('minecraftAccounts.summary.durationMinute')}`,
		`${seconds}${t('minecraftAccounts.summary.durationSecond')}`,
	].join('')
})

const summaryItems = computed<SummaryItem[]>(() => [
	{
		key: 'deaths',
		label: t('minecraftAccounts.summary.deaths'),
		value: deathsLabel.value,
		icon: 'i-lucide-skull',
	},
	{
		key: 'leave-count',
		label: t('minecraftAccounts.summary.leaveCount'),
		value: leaveCountLabel.value,
		icon: 'i-lucide-log-out',
	},
	{
		key: 'advancements',
		label: t('minecraftAccounts.summary.advancements'),
		value: advancementsDisplayValue.value,
		icon: 'i-lucide-trophy',
	},
	{
		key: 'distance',
		label: t('minecraftAccounts.summary.distance'),
		value: distanceLabel.value,
		icon: 'i-lucide-footprints',
	},
	{
		key: 'last-seen',
		label: t('minecraftAccounts.summary.lastSeen'),
		value: formatDateTime(displayLastSeenAt.value),
		icon: 'i-lucide-clock-3',
	},
	{
		key: 'first-joined',
		label: t('minecraftAccounts.summary.firstJoined'),
		value: formatDateTime(displayFirstJoinedAt.value),
		icon: 'i-lucide-calendar-plus-2',
	},
])

const statsCarouselIndex = ref(0)
let statsCarouselTimer: ReturnType<typeof setInterval> | null = null
const STATS_CAROUSEL_INTERVAL = 3000

const stopStatsCarousel = () => {
	if (statsCarouselTimer) {
		clearInterval(statsCarouselTimer)
		statsCarouselTimer = null
	}
}

const startStatsCarousel = () => {
	stopStatsCarousel()

	if (
		!import.meta.client ||
		!isMobileViewport.value ||
		summaryItems.value.length <= 1
	) {
		return
	}

	statsCarouselTimer = setInterval(() => {
		statsCarouselIndex.value =
			(statsCarouselIndex.value + 1) % summaryItems.value.length
	}, STATS_CAROUSEL_INTERVAL)
}

const currentStat = computed(
	() =>
		summaryItems.value[statsCarouselIndex.value] ??
		summaryItems.value[0] ?? { key: '', label: '', value: '', icon: '' },
)

const syncMobileViewportState = () => {
	isMobileViewport.value = mobileViewportMediaQuery?.matches ?? false
}

watch(summaryItems, (items) => {
	if (statsCarouselIndex.value >= items.length) {
		statsCarouselIndex.value = 0
	}

	startStatsCarousel()
})

const uuidItems = computed(() =>
	(props.selectedAccount?.playerIdentity.observedPlayers ?? []).map(
		(player) => ({
			label: `${player.uuid}${player.online ? ` · ${t('minecraftAccounts.identity.online')}` : ''}`,
			value: player.uuid,
		}),
	),
)

const selectedUuidModel = computed<string>({
	get: () => selectedUuid.value ?? '',
	set: (value) => {
		selectedUuid.value = value || null
	},
})

watch(
	() => props.selectedAccount?.id,
	() => {
		selectedUuid.value = props.selectedAccount
			? getDefaultObservedPlayerUuid(props.selectedAccount)
			: null
		hoveredBlockPoint.value = null
		hoverCoordsVisible.value = false
		clearHoverCoordsHideTimer()
	},
	{ immediate: true },
)

watch(
	bodyRendererUrl,
	async () => {
		if (import.meta.client && bodyImageAnimationFrameId != null) {
			cancelAnimationFrame(bodyImageAnimationFrameId)
			bodyImageAnimationFrameId = null
		}

		bodyImageLoaded.value = false
		await nextTick()
		syncBodyImageLoadedState()
	},
	{ immediate: true },
)

onMounted(() => {
	syncBodyImageLoadedState()

	if (import.meta.client) {
		mobileViewportMediaQuery = window.matchMedia('(max-width: 639px)')
		syncMobileViewportState()
		mobileViewportMediaQuery.addEventListener('change', syncMobileViewportState)
	}

	startStatsCarousel()
})

watch(isMobileViewport, () => {
	startStatsCarousel()
})

onBeforeUnmount(() => {
	if (import.meta.client && bodyImageAnimationFrameId != null) {
		cancelAnimationFrame(bodyImageAnimationFrameId)
	}

	clearHoverCoordsHideTimer()
	stopStatsCarousel()
	mobileViewportMediaQuery?.removeEventListener(
		'change',
		syncMobileViewportState,
	)
	mobileViewportMediaQuery = null
})
</script>

<style scoped>
.hover-coords-enter-active,
.hover-coords-leave-active {
	transition:
		opacity 220ms ease-out,
		transform 260ms cubic-bezier(0.16, 1, 0.3, 1),
		filter 220ms ease-out;
}

.hover-coords-enter-from,
.hover-coords-leave-to {
	opacity: 0;
	filter: blur(1px);
	transform: translateY(8px) scale(0.96);
}

.hover-coords-enter-to,
.hover-coords-leave-from {
	opacity: 1;
	filter: blur(0);
	transform: translateY(0) scale(1);
}

.stats-fade-enter-active,
.stats-fade-leave-active {
	transition:
		opacity 280ms ease-out,
		transform 320ms cubic-bezier(0.16, 1, 0.3, 1),
		filter 280ms ease-out;
}

.stats-fade-enter-from,
.stats-fade-leave-to {
	opacity: 0;
	filter: blur(2px);
	transform: translateY(6px);
}

.stats-fade-enter-to,
.stats-fade-leave-from {
	opacity: 1;
	filter: blur(0);
	transform: translateY(0);
}

.digit-flip {
	display: inline-block;
	width: 0.62em;
	height: 1.2em;
	overflow: hidden;
	overflow: clip;
	clip-path: inset(0);
	contain: paint;
	line-height: 1.2em;
	text-align: center;
	font-variant-numeric: tabular-nums;
	vertical-align: -0.16em;
}

.digit-flip__reel {
	display: flex;
	flex-direction: column;
	line-height: 1.2em;
	will-change: transform;
}

.digit-flip__digit {
	display: block;
	width: 100%;
	height: 1.2em;
	line-height: 1.2em;
	text-align: center;
}

.hover-coords-text {
	display: inline-block;
	min-width: 2ch;
	max-width: 8ch;
	line-height: 1;
	font-size: 1rem;
	font-weight: 600;
	font-variant-numeric: tabular-nums;
	font-feature-settings: 'tnum';
	overflow: hidden;
}

.hover-coords-text__inner {
	display: inline-block;
	width: max-content;
	height: 1.2em;
	line-height: 1.2em;
	transform: translateY(-0.12em);
	white-space: nowrap;
}

.hover-coords-text__char {
	display: inline-block;
	height: 1.2em;
	line-height: 1.2em;
	vertical-align: -0.16em;
}
</style>
