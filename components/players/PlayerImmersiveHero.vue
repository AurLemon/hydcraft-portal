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
			class="immersive-site-shell pointer-events-none relative z-30 flex h-dvh flex-col pt-28 pb-10 text-white lg:pt-44 lg:pb-14"
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

			<div class="hidden min-h-0 flex-1 justify-between lg:flex lg:flex-row">
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

			<div class="flex min-h-0 flex-1 flex-col lg:hidden">
				<div
					class="pt-3 player-immersive-panel pointer-events-none [text-shadow:rgba(0,0,0,0.78)_0_1px_6px]"
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
								v-model:open="mobileServerMenuOpen"
								:popper="{ placement: 'bottom-start' }"
							>
								<button
									type="button"
									class="group pointer-events-auto inline-flex max-w-full cursor-pointer items-center gap-1 text-left transition-opacity hover:opacity-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
									:aria-label="displayName"
								>
									<span
										class="truncate text-[22px] leading-tight font-arkpixel"
									>
										{{ displayName }}
									</span>
									<UIcon
										name="i-lucide-chevron-down"
										class="size-3.5 shrink-0 text-white/72 transition-transform duration-250"
										:class="mobileServerMenuOpen ? 'rotate-180' : ''"
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
											@click="selectServerView(item.value)"
										>
											<span class="min-w-0 flex-1 truncate">{{
												item.label
											}}</span>
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
									:class="
										isOnline
											? '!bg-emerald-500 !text-white'
											: '!bg-slate-500 !text-white'
									"
									variant="solid"
								>
									<span
										class="block size-1.5 rounded-full"
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
									class="!bg-sky-500 !text-white px-1.5 py-0.5 text-[10px] text-shadow-none"
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
							:key="`mobile-location-${selectedViewId ?? 'default'}`"
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
									@click="presenceMapRef?.focusPlayer()"
								>
									<UIcon name="i-lucide-locate-fixed" class="size-3.5" />
								</UButton>
							</div>
							<div class="flex items-center gap-1.5">
								<UIcon name="i-lucide-clock-3" class="size-3.5 text-white/68" />
								<span class="text-white/68">
									{{ t('minecraftAccounts.summary.playTime') }}
								</span>
								<span class="text-sm font-medium">{{
									playTimeHoursLabel
								}}</span>
							</div>
						</div>
					</Transition>
				</div>

				<div class="pointer-events-auto absolute right-6 bottom-44">
					<BlueMapOrientationControl
						:view="mapView"
						@align-north="presenceMapRef?.alignNorth()"
						@reset="presenceMapRef?.resetView()"
					/>
				</div>

				<div class="pointer-events-auto mt-auto -mx-6">
					<div
						ref="mobileDataRailRef"
						class="mobile-player-data-rail flex gap-2 overflow-x-auto px-6 pt-2 pb-1"
						@scroll.passive="syncMobileDataScrollProgress"
					>
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

						<button
							v-if="officialLastLogin"
							type="button"
							class="mobile-player-data-card pointer-events-auto flex size-28 shrink-0 cursor-pointer flex-col items-center justify-center rounded-2xl border border-white/18 bg-slate-900/78 p-2.5 text-center backdrop-blur-sm transition-colors hover:bg-slate-900/88"
							@click="openMobileAuthMeDetail('lastLogin')"
						>
							<UIcon name="i-lucide-log-in" class="size-5 text-white/82" />
							<span class="mt-1 text-[10px] leading-tight text-white/64">
								{{ t('minecraftAccounts.overlay.lastLogin') }}
							</span>
							<span class="mt-0.5 max-w-full truncate text-xs font-medium">
								{{ lastLoginLocationLabel }}
							</span>
						</button>

						<button
							v-if="officialRegistration"
							type="button"
							class="mobile-player-data-card pointer-events-auto flex size-28 shrink-0 cursor-pointer flex-col items-center justify-center rounded-2xl border border-white/18 bg-slate-900/78 p-2.5 text-center backdrop-blur-sm transition-colors hover:bg-slate-900/88"
							@click="openMobileAuthMeDetail('registration')"
						>
							<UIcon
								name="i-lucide-user-round-plus"
								class="size-5 text-white/82"
							/>
							<span class="mt-1 text-[10px] leading-tight text-white/64">
								{{ t('minecraftAccounts.overlay.registration') }}
							</span>
							<span class="mt-0.5 max-w-full truncate text-xs font-medium">
								{{ registrationLocationLabel }}
							</span>
						</button>

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

				<UModal
					v-model:open="mobileAuthMeModalOpen"
					:title="mobileAuthMeDetail?.title"
					:ui="{ content: 'max-w-sm' }"
				>
					<template #body>
						<div v-if="mobileAuthMeDetail" class="grid gap-4">
							<div
								class="flex items-center gap-3 rounded-xl bg-slate-100 p-3 dark:bg-slate-900"
							>
								<UIcon
									:name="mobileAuthMeDetail.icon"
									class="size-5 shrink-0 text-primary-500"
								/>
								<div class="min-w-0">
									<div class="text-xs text-slate-500 dark:text-slate-400">
										{{ t('minecraftAccounts.overlay.ipLocation') }}
									</div>
									<div
										class="mt-0.5 truncate font-medium text-slate-900 dark:text-white"
									>
										{{ mobileAuthMeDetail.location }}
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
											{{ mobileAuthMeDetail.ipAddress }}
										</span>
										<UButton
											v-if="mobileAuthMeDetail.hasIpAddress"
											type="button"
											color="neutral"
											variant="ghost"
											size="xs"
											class="shrink-0 cursor-pointer"
											:aria-label="
												mobileAuthMeDetail.ipVisible
													? t('minecraftAccounts.overlay.hideIp')
													: t('minecraftAccounts.overlay.showIp')
											"
											@click="toggleMobileAuthMeIp"
										>
											<UIcon
												:name="
													mobileAuthMeDetail.ipVisible
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
										{{ mobileAuthMeDetail.activityTime }}
									</span>
								</div>
							</div>
						</div>
					</template>
				</UModal>
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

interface MobileAuthMeDetail {
	kind: 'lastLogin' | 'registration'
	title: string
	icon: string
	location: string
	ipAddress: string
	activityTime: string
	hasIpAddress: boolean
	ipVisible: boolean
}

const props = defineProps<PlayerImmersiveHeroProps>()
const { locale, t } = useI18n()
const localePath = useLocalePath()
const selectedViewId = ref<string | null>(null)
const serverMenuOpen = ref(false)
const mobileServerMenuOpen = ref(false)
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
const mobileDataRailRef = ref<HTMLElement | null>(null)
const mobileDataScrollProgress = ref(0)
const mobileAuthMeDetailKind = ref<MobileAuthMeDetail['kind'] | null>(null)

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
const mobileAuthMeDetail = computed<MobileAuthMeDetail | null>(() => {
	if (mobileAuthMeDetailKind.value === 'lastLogin') {
		return {
			kind: 'lastLogin',
			title: t('minecraftAccounts.overlay.lastLogin'),
			icon: 'i-lucide-log-in',
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
			icon: 'i-lucide-user-round-plus',
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
})
const mobileAuthMeModalOpen = computed({
	get: () => mobileAuthMeDetailKind.value !== null,
	set: (open: boolean) => {
		if (!open) mobileAuthMeDetailKind.value = null
	},
})

const openMobileAuthMeDetail = (kind: MobileAuthMeDetail['kind']) => {
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

watch(selectedViewId, () => {
	nextTick(() => {
		mobileDataRailRef.value?.scrollTo({ left: 0, behavior: 'smooth' })
		mobileDataScrollProgress.value = 0
	})
})

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
