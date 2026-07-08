<template>
	<div>
		<section
			v-if="selectedAccount"
			class="relative isolate min-h-160 w-full overflow-hidden rounded-3xl bg-slate-900 shadow-sm"
		>
			<div class="absolute inset-0">
				<MinecraftPresenceMap
					:account="selectedAccount"
					:selected-view-id="selectedViewId"
				/>
			</div>

			<div class="absolute left-3 top-3 z-10 flex flex-col items-start gap-2">
				<UBadge
					class="gap-1.5 text-white"
					:class="
						isOnline
							? '!bg-emerald-500 !text-white'
							: '!bg-slate-500 !text-white'
					"
					variant="solid"
				>
					<span
						class="block size-2 rounded-full"
						:class="isOnline ? 'bg-emerald-400' : 'bg-slate-300'"
					/>
					{{
						isOnline
							? t('minecraftAccounts.identity.online')
							: t('minecraftAccounts.identity.offline')
					}}
				</UBadge>
				<UBadge
					v-if="selectedAccount.isPrimary"
					class="!bg-sky-500 !text-white"
					variant="solid"
				>
					{{ t('minecraftAccounts.badges.primary') }}
				</UBadge>
				<UBadge
					v-if="selectedAccount.identityKind === 'HISTORICAL'"
					class="!bg-amber-500 !text-white"
					variant="solid"
				>
					{{ t('minecraftAccounts.kinds.historical') }}
				</UBadge>
			</div>

			<div
				class="pointer-events-none absolute inset-x-0 bottom-0 z-[998] flex items-end p-4"
			>
				<div
					class="absolute inset-x-0 bottom-0 z-0 h-54 bg-linear-to-t from-slate-950/62 via-slate-950/24 to-transparent backdrop-blur-[32px] mask-[linear-gradient(to_top,black_0%,rgba(0,0,0,0.96)_18%,rgba(0,0,0,0.78)_34%,rgba(0,0,0,0.38)_56%,transparent_100%)]"
				/>

				<div
					class="relative z-20 flex w-full min-w-0 flex-col gap-3 text-white sm:flex-row sm:items-end sm:justify-between [text-shadow:rgba(0,0,0,0.7)_0px_0px_5px]"
				>
					<div class="min-w-0 flex-1">
						<div
							v-if="bodyRendererUrl"
							class="relative z-10 mb-3 w-22 shrink-0 sm:absolute sm:bottom-0 sm:left-4 sm:mb-0 sm:w-26"
							aria-hidden="true"
						>
							<img
								:src="bodyRendererUrl"
								:alt="displayName"
								class="block w-full drop-shadow-sm translate-y-0 sm:translate-y-20"
							/>
						</div>

						<div class="min-w-0 sm:pl-34">
							<div
								class="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-baseline sm:gap-2 sm:translate-y-1"
							>
								<UPopover
									v-if="showServerSelector"
									v-model:open="serverMenuOpen"
									:popper="{ placement: 'bottom-start' }"
								>
									<button
										type="button"
										class="group pointer-events-auto inline-flex min-w-0 max-w-full items-center gap-1 text-left text-white transition hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
										:aria-label="displayName"
									>
										<span
											class="block max-w-full truncate text-3xl leading-[normal] font-arkpixel [text-shadow:rgba(0,0,0,0.7)_0px_0px_5px] sm:text-[42px]"
										>
											{{ displayName }}
										</span>
										<UIcon
											name="i-lucide-chevron-down"
											class="size-4 shrink-0 text-white/70 transition-transform duration-200"
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
												class="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-slate-100 dark:hover:bg-slate-800"
												:class="{
													'bg-primary-100/60 text-primary-600 dark:bg-primary-500/20 dark:text-primary-200':
														item.value === selectedViewIdModel,
													'text-slate-600 dark:text-slate-300':
														item.value !== selectedViewIdModel,
												}"
												@click="selectServerView(item.value)"
											>
												<span class="min-w-0 flex-1 truncate">
													{{ item.label }}
												</span>
												<UIcon
													v-if="item.value === selectedViewIdModel"
													name="i-lucide-check"
													class="size-3.5 shrink-0"
												/>
											</button>
										</div>
									</template>
								</UPopover>
								<span
									v-else
									class="block max-w-full truncate text-3xl leading-[normal] font-arkpixel [text-shadow:rgba(0,0,0,0.7)_0px_0px_5px]"
								>
									{{ displayName }}
								</span>
								<UBadge
									v-if="displayPrimaryGroup"
									class="text-shadow-none sm:-translate-y-1"
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
								<div
									v-if="playTimeHoursLabel !== notAvailableLabel"
									class="flex items-baseline gap-1"
								>
									<UTooltip
										:text="playTimeTooltip"
										class="flex items-baseline gap-1"
									>
										<span class="text-xs text-white/80">
											{{ t('minecraftAccounts.summary.playTime') }}
										</span>
										<span class="text-[17px] font-medium">
											{{ playTimeHoursLabel }}
										</span>
									</UTooltip>
								</div>
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
					v-if="props.showBindAction"
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
import { getMinecraftBodyRendererUrl } from '~/utils/minecraft/body-renderer'
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

interface MinecraftAccountsContentProps {
	accounts: MinecraftAccountForm[]
	selectedAccount: MinecraftAccountForm | null
	savingId: string | null
	requireMapForSelector?: boolean
	showBindAction?: boolean
}

interface SummaryItem {
	key: string
	label: string
	value: string
	icon: string
}

const props = withDefaults(defineProps<MinecraftAccountsContentProps>(), {
	requireMapForSelector: false,
	showBindAction: true,
})

const emit = defineEmits<{
	save: [account: MinecraftAccountForm]
	bind: []
}>()

const { locale, t } = useI18n()
const selectedViewId = ref<string | null>(null)
const serverMenuOpen = ref(false)

const formatDateTime = (value: string | null): string =>
	formatMinecraftDateTime(
		value,
		locale.value,
		t('minecraftAccounts.fields.notAvailable'),
	)

const currentAccount = computed(() => props.selectedAccount)
const selectedServerView = computed<MinecraftAccountServerView | null>(() =>
	currentAccount.value
		? resolveServerViewSummary(currentAccount.value, selectedViewId.value)
		: null,
)

const selectedObservedPlayer = computed(() =>
	currentAccount.value
		? resolveObservedPlayerForServerView(
				currentAccount.value,
				selectedViewId.value,
			)
		: null,
)

const displayName = computed(
	() =>
		currentAccount.value?.playerIdentity.playerId ??
		currentAccount.value?.authmeRealname ??
		currentAccount.value?.username ??
		'',
)

const bodyRendererUrl = computed(() =>
	displayName.value ? getMinecraftBodyRendererUrl(displayName.value) : '',
)

const displayLocation = computed<MinecraftLocationSummary | null>(
	() =>
		selectedServerView.value?.presence?.lastSavedLocation ??
		selectedObservedPlayer.value?.lastSavedLocation ??
		currentAccount.value?.presence?.lastSavedLocation ??
		null,
)

const isAggregateViewSelected = computed(
	() => selectedServerView.value?.id === AGGREGATE_SERVER_VIEW_ID,
)

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

const displayPlayerProfile = computed(
	() =>
		selectedServerView.value?.playerProfile ??
		currentAccount.value?.playerProfile ?? {
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

const displayFirstJoinedAt = computed(() =>
	isAggregateViewSelected.value
		? (selectedServerView.value?.firstJoinedAt ??
			currentAccount.value?.firstJoinedAt ??
			null)
		: (selectedServerView.value?.firstJoinedAt ?? null),
)

const displayLastSeenAt = computed(() =>
	isAggregateViewSelected.value
		? (selectedServerView.value?.lastSeenAt ??
			currentAccount.value?.lastSeenAt ??
			null)
		: (selectedServerView.value?.lastSeenAt ?? null),
)

const displayPrimaryGroup = computed(
	() =>
		selectedServerView.value?.luckPermsPrimaryGroup ??
		selectedObservedPlayer.value?.luckPermsPrimaryGroup ??
		currentAccount.value?.luckPermsPrimaryGroup ??
		null,
)

const isOnline = computed(
	() =>
		selectedServerView.value?.online ??
		selectedObservedPlayer.value?.online ??
		currentAccount.value?.presence?.online ??
		false,
)

const notAvailableLabel = computed(() =>
	t('minecraftAccounts.fields.notAvailable'),
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

const serverViewItems = computed(() =>
	currentAccount.value
		? listServerViewItems(currentAccount.value, {
				aggregateLabel: t('minecraftAccounts.selector.aggregate'),
				noUuidLabel: t('minecraftAccounts.fields.noUuid'),
				requireMap: props.requireMapForSelector,
			})
		: [],
)
const showServerSelector = computed(() => serverViewItems.value.length > 1)

const selectedViewIdModel = computed<string>({
	get: () => selectedViewId.value ?? '',
	set: (value) => {
		selectedViewId.value = value || null
	},
})

const selectServerView = (value: string) => {
	selectedViewIdModel.value = value
	serverMenuOpen.value = false
}

watch(
	() => currentAccount.value?.id ?? null,
	() => {
		selectedViewId.value = currentAccount.value
			? getDefaultServerViewId(currentAccount.value)
			: null
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
</script>
