<template>
	<div class="pt-3 lg:pt-0 flex min-h-0 flex-1 flex-col lg:hidden">
		<div
			class="player-immersive-panel pointer-events-none [text-shadow:rgba(0,0,0,0.78)_0_1px_6px]"
		>
			<div class="flex min-w-0 items-center gap-3">
				<SkeletonImage
					:src="headRendererUrl"
					:alt="displayName"
					class="size-14 shrink-0"
					skeleton-class="rounded-xl bg-white/12"
					image-class="size-14 object-contain drop-shadow-lg"
					loading="eager"
				/>

				<div class="min-w-0 flex-1">
					<UPopover
						v-if="showServerSelector"
						:open="serverMenuOpen"
						:popper="{ placement: 'bottom-start' }"
						@update:open="emit('update:serverMenuOpen', $event)"
					>
						<button
							type="button"
							class="group pointer-events-auto inline-flex max-w-full cursor-pointer items-center gap-1 text-left transition-opacity hover:opacity-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
							:aria-label="displayName"
						>
							<span class="truncate text-[22px] leading-tight font-arkpixel">
								{{ displayName }}
							</span>
							<UIcon
								name="i-lucide-chevron-down"
								class="size-3.5 shrink-0 text-white/72 transition-transform duration-250"
								:class="serverMenuOpen ? 'rotate-180' : ''"
							/>
						</button>

						<template #content>
							<div
								class="grid w-72 max-w-[calc(100vw-2rem)] gap-1 overflow-hidden rounded-lg p-1.5"
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
									@click="emit('selectServerView', item.value)"
								>
									<span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
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
						class="block truncate text-[22px] leading-tight font-arkpixel"
					>
						{{ displayName }}
					</span>

					<div class="mt-1.5 flex min-w-0 flex-wrap gap-1.5">
						<UBadge
							class="gap-1 px-1.5 py-0.5 text-[10px] text-shadow-none"
							:color="isOnline ? 'success' : 'neutral'"
							:variant="isOnline ? 'solid' : 'soft'"
						>
							<span
								class="block size-1.5 rounded-full bg-white ring-1 ring-black/20"
							/>
							{{
								isOnline
									? t('minecraftAccounts.identity.online')
									: t('minecraftAccounts.identity.offline')
							}}
						</UBadge>
						<UBadge
							v-if="account.isPrimary"
							class="px-1.5 py-0.5 text-[10px] text-shadow-none"
							color="primary"
							variant="solid"
						>
							{{ t('minecraftAccounts.badges.primary') }}
						</UBadge>
						<UBadge
							v-if="account.identityKind === 'HISTORICAL'"
							class="!bg-amber-500 !text-white px-1.5 py-0.5 text-[10px] text-shadow-none"
							variant="solid"
						>
							{{ t('minecraftAccounts.kinds.historical') }}
						</UBadge>
						<UBadge
							v-if="displayPrimaryGroup"
							variant="solid"
							class="px-1.5 py-0.5 text-[10px] uppercase text-shadow-none"
							color="neutral"
						>
							{{ displayPrimaryGroup }}
						</UBadge>
					</div>
				</div>
			</div>

			<Transition name="player-view-switch" mode="out-in">
				<div
					:key="`mobile-location-${account.id}-${selectedViewId ?? 'default'}`"
					class="mt-4 grid w-fit gap-1.5 text-xs"
				>
					<div class="flex items-center gap-1.5">
						<UIcon name="i-lucide-map-pin" class="size-3.5 text-white/68" />
						<span class="text-white/68">
							{{ t('minecraftAccounts.overlay.lastLocation') }}
						</span>
						<span class="text-sm font-medium">{{ coordsText }}</span>
						<UButton
							v-if="canLocatePlayer"
							type="button"
							color="neutral"
							variant="link"
							class="pointer-events-auto cursor-pointer px-0"
							size="xs"
							:aria-label="t('minecraftAccounts.overlay.locatePlayer')"
							@click="emit('focusPlayer')"
						>
							<UIcon name="i-lucide-locate-fixed" class="size-3.5" />
						</UButton>
					</div>
					<div class="flex items-center gap-1.5">
						<UIcon name="i-lucide-clock-3" class="size-3.5 text-white/68" />
						<span class="text-white/68">
							{{ t('minecraftAccounts.summary.playTime') }}
						</span>
						<span class="text-sm font-medium">{{ playTimeHoursLabel }}</span>
					</div>
					<PlayerImmersiveAccountSwitcher
						v-if="accounts.length > 1"
						class="mt-1"
						:accounts="accounts"
						:selected-account-id="selectedAccountId"
						@select-account="emit('selectAccount', $event)"
					/>
				</div>
			</Transition>
		</div>

		<div
			class="pointer-events-auto absolute right-6"
			:class="hasOverlayToolbar ? 'bottom-54' : 'bottom-44'"
		>
			<BlueMapOrientationControl
				:view="mapView"
				@align-north="emit('alignNorth')"
				@reset="emit('resetView')"
			/>
		</div>

		<Transition name="player-view-switch" mode="out-in">
			<div
				:key="`mobile-data-${account.id}-${selectedViewId ?? 'default'}`"
				class="pointer-events-auto mt-auto -mx-6"
			>
				<div
					ref="mobileDataRailRef"
					class="mobile-player-data-rail flex gap-2 overflow-x-auto px-6 pt-2 pb-1"
					@scroll.passive="syncMobileDataScrollProgress"
				>
					<button
						v-if="officialLastLogin"
						type="button"
						class="mobile-player-data-card pointer-events-auto flex size-28 shrink-0 cursor-pointer flex-col items-center justify-center rounded-2xl border border-white/18 bg-slate-900/78 p-2.5 text-center backdrop-blur-sm transition-colors hover:bg-slate-900/88"
						@click="emit('openAuthMeDetail', 'lastLogin')"
					>
						<UIcon name="i-lucide-log-in" class="size-5 text-white/82" />
						<span class="mt-1 text-[10px] leading-tight text-white/64">
							{{ t('minecraftAccounts.overlay.lastLogin') }}
						</span>
						<span class="mt-0.5 max-w-full line-clamp-2 text-xs font-medium">
							{{ lastLoginLocationLabel }}
						</span>
					</button>

					<button
						v-if="officialRegistration"
						type="button"
						class="mobile-player-data-card pointer-events-auto flex size-28 shrink-0 cursor-pointer flex-col items-center justify-center rounded-2xl border border-white/18 bg-slate-900/78 p-2.5 text-center backdrop-blur-sm transition-colors hover:bg-slate-900/88"
						@click="emit('openAuthMeDetail', 'registration')"
					>
						<UIcon
							name="i-lucide-user-round-plus"
							class="size-5 text-white/82"
						/>
						<span class="mt-1 text-[10px] leading-tight text-white/64">
							{{ t('minecraftAccounts.overlay.registration') }}
						</span>
						<span class="mt-0.5 max-w-full line-clamp-2 text-xs font-medium">
							{{ registrationLocationLabel }}
						</span>
					</button>

					<NuxtLink
						v-if="boundPortalUser"
						:to="localePath(`/u/${boundPortalUser.username}`)"
						class="mobile-player-data-card pointer-events-auto flex size-28 shrink-0 cursor-pointer flex-col items-center justify-center rounded-2xl border border-white/18 bg-slate-900/78 p-3 text-center backdrop-blur-sm transition-colors hover:bg-slate-900/58"
					>
						<UAvatar
							:src="boundPortalUser.avatarUrl || undefined"
							:alt="boundPortalUser.username"
							size="sm"
							:text="boundPortalUser.username.slice(0, 1).toUpperCase()"
						/>
						<span class="mt-1.5 text-[10px] text-white/64">
							{{ t('minecraftAccounts.overlay.boundAccount') }}
						</span>
						<span class="mt-0.5 max-w-full truncate text-sm font-medium">
							{{ boundPortalUser.username }}
						</span>
					</NuxtLink>

					<div
						v-for="item in mobileSummaryItems"
						:key="item.key"
						class="mobile-player-data-card flex size-28 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/18 bg-slate-900/78 p-3 text-center backdrop-blur-sm"
					>
						<UIcon :name="item.icon" class="size-5 text-white/82" />
						<span class="mt-1.5 text-[10px] leading-tight text-white/64">
							{{ item.label }}
						</span>
						<span class="mt-1 text-sm leading-tight font-medium">
							{{ item.value }}
						</span>
					</div>
				</div>

				<div class="flex justify-center px-6 pt-1">
					<input
						type="range"
						min="0"
						max="1000"
						step="1"
						:value="mobileDataScrollProgress"
						class="mobile-player-data-scrubber h-4 w-20 cursor-ew-resize"
						:aria-label="t('minecraftAccounts.overlay.scrollData')"
						@input="handleMobileDataScrubberInput"
						@change="snapMobileDataRailToNearestCard"
					/>
				</div>
			</div>
		</Transition>

		<UModal
			:open="authMeModalOpen"
			:title="authMeDetail?.title"
			:ui="{ content: 'max-w-sm' }"
			@update:open="emit('update:authMeModalOpen', $event)"
		>
			<template #body>
				<div v-if="authMeDetail" class="grid gap-4">
					<div
						class="flex items-center gap-3 rounded-xl bg-slate-100 p-3 dark:bg-slate-900"
					>
						<UIcon :name="authMeDetail.icon" class="size-5 shrink-0" />
						<div class="min-w-0">
							<div class="text-xs text-slate-500 dark:text-slate-400">
								{{ t('minecraftAccounts.overlay.ipLocation') }}
							</div>
							<div
								class="mt-0.5 truncate font-medium text-slate-900 dark:text-white"
							>
								{{ authMeDetail.location }}
							</div>
						</div>
					</div>

					<div class="grid gap-3 text-sm">
						<div class="grid grid-cols-[5rem_1fr] items-center gap-3">
							<span class="text-slate-500 dark:text-slate-400">
								{{ t('minecraftAccounts.overlay.ipAddress') }}
							</span>
							<div class="flex min-w-0 items-center gap-1">
								<span
									class="min-w-0 truncate font-medium text-slate-900 dark:text-white"
								>
									{{ authMeDetail.ipAddress }}
								</span>
								<UButton
									v-if="authMeDetail.hasIpAddress"
									type="button"
									color="neutral"
									variant="ghost"
									size="xs"
									class="shrink-0 cursor-pointer"
									:aria-label="
										authMeDetail.ipVisible
											? t('minecraftAccounts.overlay.hideIp')
											: t('minecraftAccounts.overlay.showIp')
									"
									@click="emit('toggleAuthMeIp')"
								>
									<UIcon
										:name="
											authMeDetail.ipVisible
												? 'i-lucide-eye-off'
												: 'i-lucide-eye'
										"
										class="size-4"
									/>
								</UButton>
							</div>
						</div>
						<div class="grid grid-cols-[5rem_1fr] items-center gap-3">
							<span class="text-slate-500 dark:text-slate-400">
								{{ t('minecraftAccounts.overlay.activityTime') }}
							</span>
							<span class="font-medium text-slate-900 dark:text-white">
								{{ authMeDetail.activityTime }}
							</span>
						</div>
					</div>
				</div>
			</template>
		</UModal>
	</div>
</template>

<script setup lang="ts">
import type { BlueMapViewChangedEventPayload } from '~/utils/map'
import type { MinecraftAccountForm } from '~/utils/minecraft/accounts'

import type {
	PlayerImmersiveBoundPortalUser,
	PlayerImmersiveLastLogin,
	PlayerImmersiveMobileAuthMeDetail,
	PlayerImmersiveRegistration,
	PlayerImmersiveServerViewItem,
	PlayerImmersiveSummaryItem,
} from './PlayerImmersiveHero.types'

interface PlayerImmersiveHeroMobileProps {
	account: MinecraftAccountForm
	accounts: MinecraftAccountForm[]
	selectedAccountId: string | null
	selectedViewId: string | null
	serverMenuOpen: boolean
	serverViewItems: PlayerImmersiveServerViewItem[]
	showServerSelector: boolean
	displayName: string
	headRendererUrl: string
	isOnline: boolean
	displayPrimaryGroup: string | null
	coordsText: string
	canLocatePlayer: boolean
	playTimeHoursLabel: string
	mapView: BlueMapViewChangedEventPayload
	boundPortalUser: PlayerImmersiveBoundPortalUser | null
	officialLastLogin: PlayerImmersiveLastLogin | null
	officialRegistration: PlayerImmersiveRegistration | null
	lastLoginLocationLabel: string
	registrationLocationLabel: string
	mobileSummaryItems: PlayerImmersiveSummaryItem[]
	authMeModalOpen: boolean
	authMeDetail: PlayerImmersiveMobileAuthMeDetail | null
	hasOverlayToolbar: boolean
}

const props = defineProps<PlayerImmersiveHeroMobileProps>()

const emit = defineEmits<{
	'update:serverMenuOpen': [value: boolean]
	'update:authMeModalOpen': [value: boolean]
	selectServerView: [value: string]
	focusPlayer: []
	alignNorth: []
	resetView: []
	openAuthMeDetail: [kind: PlayerImmersiveMobileAuthMeDetail['kind']]
	toggleAuthMeIp: []
	selectAccount: [accountId: string]
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const mobileDataRailRef = ref<HTMLElement | null>(null)
const mobileDataScrollProgress = ref(0)

const getMobileDataRailMaxScroll = (): number => {
	const rail = mobileDataRailRef.value
	if (!rail) return 0
	return Math.max(0, rail.scrollWidth - rail.clientWidth)
}

const syncMobileDataScrollProgress = () => {
	const rail = mobileDataRailRef.value
	const maxScroll = getMobileDataRailMaxScroll()
	mobileDataScrollProgress.value =
		rail && maxScroll > 0 ? Math.round((rail.scrollLeft / maxScroll) * 1000) : 0
}

const handleMobileDataScrubberInput = (event: Event) => {
	const rail = mobileDataRailRef.value
	const input = event.currentTarget as HTMLInputElement | null
	if (!rail || !input) return

	const progress = Number(input.value)
	mobileDataScrollProgress.value = progress
	rail.scrollLeft = (getMobileDataRailMaxScroll() * progress) / 1000
}

const snapMobileDataRailToNearestCard = () => {
	const rail = mobileDataRailRef.value
	if (!rail) return

	const cards = Array.from(
		rail.querySelectorAll<HTMLElement>('.mobile-player-data-card'),
	)
	const firstCardOffset = cards[0]?.offsetLeft ?? 0
	const nearestCard = cards.reduce<HTMLElement | null>((nearest, card) => {
		if (!nearest) return card
		const cardDistance = Math.abs(
			card.offsetLeft - firstCardOffset - rail.scrollLeft,
		)
		const nearestDistance = Math.abs(
			nearest.offsetLeft - firstCardOffset - rail.scrollLeft,
		)
		return cardDistance < nearestDistance ? card : nearest
	}, null)
	if (!nearestCard) return

	rail.scrollTo({
		left: nearestCard.offsetLeft - firstCardOffset,
		behavior: 'smooth',
	})
}

watch(
	() => [props.account.id, props.selectedViewId] as const,
	() => {
		nextTick(() => {
			mobileDataRailRef.value?.scrollTo({ left: 0, behavior: 'smooth' })
			mobileDataScrollProgress.value = 0
		})
	},
)

onMounted(() => window.addEventListener('resize', syncMobileDataScrollProgress))
onBeforeUnmount(() =>
	window.removeEventListener('resize', syncMobileDataScrollProgress),
)
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

.mobile-player-data-rail {
	scroll-snap-type: x mandatory;
	scroll-padding-inline: 1.5rem;
	scrollbar-width: none;
	overscroll-behavior-x: contain;
	touch-action: pan-x;
	-webkit-overflow-scrolling: touch;
}

.mobile-player-data-rail::-webkit-scrollbar {
	display: none;
}

.mobile-player-data-card {
	scroll-snap-align: start;
	scroll-snap-stop: always;
}

.mobile-player-data-scrubber {
	appearance: none;
	background: transparent;
}

.mobile-player-data-scrubber::-webkit-slider-runnable-track {
	height: 3px;
	border-radius: 999px;
	background: rgb(255 255 255 / 0.2);
}

.mobile-player-data-scrubber::-webkit-slider-thumb {
	width: 1.5rem;
	height: 3px;
	margin-top: 0;
	appearance: none;
	border: 0;
	border-radius: 999px;
	background: rgb(255 255 255 / 0.82);
	box-shadow: 0 0 10px rgb(125 211 252 / 0.34);
}

.mobile-player-data-scrubber::-moz-range-track {
	height: 3px;
	border-radius: 999px;
	background: rgb(255 255 255 / 0.2);
}

.mobile-player-data-scrubber::-moz-range-thumb {
	width: 1.5rem;
	height: 3px;
	border: 0;
	border-radius: 999px;
	background: rgb(255 255 255 / 0.82);
	box-shadow: 0 0 10px rgb(125 211 252 / 0.34);
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
