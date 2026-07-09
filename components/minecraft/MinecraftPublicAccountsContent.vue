<template>
	<section
		class="relative overflow-hidden rounded-lg border border-slate-200 bg-white/95 px-5 py-6 dark:border-slate-800 dark:bg-slate-950/95 sm:px-6"
	>
		<div class="absolute inset-0" :style="cardAccentWashStyle" />
		<div
			class="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-white/80 via-white/20 to-transparent dark:from-white/6 dark:via-transparent"
		/>
		<div
			class="absolute -right-10 -top-10 size-40 rounded-full blur-3xl"
			:style="cardAccentGlowStyle"
		/>

		<div
			class="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
		>
			<div class="flex flex-col sm:flex-row relative h-full min-w-0">
				<div
					v-if="skinRendererUrl"
					class="mb-4 w-[104px] sm:absolute sm:left-0 sm:top-1/2 sm:mb-0 sm:w-[116px] sm:-translate-y-1/2 lg:w-[128px]"
				>
					<NuxtLink
						v-if="playerProfileHref"
						:to="playerProfileHref"
						class="block transition-opacity hover:opacity-70"
					>
						<MinecraftSkinViewer
							:skin-url="skinRendererUrl"
							viewer-class="aspect-[2/3] w-full drop-shadow-sm"
						/>
					</NuxtLink>
					<MinecraftSkinViewer
						v-else
						:skin-url="skinRendererUrl"
						viewer-class="aspect-[2/3] w-full drop-shadow-sm"
					/>
				</div>

				<div
					class="flex min-w-0 items-end mt-auto"
					:class="skinRendererUrl ? 'pl-0 sm:pl-32' : ''"
				>
					<div class="flex min-w-0 flex-1 flex-col gap-3">
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2">
								<UPopover
									v-if="showServerSelector"
									v-model:open="serverMenuOpen"
									:popper="{ placement: 'bottom-start' }"
								>
									<button
										type="button"
										class="group inline-flex min-w-0 max-w-full items-center gap-1 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
										:class="showServerSelector ? 'hover:opacity-70' : ''"
										:aria-label="displayName"
									>
										<span
											class="truncate text-3xl font-arkpixel leading-[normal] text-slate-900 dark:text-white"
										>
											{{ displayName }}
										</span>
										<UIcon
											name="i-lucide-chevron-down"
											class="size-4 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400"
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
									class="truncate text-3xl font-arkpixel leading-[normal] text-slate-900 dark:text-white"
								>
									{{ displayName }}
								</span>
								<UBadge
									v-if="displayPrimaryGroup"
									color="neutral"
									variant="solid"
									size="xs"
								>
									{{ displayPrimaryGroup }}
								</UBadge>
								<UBadge
									v-if="account.identityKind === 'HISTORICAL'"
									color="warning"
									variant="solid"
									size="xs"
								>
									{{ t('minecraftAccounts.kinds.historical') }}
								</UBadge>
							</div>

							<div
								class="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-2 text-slate-900 dark:text-white"
							>
								<div
									v-if="shouldShowCoordinates"
									class="flex items-baseline gap-1"
								>
									<span class="text-xs text-slate-500 dark:text-white/80">
										{{ t('minecraftAccounts.overlay.lastLogin') }}
									</span>
									<span
										class="text-slate-700 text-[17px] font-medium dark:text-white/90"
									>
										{{ coordsText }}
									</span>
								</div>
								<div class="flex items-baseline gap-1">
									<span class="text-xs text-slate-500 dark:text-white/80">
										{{ t('minecraftAccounts.summary.playTime') }}
									</span>
									<UTooltip
										v-if="playTimeHoursLabel !== notAvailableLabel"
										:text="playTimeTooltip"
									>
										<span
											class="text-slate-700 text-[17px] font-medium dark:text-white/90"
										>
											{{ playTimeHoursLabel }}
										</span>
									</UTooltip>
									<span
										v-else
										class="text-slate-700 text-[17px] font-medium dark:text-white/90"
									>
										{{ playTimeHoursLabel }}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="hidden shrink-0 lg:flex lg:h-full lg:flex-col">
				<div
					class="mt-auto grid gap-1.5 text-right text-[11px] text-slate-700 dark:text-white/90"
				>
					<div
						v-for="item in summaryItems"
						:key="item.key"
						class="flex items-baseline justify-end gap-2"
					>
						<span
							class="inline-flex items-baseline gap-1 text-slate-500 dark:text-white/70"
						>
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

		<div v-if="isMobileViewport" class="relative mt-3 sm:hidden">
			<Transition name="stats-fade" mode="out-in">
				<div
					:key="statsCarouselIndex"
					class="inline-flex items-baseline gap-1.5 text-xs text-slate-700 dark:text-white/90"
				>
					<span
						class="inline-flex items-baseline gap-1 text-slate-500 dark:text-white/70"
					>
						<UIcon :name="currentStat.icon" class="size-3 translate-y-0.5" />
						{{ currentStat.label }}
					</span>
					<span class="text-[17px] font-medium">
						{{ currentStat.value }}
					</span>
				</div>
			</Transition>
		</div>
	</section>
</template>

<script setup lang="ts">
import { getMinecraftSkinRendererUrl } from '~/utils/minecraft/body-renderer'
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

interface MinecraftPublicAccountsContentProps {
	account: MinecraftAccountForm
	showCoordinates?: boolean
	requireMapForSelector?: boolean
	fixedServerViewId?: string | null
}

interface SummaryItem {
	key: string
	label: string
	value: string
	icon: string
}

interface RgbColor {
	r: number
	g: number
	b: number
}

const props = withDefaults(defineProps<MinecraftPublicAccountsContentProps>(), {
	showCoordinates: false,
	requireMapForSelector: false,
	fixedServerViewId: null,
})

const { locale, t } = useI18n()
const localePath = useLocalePath()
const selectedViewId = ref<string | null>(null)
const serverMenuOpen = ref(false)
const isMobileViewport = ref(false)
const DEFAULT_SKIN_ACCENT: Readonly<RgbColor> = {
	r: 124,
	g: 149,
	b: 173,
}
const skinAccentColor = ref<RgbColor>({
	...DEFAULT_SKIN_ACCENT,
})
let mobileViewportMediaQuery: MediaQueryList | null = null
let skinAccentLoadToken = 0
let statsCarouselTimer: ReturnType<typeof setInterval> | null = null

const formatDateTime = (value: string | null): string =>
	formatMinecraftDateTime(
		value,
		locale.value,
		t('minecraftAccounts.fields.notAvailable'),
	)

const effectiveSelectedViewId = computed(
	() => props.fixedServerViewId ?? selectedViewId.value,
)
const selectedServerView = computed<MinecraftAccountServerView | null>(() =>
	resolveServerViewSummary(props.account, effectiveSelectedViewId.value),
)
const selectedObservedPlayer = computed(() =>
	resolveObservedPlayerForServerView(
		props.account,
		effectiveSelectedViewId.value,
	),
)
const defaultServerViewId = computed(() =>
	getDefaultServerViewId(props.account),
)
const isHistoricalAccount = computed(
	() => props.account.identityKind === 'HISTORICAL',
)

const displayName = computed(
	() =>
		props.account.playerIdentity.playerId ??
		props.account.authmeRealname ??
		props.account.username ??
		'',
)

const skinRendererUrl = computed(() =>
	displayName.value ? getMinecraftSkinRendererUrl(displayName.value) : '',
)

const playerProfileHref = computed(() => {
	const mcid = props.account.playerIdentity.playerId?.trim()
	return mcid ? localePath(`/players/${mcid}`) : ''
})

const isAggregateViewSelected = computed(
	() => selectedServerView.value?.id === AGGREGATE_SERVER_VIEW_ID,
)

const coordinateSourceViewId = computed(() => {
	if (!isHistoricalAccount.value && isAggregateViewSelected.value) {
		return defaultServerViewId.value
	}

	return effectiveSelectedViewId.value
})

const coordinateSourceServerView = computed<MinecraftAccountServerView | null>(
	() => resolveServerViewSummary(props.account, coordinateSourceViewId.value),
)
const coordinateSourceObservedPlayer = computed(() =>
	resolveObservedPlayerForServerView(
		props.account,
		coordinateSourceViewId.value,
	),
)

const shouldShowCoordinates = computed(() => {
	if (props.showCoordinates) {
		return true
	}

	if (!isHistoricalAccount.value) {
		return true
	}

	return !isAggregateViewSelected.value
})

const displayLocation = computed<MinecraftLocationSummary | null>(
	() =>
		coordinateSourceServerView.value?.presence?.lastSavedLocation ??
		coordinateSourceObservedPlayer.value?.lastSavedLocation ??
		props.account.presence?.lastSavedLocation ??
		null,
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
const displayPlayerProfile = computed(
	() =>
		selectedServerView.value?.playerProfile ??
		props.account.playerProfile ?? {
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
const displayPrimaryGroup = computed(
	() =>
		selectedServerView.value?.luckPermsPrimaryGroup ??
		selectedObservedPlayer.value?.luckPermsPrimaryGroup ??
		props.account.luckPermsPrimaryGroup ??
		null,
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
	listServerViewItems(props.account, {
		locale: locale.value,
		aggregateLabel: t('minecraftAccounts.selector.aggregate'),
		noUuidLabel: t('minecraftAccounts.fields.noUuid'),
		requireMap: props.requireMapForSelector,
	}),
)
const showServerSelector = computed(
	() => !props.fixedServerViewId && serverViewItems.value.length > 1,
)

const selectedViewIdModel = computed<string>({
	get: () => effectiveSelectedViewId.value ?? '',
	set: (value) => {
		selectedViewId.value = value || null
	},
})

const selectServerView = (value: string) => {
	selectedViewIdModel.value = value
	serverMenuOpen.value = false
}

const statsCarouselIndex = ref(0)
const currentStat = computed(
	() =>
		summaryItems.value[statsCarouselIndex.value] ??
		summaryItems.value[0] ?? { key: '', label: '', value: '', icon: '' },
)

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
	}, 3000)
}

const skinAccentRgbText = computed(
	() =>
		`${skinAccentColor.value.r}, ${skinAccentColor.value.g}, ${skinAccentColor.value.b}`,
)

const cardAccentWashStyle = computed(() => ({
	background: `linear-gradient(135deg, rgba(255, 255, 255, 0) 34%, rgba(${skinAccentRgbText.value}, 0.055) 100%)`,
}))

const cardAccentGlowStyle = computed(() => ({
	backgroundColor: `rgba(${skinAccentRgbText.value}, 0.12)`,
	opacity: '0.72',
}))

const clampColorChannel = (value: number): number =>
	Math.min(255, Math.max(0, Math.round(value)))

const rgbToHsl = ({ r, g, b }: RgbColor) => {
	const red = r / 255
	const green = g / 255
	const blue = b / 255
	const max = Math.max(red, green, blue)
	const min = Math.min(red, green, blue)
	const lightness = (max + min) / 2

	if (max === min) {
		return { hue: 0, saturation: 0, lightness }
	}

	const delta = max - min
	const saturation =
		lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)

	let hue = 0
	switch (max) {
		case red:
			hue = (green - blue) / delta + (green < blue ? 6 : 0)
			break
		case green:
			hue = (blue - red) / delta + 2
			break
		default:
			hue = (red - green) / delta + 4
			break
	}

	return {
		hue: hue / 6,
		saturation,
		lightness,
	}
}

const hueToRgb = (p: number, q: number, t: number): number => {
	let channel = t
	if (channel < 0) {
		channel += 1
	}
	if (channel > 1) {
		channel -= 1
	}
	if (channel < 1 / 6) {
		return p + (q - p) * 6 * channel
	}
	if (channel < 1 / 2) {
		return q
	}
	if (channel < 2 / 3) {
		return p + (q - p) * (2 / 3 - channel) * 6
	}
	return p
}

const hslToRgb = ({
	hue,
	saturation,
	lightness,
}: {
	hue: number
	saturation: number
	lightness: number
}): RgbColor => {
	if (saturation === 0) {
		const channel = clampColorChannel(lightness * 255)
		return { r: channel, g: channel, b: channel }
	}

	const q =
		lightness < 0.5
			? lightness * (1 + saturation)
			: lightness + saturation - lightness * saturation
	const p = 2 * lightness - q

	return {
		r: clampColorChannel(hueToRgb(p, q, hue + 1 / 3) * 255),
		g: clampColorChannel(hueToRgb(p, q, hue) * 255),
		b: clampColorChannel(hueToRgb(p, q, hue - 1 / 3) * 255),
	}
}

const normalizeAccentColor = (color: RgbColor): RgbColor => {
	const hsl = rgbToHsl(color)
	return hslToRgb({
		hue: hsl.hue,
		saturation: Math.max(hsl.saturation, 0.28),
		lightness: Math.min(Math.max(hsl.lightness, 0.5), 0.68),
	})
}

const getPixelWeight = (r: number, g: number, b: number): number => {
	const red = r / 255
	const green = g / 255
	const blue = b / 255
	const max = Math.max(red, green, blue)
	const min = Math.min(red, green, blue)
	const delta = max - min
	const lightness = (max + min) / 2
	const vividness = delta

	if (lightness < 0.08 || lightness > 0.92 || vividness < 0.04) {
		return 0
	}

	return 0.35 + vividness * 0.9 + (0.5 - Math.abs(lightness - 0.5)) * 0.4
}

const extractAccentColorFromSkin = (image: HTMLImageElement): RgbColor => {
	const canvas = document.createElement('canvas')
	const width = image.naturalWidth || image.width || 64
	const height = image.naturalHeight || image.height || 64
	canvas.width = width
	canvas.height = height

	const context = canvas.getContext('2d', {
		willReadFrequently: true,
	})
	if (!context) {
		return { ...DEFAULT_SKIN_ACCENT }
	}

	context.drawImage(image, 0, 0, width, height)
	const { data } = context.getImageData(0, 0, width, height)
	let weightedRed = 0
	let weightedGreen = 0
	let weightedBlue = 0
	let totalWeight = 0
	let fallbackRed = 0
	let fallbackGreen = 0
	let fallbackBlue = 0
	let fallbackCount = 0

	for (let index = 0; index < data.length; index += 16) {
		const red = data[index] ?? 0
		const green = data[index + 1] ?? 0
		const blue = data[index + 2] ?? 0
		const alpha = data[index + 3] ?? 0

		if (alpha < 96) {
			continue
		}

		fallbackRed += red
		fallbackGreen += green
		fallbackBlue += blue
		fallbackCount += 1

		const weight = getPixelWeight(red, green, blue)
		if (weight <= 0) {
			continue
		}

		weightedRed += red * weight
		weightedGreen += green * weight
		weightedBlue += blue * weight
		totalWeight += weight
	}

	if (totalWeight > 0) {
		return normalizeAccentColor({
			r: weightedRed / totalWeight,
			g: weightedGreen / totalWeight,
			b: weightedBlue / totalWeight,
		})
	}

	if (fallbackCount > 0) {
		return normalizeAccentColor({
			r: fallbackRed / fallbackCount,
			g: fallbackGreen / fallbackCount,
			b: fallbackBlue / fallbackCount,
		})
	}

	return { ...DEFAULT_SKIN_ACCENT }
}

const loadSkinAccentColor = async (skinUrl: string): Promise<void> => {
	if (!import.meta.client) {
		return
	}

	const currentToken = ++skinAccentLoadToken

	if (!skinUrl) {
		skinAccentColor.value = { ...DEFAULT_SKIN_ACCENT }
		return
	}

	try {
		const image = await new Promise<HTMLImageElement>((resolve, reject) => {
			const element = new Image()
			element.crossOrigin = 'anonymous'
			element.decoding = 'async'
			element.onload = () => resolve(element)
			element.onerror = () => reject(new Error('Failed to load minecraft skin'))
			element.src = skinUrl
		})

		if (currentToken !== skinAccentLoadToken) {
			return
		}

		skinAccentColor.value = extractAccentColorFromSkin(image)
	} catch {
		if (currentToken !== skinAccentLoadToken) {
			return
		}

		skinAccentColor.value = { ...DEFAULT_SKIN_ACCENT }
	}
}

const syncMobileViewportState = () => {
	isMobileViewport.value = mobileViewportMediaQuery?.matches ?? false
}

watch(
	() => props.account.id,
	() => {
		selectedViewId.value = getDefaultServerViewId(props.account)
	},
	{ immediate: true },
)

watch(
	[serverViewItems, () => props.fixedServerViewId],
	(items) => {
		const [serverItems, fixedServerViewId] = items
		if (fixedServerViewId) {
			selectedViewId.value = null
			return
		}

		if (!serverItems.length) {
			selectedViewId.value = null
			return
		}

		if (!serverItems.some((item) => item.value === selectedViewId.value)) {
			selectedViewId.value = serverItems[0]?.value ?? null
		}
	},
	{ immediate: true },
)

watch(
	skinRendererUrl,
	(skinUrl) => {
		void loadSkinAccentColor(skinUrl)
	},
	{ immediate: true },
)

watch(summaryItems, (items) => {
	if (statsCarouselIndex.value >= items.length) {
		statsCarouselIndex.value = 0
	}

	startStatsCarousel()
})

watch(isMobileViewport, () => {
	startStatsCarousel()
})

onMounted(() => {
	if (import.meta.client) {
		mobileViewportMediaQuery = window.matchMedia('(max-width: 639px)')
		syncMobileViewportState()
		mobileViewportMediaQuery.addEventListener('change', syncMobileViewportState)
	}

	startStatsCarousel()
})

onBeforeUnmount(() => {
	stopStatsCarousel()
	mobileViewportMediaQuery?.removeEventListener(
		'change',
		syncMobileViewportState,
	)
	mobileViewportMediaQuery = null
})
</script>

<style scoped>
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
</style>
