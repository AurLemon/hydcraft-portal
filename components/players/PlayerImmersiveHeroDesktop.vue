<template>
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
							:open="serverMenuOpen"
							:popper="{ placement: 'bottom-start' }"
							@update:open="emit('update:serverMenuOpen', $event)"
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
										@click="emit('selectServerView', item.value)"
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
					:color="isOnline ? 'success' : 'neutral'"
					:variant="isOnline ? 'solid' : 'soft'"
				>
					<span
						class="block size-2 rounded-full bg-white ring-1 ring-black/20"
					/>
					{{
						isOnline
							? t('minecraftAccounts.identity.online')
							: t('minecraftAccounts.identity.offline')
					}}
				</UBadge>
				<UBadge
					v-if="account.isPrimary"
					class="text-shadow-none"
					color="primary"
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
					:key="`${account.id}-${selectedViewId ?? 'default'}`"
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
								@click="emit('toggleLastLoginIp')"
							>
								<UIcon
									:name="ipAddressVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
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
							@click="emit('focusPlayer')"
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
								@click="emit('toggleRegistrationIp')"
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
					<PlayerImmersiveAccountSwitcher
						v-if="accounts.length > 1"
						class="mt-1"
						:accounts="accounts"
						:selected-account-id="selectedAccountId"
						@select-account="emit('selectAccount', $event)"
					/>
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
				:key="`summary-${account.id}-${selectedViewId ?? 'default'}`"
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
</template>

<script setup lang="ts">
import type { MinecraftAccountForm } from '~/utils/minecraft/accounts'

import type {
	PlayerImmersiveBoundPortalUser,
	PlayerImmersiveLastLogin,
	PlayerImmersiveRegistration,
	PlayerImmersiveServerViewItem,
	PlayerImmersiveSummaryItem,
} from './PlayerImmersiveHero.types'

interface PlayerImmersiveHeroDesktopProps {
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
	officialLastLogin: PlayerImmersiveLastLogin | null
	officialRegistration: PlayerImmersiveRegistration | null
	lastLoginLocationLabel: string
	lastLoginDetails: string
	ipAddressVisible: boolean
	coordsText: string
	canLocatePlayer: boolean
	registrationLocationLabel: string
	registrationDetails: string
	registrationIpAddressVisible: boolean
	playTimeHoursLabel: string
	notAvailableLabel: string
	playTimeTooltip: string
	boundPortalUser: PlayerImmersiveBoundPortalUser | null
	boundToSuffix: string
	summaryItems: PlayerImmersiveSummaryItem[]
}

defineProps<PlayerImmersiveHeroDesktopProps>()

const emit = defineEmits<{
	'update:serverMenuOpen': [value: boolean]
	selectServerView: [value: string]
	toggleLastLoginIp: []
	toggleRegistrationIp: []
	focusPlayer: []
	selectAccount: [accountId: string]
}>()

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<style scoped>
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

@media (prefers-reduced-motion: reduce) {
	.player-view-switch-enter-active,
	.player-view-switch-leave-active {
		transition: none;
	}
}
</style>
