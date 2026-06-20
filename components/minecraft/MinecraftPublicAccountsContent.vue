<template>
	<div>
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
			<div class="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
				<div
					class="relative min-w-0"
					:class="skinRendererUrl ? 'min-h-0 sm:min-h-[184px]' : ''"
				>
					<div
						v-if="skinRendererUrl"
						class="mb-4 w-[116px] sm:absolute sm:left-0 sm:top-1/2 sm:mb-0 sm:w-[128px] sm:-translate-y-1/2 lg:-left-2 lg:w-[140px]"
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
						class="flex min-h-full min-w-0 items-end"
						:class="skinRendererUrl ? 'pl-0 sm:pl-[112px] lg:pl-[124px]' : ''"
					>
						<div class="flex min-w-0 flex-1 flex-col gap-3">
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-2">
									<UPopover
										v-if="hasMultipleUuidOptions"
										v-model:open="uuidMenuOpen"
										:popper="{ placement: 'bottom-start' }"
									>
										<button
											type="button"
											class="inline-flex min-w-0 items-center gap-1.5 text-left text-3xl font-arkpixel leading-none text-slate-900 transition hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-white dark:hover:text-white/85"
											:aria-label="displayName"
										>
											<span class="truncate leading-[normal]">
												{{ displayName }}
											</span>
											<UIcon
												name="i-lucide-chevron-down"
												class="mt-0.5 size-4 shrink-0 text-slate-500 dark:text-white/60"
											/>
										</button>

										<template #content>
											<div
												class="w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg grid gap-1 p-1.5"
											>
												<button
													v-for="item in uuidItems"
													:key="item.value"
													type="button"
													class="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-slate-100 dark:hover:bg-slate-800"
													:class="{
														'bg-primary-100/60 text-primary-600 dark:bg-primary-500/20 dark:text-primary-200':
															item.value === selectedUuidModel,
														'text-slate-600 dark:text-slate-300':
															item.value !== selectedUuidModel,
													}"
													@click="selectUuid(item.value)"
												>
													<span class="min-w-0 flex-1 truncate">
														{{ item.label }}
													</span>
													<UIcon
														v-if="item.value === selectedUuidModel"
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
								</div>
								<div
									class="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-2 text-slate-900 dark:text-white"
								>
									<div class="flex items-baseline gap-1">
										<span class="text-xs text-slate-500 dark:text-white/80">
											{{ t('minecraftAccounts.overlay.lastLogin') }}
										</span>
										<span
											class="text-slate-700 dark:text-white/90 text-[17px] font-medium"
										>
											{{ coordsText }}
										</span>
									</div>
									<div class="flex items-baseline gap-1">
										<UTooltip
											v-if="playTimeHoursLabel !== notAvailableLabel"
											:text="playTimeTooltip"
											class="flex items-baseline gap-1"
										>
											<span class="text-xs text-slate-500 dark:text-white/80">
												{{ t('minecraftAccounts.summary.playTime') }}
											</span>
											<span
												class="text-slate-700 dark:text-white/90 text-[17px] font-medium"
											>
												{{ playTimeHoursLabel }}
											</span>
										</UTooltip>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="hidden shrink-0 lg:flex lg:items-center">
					<div
						class="grid gap-1.5 text-right text-[11px] text-slate-700 dark:text-white/90"
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
	</div>
</template>

<script setup lang="ts">
import { getMinecraftSkinRendererUrl } from '~/utils/minecraft/body-renderer'
import {
	formatMinecraftDateTime,
	getDefaultObservedPlayerUuid,
	resolveObservedPlayerSummary,
	type MinecraftAccountForm,
	type MinecraftLocationSummary,
} from '~/utils/minecraft/accounts'

interface MinecraftPublicAccountsContentProps {
	account: MinecraftAccountForm
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

const props = defineProps<MinecraftPublicAccountsContentProps>()

const { locale, t } = useI18n()
const localePath = useLocalePath()
const selectedUuid = ref<string | null>(null)
const uuidMenuOpen = ref(false)
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

const formatDateTime = (value: string | null): string =>
	formatMinecraftDateTime(
		value,
		locale.value,
		t('minecraftAccounts.fields.notAvailable'),
	)

const selectedObservedPlayer = computed(() =>
	resolveObservedPlayerSummary(props.account, selectedUuid.value),
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
		return {
			hue: 0,
			saturation: 0,
			lightness,
		}
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
		return {
			r: channel,
			g: channel,
			b: channel,
		}
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

const displayLocation = computed<MinecraftLocationSummary | null>(
	() =>
		selectedObservedPlayer.value?.lastSavedLocation ??
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

const displayFirstJoinedAt = computed(
	() =>
		selectedObservedPlayer.value?.playerProfile.firstPlayedAt ??
		props.account.firstJoinedAt ??
		null,
)

const displayLastSeenAt = computed(
	() =>
		selectedObservedPlayer.value?.playerProfile.lastPlayedAt ??
		selectedObservedPlayer.value?.lastSeenAt ??
		props.account.lastSeenAt ??
		null,
)

const displayPlayerProfile = computed(
	() =>
		selectedObservedPlayer.value?.playerProfile ??
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

const notAvailableLabel = computed(() =>
	t('minecraftAccounts.fields.notAvailable'),
)

const displayPrimaryGroup = computed(
	() =>
		selectedObservedPlayer.value?.luckPermsPrimaryGroup ??
		props.account.luckPermsPrimaryGroup ??
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
	props.account.playerIdentity.observedPlayers.map((player) => ({
		label: player.uuid,
		value: player.uuid,
	})),
)

const hasMultipleUuidOptions = computed(() => uuidItems.value.length > 1)

const selectedUuidModel = computed<string>({
	get: () => selectedUuid.value ?? '',
	set: (value) => {
		selectedUuid.value = value || null
	},
})

const selectUuid = (value: string) => {
	selectedUuidModel.value = value
	uuidMenuOpen.value = false
}

watch(
	() => props.account.id,
	() => {
		selectedUuid.value = getDefaultObservedPlayerUuid(props.account)
		uuidMenuOpen.value = false
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

onMounted(() => {
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
