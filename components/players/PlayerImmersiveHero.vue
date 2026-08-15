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
			class="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-[46%] bg-linear-to-r from-slate-950/78 via-slate-950/38 to-transparent lg:block"
		/>
		<div
			class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[32%] bg-linear-to-t from-slate-950/68 via-slate-950/22 to-transparent"
		/>
		<div
			class="pointer-events-none absolute inset-x-0 top-0 z-10 h-64 bg-linear-to-b from-slate-950/45 to-transparent"
		/>
		<div
			class="immersive-site-shell pointer-events-none relative z-30 flex h-dvh flex-col pt-28 text-white lg:pt-44"
			:class="hasOverlayToolbar ? 'pb-20' : 'pb-10 lg:pb-14'"
		>
			<div
				class="pointer-events-auto absolute top-40 right-[clamp(1.5rem,3.5vw,4rem)] hidden lg:block"
			>
				<BlueMapOrientationControl
					:view="mapView"
					@align-north="presenceMapRef?.alignNorth()"
					@reset="presenceMapRef?.resetView()"
				/>
			</div>

			<PlayerImmersiveHeroDesktop
				v-model:server-menu-open="serverMenuOpen"
				:account="account"
				:selected-view-id="selectedViewId"
				:server-view-items="serverViewItems"
				:show-server-selector="showServerSelector"
				:display-name="displayName"
				:head-renderer-url="headRendererUrl"
				:is-online="isOnline"
				:display-primary-group="displayPrimaryGroup"
				:official-last-login="officialLastLogin"
				:official-registration="officialRegistration"
				:last-login-location-label="lastLoginLocationLabel"
				:last-login-details="lastLoginDetails"
				:ip-address-visible="ipAddressVisible"
				:coords-text="coordsText"
				:can-locate-player="canLocatePlayer"
				:registration-location-label="registrationLocationLabel"
				:registration-details="registrationDetails"
				:registration-ip-address-visible="registrationIpAddressVisible"
				:play-time-hours-label="playTimeHoursLabel"
				:not-available-label="notAvailableLabel"
				:play-time-tooltip="playTimeTooltip"
				:bound-portal-user="boundPortalUser"
				:bound-to-suffix="boundToSuffix"
				:summary-items="summaryItems"
				:accounts="switcherAccounts"
				:selected-account-id="effectiveSelectedAccountId"
				@select-server-view="selectServerView"
				@select-account="emit('selectAccount', $event)"
				@toggle-last-login-ip="ipAddressVisible = !ipAddressVisible"
				@toggle-registration-ip="
					registrationIpAddressVisible = !registrationIpAddressVisible
				"
				@focus-player="presenceMapRef?.focusPlayer()"
			/>

			<PlayerImmersiveHeroMobile
				v-model:server-menu-open="mobileServerMenuOpen"
				v-model:auth-me-modal-open="mobileAuthMeModalOpen"
				:account="account"
				:selected-view-id="selectedViewId"
				:server-view-items="serverViewItems"
				:show-server-selector="showServerSelector"
				:display-name="displayName"
				:head-renderer-url="headRendererUrl"
				:is-online="isOnline"
				:display-primary-group="displayPrimaryGroup"
				:coords-text="coordsText"
				:can-locate-player="canLocatePlayer"
				:play-time-hours-label="playTimeHoursLabel"
				:map-view="mapView"
				:bound-portal-user="boundPortalUser"
				:official-last-login="officialLastLogin"
				:official-registration="officialRegistration"
				:last-login-location-label="lastLoginLocationLabel"
				:registration-location-label="registrationLocationLabel"
				:mobile-summary-items="mobileSummaryItems"
				:auth-me-detail="mobileAuthMeDetail"
				:has-overlay-toolbar="hasOverlayToolbar ?? false"
				:accounts="switcherAccounts"
				:selected-account-id="effectiveSelectedAccountId"
				@select-server-view="selectServerView"
				@select-account="emit('selectAccount', $event)"
				@focus-player="presenceMapRef?.focusPlayer()"
				@align-north="presenceMapRef?.alignNorth()"
				@reset-view="presenceMapRef?.resetView()"
				@open-auth-me-detail="openMobileAuthMeDetail"
				@toggle-auth-me-ip="toggleMobileAuthMeIp"
			/>
		</div>
	</section>
</template>

<script setup lang="ts">
import PlayerImmersiveHeroDesktop from './PlayerImmersiveHeroDesktop.vue'
import PlayerImmersiveHeroMobile from './PlayerImmersiveHeroMobile.vue'
import type {
	PlayerImmersiveMobileAuthMeDetail,
	PlayerImmersiveSummaryItem,
} from './PlayerImmersiveHero.types'

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
	accounts?: MinecraftAccountForm[]
	selectedAccountId?: string | null
	hasOverlayToolbar?: boolean
	showBoundPortalUser?: boolean
}

const props = withDefaults(defineProps<PlayerImmersiveHeroProps>(), {
	accounts: () => [],
	selectedAccountId: null,
	showBoundPortalUser: true,
})
const emit = defineEmits<{
	selectAccount: [accountId: string]
}>()
const { locale, t } = useI18n()
const selectedViewId = ref<string | null>(null)
const serverMenuOpen = ref(false)
const mobileServerMenuOpen = ref(false)
const ipAddressVisible = ref(false)
const registrationIpAddressVisible = ref(false)
const mapView = ref<BlueMapViewChangedEventPayload>({
	x: 0,
	y: 0,
	z: 0,
	distance: 0,
	rotation: 0,
	angle: 0,
	tilt: 0,
})
const presenceMapRef = ref<{
	alignNorth: () => void
	focusPlayer: () => void
	resetView: () => void
} | null>(null)
const mobileAuthMeDetailKind = ref<
	PlayerImmersiveMobileAuthMeDetail['kind'] | null
>(null)

const switcherAccounts = computed(() => props.accounts ?? [])
const effectiveSelectedAccountId = computed(
	() => props.selectedAccountId ?? props.account.id,
)

const displayName = computed(
	() =>
		props.account.playerIdentity.playerId ??
		props.account.authmeRealname ??
		props.account.username,
)
const headRendererUrl = computed(() =>
	getMinecraftHeadRendererUrl(displayName.value),
)
const boundPortalUser = computed(() =>
	props.showBoundPortalUser === false
		? null
		: (props.account.boundPortalUser ?? null),
)
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
const mobileAuthMeDetail = computed<PlayerImmersiveMobileAuthMeDetail | null>(
	() => {
		if (mobileAuthMeDetailKind.value === 'lastLogin') {
			return {
				kind: 'lastLogin',
				title: t('minecraftAccounts.overlay.lastLogin'),
				location: lastLoginLocationLabel.value,
				ipAddress: lastLoginIpLabel.value,
				activityTime: formatAuthMeActivityTime(
					officialLastLogin.value?.at ?? null,
				),
				hasIpAddress: Boolean(officialLastLogin.value?.ipAddress),
				ipVisible: ipAddressVisible.value,
			}
		}

		if (mobileAuthMeDetailKind.value === 'registration') {
			return {
				kind: 'registration',
				title: t('minecraftAccounts.overlay.registration'),
				location: registrationLocationLabel.value,
				ipAddress: registrationIpLabel.value,
				activityTime: formatAuthMeActivityTime(
					officialRegistration.value?.at ?? null,
				),
				hasIpAddress: Boolean(officialRegistration.value?.ipAddress),
				ipVisible: registrationIpAddressVisible.value,
			}
		}

		return null
	},
)
const mobileAuthMeModalOpen = computed({
	get: () => mobileAuthMeDetailKind.value !== null,
	set: (open: boolean) => {
		if (!open) mobileAuthMeDetailKind.value = null
	},
})

const openMobileAuthMeDetail = (
	kind: PlayerImmersiveMobileAuthMeDetail['kind'],
) => {
	mobileAuthMeDetailKind.value = kind
}

const toggleMobileAuthMeIp = () => {
	if (mobileAuthMeDetail.value?.kind === 'lastLogin') {
		ipAddressVisible.value = !ipAddressVisible.value
		return
	}

	if (mobileAuthMeDetail.value?.kind === 'registration') {
		registrationIpAddressVisible.value = !registrationIpAddressVisible.value
	}
}
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
const summaryItems = computed<PlayerImmersiveSummaryItem[]>(() => [
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
const mobileSummaryItems = computed(() => {
	const preferredOrder = [
		'advancements',
		'distance',
		'deaths',
		'leave-count',
		'last-seen',
		'first-joined',
	]
	return preferredOrder.flatMap((key) => {
		const item = summaryItems.value.find((candidate) => candidate.key === key)
		return item ? [item] : []
	})
})
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
	mobileServerMenuOpen.value = false
}

watch(
	() => props.account.id,
	() => {
		ipAddressVisible.value = false
		registrationIpAddressVisible.value = false
		mobileAuthMeDetailKind.value = null
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
</script>
