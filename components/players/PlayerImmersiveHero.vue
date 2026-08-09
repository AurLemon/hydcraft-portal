<template>
	<section class="relative isolate h-dvh w-full overflow-hidden bg-slate-950">
		<div class="absolute inset-0">
			<MinecraftPresenceMap
				ref="presenceMapRef"
				:account="account"
				:selected-view-id="selectedViewId"
				map-mode="perspective"
				@view-change="mapView = $event"
			/>
		</div>

		<div
			class="pointer-events-none absolute inset-y-0 left-0 z-10 w-full bg-linear-to-r from-slate-950/78 via-slate-950/38 to-transparent lg:w-[46%]"
		/>
		<div
			class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[32%] bg-linear-to-t from-slate-950/68 via-slate-950/22 to-transparent"
		/>
		<div
			class="pointer-events-none absolute inset-x-0 top-0 z-10 h-64 bg-linear-to-b from-slate-950/45 to-transparent"
		/>
		<div
			class="immersive-site-shell pointer-events-none relative z-30 flex h-dvh flex-col pt-28 pb-10 text-white lg:pt-44 lg:pb-14"
		>
			<div
				class="pointer-events-auto absolute top-28 right-[clamp(1.5rem,3.5vw,4rem)] lg:top-40"
			>
				<BlueMapOrientationControl
					:view="mapView"
					@align-north="presenceMapRef?.alignNorth()"
					@reset="presenceMapRef?.resetView()"
				/>
			</div>

			<div class="flex min-h-0 flex-1 flex-col justify-between lg:flex-row">
				<div
					class="player-immersive-panel pointer-events-none flex w-full max-w-xl self-stretch flex-col [text-shadow:rgba(0,0,0,0.72)_0_1px_6px]"
				>
					<div class="flex flex-col min-w-0 gap-1">
						<SkeletonImage
							:src="headRendererUrl"
							:alt="displayName"
							class="size-16 shrink-0"
							skeleton-class="rounded-xl bg-white/12"
							image-class="size-16 object-contain drop-shadow-lg"
							loading="eager"
						/>

						<div class="min-w-0">
							<div class="flex min-w-0 flex-wrap items-baseline gap-2">
								<UPopover
									v-if="showServerSelector"
									v-model:open="serverMenuOpen"
									:popper="{ placement: 'bottom-start' }"
								>
									<button
										type="button"
										class="group pointer-events-auto inline-flex min-w-0 max-w-full cursor-pointer items-center gap-1 text-left transition-opacity hover:opacity-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
										:aria-label="displayName"
									>
										<span
											class="block max-w-full truncate text-3xl leading-[normal] font-arkpixel sm:text-4xl lg:text-[42px]"
										>
											{{ displayName }}
										</span>
										<UIcon
											name="i-lucide-chevron-down"
											class="size-4 shrink-0 text-white/75 transition-transform duration-250"
											:class="serverMenuOpen ? 'rotate-180' : ''"
										/>
									</button>

									<template #content>
										<div
											class="grid w-80 max-w-[calc(100vw-2rem)] gap-1 overflow-hidden rounded-lg p-1.5"
										>
											<button
												v-for="item in serverViewItems"
												:key="item.value"
												type="button"
												class="flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
												:class="{
													'bg-primary-100/60 text-primary-600 dark:bg-primary-500/20 dark:text-primary-200':
														item.value === selectedViewId,
													'text-slate-600 dark:text-slate-300':
														item.value !== selectedViewId,
												}"
												@click="selectServerView(item.value)"
											>
												<span class="min-w-0 flex-1 truncate">
													{{ item.label }}
												</span>
												<UIcon
													v-if="item.value === selectedViewId"
													name="i-lucide-check"
													class="size-3.5 shrink-0"
												/>
											</button>
										</div>
									</template>
								</UPopover>
								<span
									v-else
									class="block max-w-full truncate text-3xl leading-[normal] font-arkpixel sm:text-4xl lg:text-[42px]"
								>
									{{ displayName }}
								</span>
							</div>
						</div>
					</div>

					<div class="mt-4 flex flex-wrap gap-2">
						<UBadge
							class="gap-1.5 text-shadow-none"
							:class="
								isOnline
									? '!bg-emerald-500 !text-white'
									: '!bg-slate-500 !text-white'
							"
							variant="solid"
						>
							<span
								class="block size-2 rounded-full"
								:class="isOnline ? 'bg-emerald-300' : 'bg-slate-300'"
							/>
							{{
								isOnline
									? t('minecraftAccounts.identity.online')
									: t('minecraftAccounts.identity.offline')
							}}
						</UBadge>
						<UBadge
							v-if="account.isPrimary"
							class="!bg-sky-500 !text-white text-shadow-none"
							variant="solid"
						>
							{{ t('minecraftAccounts.badges.primary') }}
						</UBadge>
						<UBadge
							v-if="account.identityKind === 'HISTORICAL'"
							class="!bg-amber-500 !text-white text-shadow-none"
							variant="solid"
						>
							{{ t('minecraftAccounts.kinds.historical') }}
						</UBadge>
						<UBadge
							v-if="displayPrimaryGroup"
							variant="solid"
							class="uppercase text-shadow-none"
							color="neutral"
						>
							{{ displayPrimaryGroup }}
						</UBadge>
					</div>

					<Transition name="player-view-switch" mode="out-in">
						<div
							:key="selectedViewId ?? 'default'"
							class="mt-6 grid w-fit gap-2.5 border-t border-white/25 pt-5 text-sm"
						>
							<div
								v-if="officialLastLogin"
								class="grid grid-cols-[auto_1fr] items-end gap-x-2 gap-y-0.5"
							>
								<span class="inline-flex items-center gap-1 text-white/70">
									<UIcon name="i-lucide-log-in" class="size-4" />
									{{ t('minecraftAccounts.overlay.lastLogin') }}
								</span>
								<span class="translate-y-0.5 text-xl font-medium">
									{{ lastLoginLocationLabel }}
								</span>
								<span
									class="col-start-2 inline-flex items-center gap-1.5 text-xs text-white/62"
								>
									<span>{{ lastLoginDetails }}</span>
									<button
										v-if="officialLastLogin.ipAddress"
										type="button"
										class="pointer-events-auto inline-flex size-5 cursor-pointer items-center justify-center rounded text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-300"
										:aria-label="
											ipAddressVisible
												? t('minecraftAccounts.overlay.hideIp')
												: t('minecraftAccounts.overlay.showIp')
										"
										@click="ipAddressVisible = !ipAddressVisible"
									>
										<UIcon
											:name="
												ipAddressVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'
											"
											class="size-3.5"
										/>
									</button>
								</span>
							</div>
							<div class="flex items-end gap-2">
								<span class="inline-flex items-center gap-1 text-white/70">
									<UIcon name="i-lucide-map-pin" class="size-4" />
									{{ t('minecraftAccounts.overlay.lastLocation') }}
								</span>
								<span class="text-xl font-medium translate-y-0.5">
									{{ coordsText }}
								</span>
								<UButton
									v-if="canLocatePlayer"
									type="button"
									color="neutral"
									variant="link"
									class="pointer-events-auto cursor-pointer px-0"
									size="xs"
									:aria-label="t('minecraftAccounts.overlay.locatePlayer')"
									@click="presenceMapRef?.focusPlayer()"
								>
									<UIcon name="i-lucide-locate-fixed" class="size-4" />
								</UButton>
							</div>
							<div
								v-if="officialRegistration"
								class="grid grid-cols-[auto_1fr] items-end gap-x-2 gap-y-0.5"
							>
								<span class="inline-flex items-center gap-1 text-white/70">
									<UIcon name="i-lucide-user-round-plus" class="size-4" />
									{{ t('minecraftAccounts.overlay.registration') }}
								</span>
								<span class="translate-y-0.5 text-xl font-medium">
									{{ registrationLocationLabel }}
								</span>
								<span
									class="col-start-2 inline-flex items-center gap-1.5 text-xs text-white/62"
								>
									<span>{{ registrationDetails }}</span>
									<button
										v-if="officialRegistration.ipAddress"
										type="button"
										class="pointer-events-auto inline-flex size-5 cursor-pointer items-center justify-center rounded text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-300"
										:aria-label="
											registrationIpAddressVisible
												? t('minecraftAccounts.overlay.hideIp')
												: t('minecraftAccounts.overlay.showIp')
										"
										@click="
											registrationIpAddressVisible =
												!registrationIpAddressVisible
										"
									>
										<UIcon
											:name="
												registrationIpAddressVisible
													? 'i-lucide-eye-off'
													: 'i-lucide-eye'
											"
											class="size-3.5"
										/>
									</button>
								</span>
							</div>
							<div class="flex items-end gap-2">
								<span class="inline-flex items-center gap-1.5 text-white/70">
									<UIcon
										name="i-lucide-clock-3"
										class="size-3.5 -translate-y-0.5"
									/>
									{{ t('minecraftAccounts.summary.playTime') }}
								</span>
								<UTooltip
									v-if="playTimeHoursLabel !== notAvailableLabel"
									:text="playTimeTooltip"
								>
									<span class="text-xl font-medium translate-y-0.5">
										{{ playTimeHoursLabel }}
									</span>
								</UTooltip>
								<span v-else class="text-xl font-medium translate-y-0.5">
									{{ playTimeHoursLabel }}
								</span>
							</div>
						</div>
					</Transition>

					<div
						v-if="boundPortalUser"
						class="mt-auto inline-flex flex-wrap items-center gap-1 pt-6 text-sm text-white/78"
					>
						<UIcon
							name="i-lucide-corner-down-right"
							class="size-4 shrink-0 text-white/62"
						/>
						<span>{{ t('players.boundToPrefix') }}</span>
						<NuxtLink
							:to="localePath(`/u/${boundPortalUser.username}`)"
							class="pointer-events-auto inline-flex cursor-pointer items-center gap-1.5 rounded-full px-1 py-0.5 font-medium transition-colors hover:bg-white/10"
						>
							<UAvatar
								:src="boundPortalUser.avatarUrl || undefined"
								:alt="boundPortalUser.username"
								size="xs"
								:text="boundPortalUser.username.slice(0, 1).toUpperCase()"
							/>
							<span>{{ boundPortalUser.username }}</span>
						</NuxtLink>
						<span v-if="boundToSuffix">{{ boundToSuffix }}</span>
					</div>
				</div>

				<Transition name="player-view-switch" mode="out-in">
					<div
						:key="`summary-${selectedViewId ?? 'default'}`"
						class="player-immersive-panel mt-auto hidden shrink-0 self-end [text-shadow:rgba(0,0,0,0.78)_0_1px_6px] lg:block"
					>
						<div class="space-y-0.5 text-right text-[11px] text-white/90">
							<div
								v-for="item in summaryItems"
								:key="item.key"
								class="flex items-baseline justify-end gap-2"
							>
								<span
									class="inline-flex items-baseline text-sm gap-1 text-white/70"
								>
									<UIcon :name="item.icon" class="size-3 translate-y-0.5" />
									{{ item.label }}
								</span>
								<span class="text-lg font-medium">{{ item.value }}</span>
							</div>
						</div>
					</div>
				</Transition>
			</div>

			<div class="pointer-events-none mt-auto lg:hidden">
				<Transition name="player-view-switch" mode="out-in">
					<div
						:key="`${selectedViewId ?? 'default'}-${statsCarouselIndex}`"
						class="player-immersive-panel inline-flex items-baseline gap-2 text-sm"
					>
						<span class="inline-flex items-center gap-1.5 text-white/68">
							<UIcon :name="currentStat.icon" class="size-4" />
							{{ currentStat.label }}
						</span>
						<span class="text-lg font-medium">{{ currentStat.value }}</span>
					</div>
				</Transition>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import { getMinecraftHeadRendererUrl } from '~/utils/minecraft/body-renderer'
import {
	AGGREGATE_SERVER_VIEW_ID,
	formatMinecraftDateTime,
	getDefaultServerViewId,
	listServerViewItems,
	resolveObservedPlayerForServerView,
	resolveServerViewSummary,
	type MinecraftAccountForm,
	type MinecraftAccountServerView,
	type MinecraftLocationSummary,
} from '~/utils/minecraft/accounts'
import type { BlueMapViewChangedEventPayload } from '~/utils/map'

interface PlayerImmersiveHeroProps {
	account: MinecraftAccountForm
}

interface SummaryItem {
	key: string
	label: string
	value: string
	icon: string
}

const props = defineProps<PlayerImmersiveHeroProps>()
const { locale, t } = useI18n()
const localePath = useLocalePath()
const selectedViewId = ref<string | null>(null)
const serverMenuOpen = ref(false)
const ipAddressVisible = ref(false)
const registrationIpAddressVisible = ref(false)
const mapView = ref<BlueMapViewChangedEventPayload>({
	rotation: 0,
	angle: 0,
	tilt: 0,
})
const presenceMapRef = ref<{
	alignNorth: () => void
	focusPlayer: () => void
	resetView: () => void
} | null>(null)
const statsCarouselIndex = ref(0)
let statsCarouselTimer: ReturnType<typeof setInterval> | null = null

const displayName = computed(
	() =>
		props.account.playerIdentity.playerId ??
		props.account.authmeRealname ??
		props.account.username,
)
const headRendererUrl = computed(() =>
	getMinecraftHeadRendererUrl(displayName.value),
)
const boundPortalUser = computed(() => props.account.boundPortalUser ?? null)
const boundToSuffix = computed(() => t('players.boundToSuffix').trim())
const officialLastLogin = computed(() =>
	props.account.identityKind === 'AUTHENTICATED'
		? (props.account.lastLogin ?? null)
		: null,
)
const officialRegistration = computed(() =>
	props.account.identityKind === 'AUTHENTICATED'
		? (props.account.registration ?? null)
		: null,
)

const selectedServerView = computed<MinecraftAccountServerView | null>(() =>
	resolveServerViewSummary(props.account, selectedViewId.value),
)
const selectedObservedPlayer = computed(() =>
	resolveObservedPlayerForServerView(props.account, selectedViewId.value),
)
const displayLocation = computed<MinecraftLocationSummary | null>(
	() =>
		selectedServerView.value?.presence?.lastSavedLocation ??
		selectedObservedPlayer.value?.lastSavedLocation ??
		props.account.presence?.lastSavedLocation ??
		null,
)
const displayPlayerProfile = computed(
	() => selectedServerView.value?.playerProfile ?? props.account.playerProfile,
)
const isAggregateViewSelected = computed(
	() => selectedServerView.value?.id === AGGREGATE_SERVER_VIEW_ID,
)
const displayFirstJoinedAt = computed(() =>
	isAggregateViewSelected.value
		? (selectedServerView.value?.firstJoinedAt ??
			props.account.firstJoinedAt ??
			null)
		: (selectedServerView.value?.firstJoinedAt ?? null),
)
const displayLastSeenAt = computed(() =>
	isAggregateViewSelected.value
		? (selectedServerView.value?.lastSeenAt ?? props.account.lastSeenAt ?? null)
		: (selectedServerView.value?.lastSeenAt ?? null),
)
const displayPrimaryGroup = computed(
	() =>
		selectedServerView.value?.luckPermsPrimaryGroup ??
		selectedObservedPlayer.value?.luckPermsPrimaryGroup ??
		props.account.luckPermsPrimaryGroup ??
		null,
)
const isOnline = computed(
	() =>
		selectedServerView.value?.online ??
		selectedObservedPlayer.value?.online ??
		props.account.presence?.online ??
		false,
)

const notAvailableLabel = computed(() =>
	t('minecraftAccounts.fields.notAvailable'),
)
const coordsText = computed(() => {
	const location = displayLocation.value
	if (
		!location ||
		location.x == null ||
		location.y == null ||
		location.z == null ||
		!Number.isFinite(location.x) ||
		!Number.isFinite(location.y) ||
		!Number.isFinite(location.z)
	) {
		return t('minecraftAccounts.fields.unknownCoords')
	}

	return `${Math.round(location.x)}, ${Math.round(location.y)}, ${Math.round(location.z)}`
})
const canLocatePlayer = computed(
	() =>
		Number.isFinite(displayLocation.value?.x) &&
		Number.isFinite(displayLocation.value?.z),
)

const lastLoginLocationLabel = computed(
	() =>
		officialLastLogin.value?.ipLocation ??
		t('minecraftAccounts.overlay.unknownIpLocation'),
)
const registrationLocationLabel = computed(
	() =>
		officialRegistration.value?.ipLocation ??
		t('minecraftAccounts.overlay.unknownIpLocation'),
)
const maskIpAddress = (ipAddress: string): string => {
	let preservedFirstCharacter = false
	return ipAddress.replace(/[0-9a-f]/gi, (character) => {
		if (!preservedFirstCharacter) {
			preservedFirstCharacter = true
			return character
		}

		return '*'
	})
}
const lastLoginIpLabel = computed(() => {
	const ipAddress = officialLastLogin.value?.ipAddress
	if (!ipAddress) return t('minecraftAccounts.overlay.unknownIp')
	return ipAddressVisible.value ? ipAddress : maskIpAddress(ipAddress)
})
const registrationIpLabel = computed(() => {
	const ipAddress = officialRegistration.value?.ipAddress
	if (!ipAddress) return t('minecraftAccounts.overlay.unknownIp')
	return registrationIpAddressVisible.value
		? ipAddress
		: maskIpAddress(ipAddress)
})
const TICKS_PER_SECOND = 20
const playTimeHoursLabel = computed(() => {
	const profile = displayPlayerProfile.value
	if (!profile.hasStats || !profile.playTimeTicks) {
		return notAvailableLabel.value
	}

	const hours = profile.playTimeTicks / TICKS_PER_SECOND / 3600
	return `${Math.round(hours * 10) / 10}h`
})
const playTimeTooltip = computed(() => {
	const profile = displayPlayerProfile.value
	if (!profile.hasStats || !profile.playTimeTicks) {
		return notAvailableLabel.value
	}

	const totalSeconds = Math.floor(profile.playTimeTicks / TICKS_PER_SECOND)
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

const formatDateTime = (value: string | null): string =>
	formatMinecraftDateTime(value, locale.value, notAvailableLabel.value)
const formatAuthMeActivityTime = (value: string | null): string => {
	if (!value) return notAvailableLabel.value

	return new Intl.DateTimeFormat(locale.value, {
		dateStyle: 'short',
		timeStyle: 'short',
	}).format(new Date(value))
}
const lastLoginDetails = computed(() =>
	[
		lastLoginIpLabel.value,
		formatAuthMeActivityTime(officialLastLogin.value?.at ?? null),
	].join(' '),
)
const registrationDetails = computed(() =>
	[
		registrationIpLabel.value,
		formatAuthMeActivityTime(officialRegistration.value?.at ?? null),
	].join(' '),
)
const advancementsDisplayValue = computed(() =>
	t('minecraftAccounts.summary.advancementsValue', {
		completed: displayPlayerProfile.value.advancementsCompletedCount,
		total: displayPlayerProfile.value.advancementsTotalCount,
	}),
)
const distanceLabel = computed(() =>
	displayPlayerProfile.value.hasStats
		? `${(displayPlayerProfile.value.distanceTraveledCm / 100000).toFixed(1)}km`
		: notAvailableLabel.value,
)
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
const currentStat = computed(
	() =>
		summaryItems.value[statsCarouselIndex.value] ??
		summaryItems.value[0] ?? { key: '', label: '', value: '', icon: '' },
)

const serverViewItems = computed(() =>
	listServerViewItems(props.account, {
		locale: locale.value,
		aggregateLabel: t('minecraftAccounts.selector.aggregate'),
		noUuidLabel: t('minecraftAccounts.fields.noUuid'),
		requireMap: true,
	}),
)
const showServerSelector = computed(() => serverViewItems.value.length > 1)

const selectServerView = (value: string) => {
	selectedViewId.value = value
	serverMenuOpen.value = false
}

const stopStatsCarousel = () => {
	if (!statsCarouselTimer) return
	clearInterval(statsCarouselTimer)
	statsCarouselTimer = null
}

const startStatsCarousel = () => {
	stopStatsCarousel()
	if (!import.meta.client || summaryItems.value.length <= 1) return

	statsCarouselTimer = setInterval(() => {
		statsCarouselIndex.value =
			(statsCarouselIndex.value + 1) % summaryItems.value.length
	}, 3000)
}

watch(
	() => props.account.id,
	() => {
		ipAddressVisible.value = false
		registrationIpAddressVisible.value = false
		selectedViewId.value = getDefaultServerViewId(props.account, {
			requireMap: true,
		})
	},
	{ immediate: true },
)

watch(
	serverViewItems,
	(items) => {
		if (!items.length) {
			selectedViewId.value = null
			return
		}

		if (!items.some((item) => item.value === selectedViewId.value)) {
			selectedViewId.value = items[0]?.value ?? null
		}
	},
	{ immediate: true },
)

watch(summaryItems, (items) => {
	if (statsCarouselIndex.value >= items.length) {
		statsCarouselIndex.value = 0
	}
})

onMounted(startStatsCarousel)
onBeforeUnmount(stopStatsCarousel)
</script>

<style scoped>
.player-immersive-panel {
	animation: player-immersive-panel-in 680ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.player-view-switch-enter-active,
.player-view-switch-leave-active {
	transition:
		opacity 240ms ease,
		transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
		filter 240ms ease;
}

.player-view-switch-enter-from,
.player-view-switch-leave-to {
	opacity: 0;
	filter: blur(2px);
	transform: translateY(6px);
}

@keyframes player-immersive-panel-in {
	from {
		opacity: 0;
		transform: translateY(14px);
	}

	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@media (prefers-reduced-motion: reduce) {
	.player-immersive-panel {
		animation: none;
	}

	.player-view-switch-enter-active,
	.player-view-switch-leave-active {
		transition: none;
	}
}
</style>
