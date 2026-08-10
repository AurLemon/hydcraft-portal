<template>
	<div
		v-if="accounts.length > 1"
		class="player-account-switcher pointer-events-auto flex w-full justify-center items-center gap-0.5 rounded-full border border-white/18 bg-slate-950/42 p-1 text-shadow-none backdrop-blur-sm"
	>
		<button
			type="button"
			class="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/72 transition-colors hover:bg-white/12 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-300"
			:aria-label="t('minecraftAccounts.selector.previousAccount')"
			@click="selectRelativeAccount(-1)"
		>
			<UIcon name="i-lucide-chevron-left" class="size-4" />
		</button>

		<UPopover
			v-model:open="accountMenuOpen"
			:popper="{ placement: 'bottom-start' }"
		>
			<button
				type="button"
				class="inline-flex flex-1 justify-center min-w-0 max-w-44 cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-white transition-colors hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-300"
				:aria-label="t('minecraftAccounts.selector.selectAccount')"
				:aria-expanded="accountMenuOpen"
			>
				<span class="truncate text-sm font-medium">
					{{ selectedAccountName }}
				</span>
				<UIcon
					name="i-lucide-chevrons-up-down"
					class="size-3.5 shrink-0 text-white/65"
				/>
			</button>

			<template #content>
				<div
					role="group"
					:aria-label="t('minecraftAccounts.selector.selectAccount')"
					class="grid max-h-72 w-72 max-w-[calc(100vw-2rem)] gap-1 overflow-y-auto rounded-lg p-1.5"
				>
					<button
						v-for="account in accounts"
						:key="account.id"
						type="button"
						:aria-pressed="isSelectedAccount(account)"
						class="flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-400 dark:hover:bg-slate-800"
						:class="
							isSelectedAccount(account)
								? 'bg-primary-100/60 text-primary-600 dark:bg-primary-500/20 dark:text-primary-200'
								: 'text-slate-600 dark:text-slate-300'
						"
						@click="selectAccount(account.id)"
					>
						<SkeletonImage
							:src="resolveAvatarUrl(account)"
							:alt="resolveDisplayName(account)"
							class="size-7 shrink-0"
							skeleton-class="rounded-md"
							image-class="size-7 rounded-md object-contain"
						/>
						<span class="min-w-0 flex-1 truncate text-sm font-medium">
							{{ resolveDisplayName(account) }}
						</span>
						<UIcon
							v-if="isSelectedAccount(account)"
							name="i-lucide-check"
							class="size-4 shrink-0"
						/>
					</button>
				</div>
			</template>
		</UPopover>

		<button
			type="button"
			class="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/72 transition-colors hover:bg-white/12 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-300"
			:aria-label="t('minecraftAccounts.selector.nextAccount')"
			@click="selectRelativeAccount(1)"
		>
			<UIcon name="i-lucide-chevron-right" class="size-4" />
		</button>
	</div>
</template>

<script setup lang="ts">
import { getMinecraftHeadRendererUrl } from '~/utils/minecraft/body-renderer'
import type { MinecraftAccountForm } from '~/utils/minecraft/accounts'

interface PlayerImmersiveAccountSwitcherProps {
	accounts: MinecraftAccountForm[]
	selectedAccountId: string | null
}

const props = defineProps<PlayerImmersiveAccountSwitcherProps>()

const emit = defineEmits<{
	selectAccount: [accountId: string]
}>()

const { t } = useI18n()
const accountMenuOpen = ref(false)

const resolveDisplayName = (account: MinecraftAccountForm): string =>
	account.playerIdentity.playerId ?? account.authmeRealname ?? account.username

const resolveAvatarUrl = (account: MinecraftAccountForm): string =>
	getMinecraftHeadRendererUrl(account.uuid ?? resolveDisplayName(account))

const selectedAccountIndex = computed(() => {
	const index = props.accounts.findIndex(
		(account) => account.id === props.selectedAccountId,
	)
	return index >= 0 ? index : 0
})

const selectedAccount = computed(
	() => props.accounts[selectedAccountIndex.value] ?? null,
)

const selectedAccountName = computed(() =>
	selectedAccount.value ? resolveDisplayName(selectedAccount.value) : '',
)

const isSelectedAccount = (account: MinecraftAccountForm): boolean =>
	account.id === selectedAccount.value?.id

const selectAccount = (accountId: string) => {
	accountMenuOpen.value = false
	if (accountId !== selectedAccount.value?.id) {
		emit('selectAccount', accountId)
	}
}

const selectRelativeAccount = (offset: -1 | 1) => {
	if (props.accounts.length < 2) return

	const nextIndex =
		(selectedAccountIndex.value + offset + props.accounts.length) %
		props.accounts.length
	const nextAccount = props.accounts[nextIndex]
	if (nextAccount) selectAccount(nextAccount.id)
}
</script>

<style scoped>
.player-account-switcher {
	animation: player-account-switcher-in 320ms cubic-bezier(0.22, 1, 0.36, 1)
		both;
}

@keyframes player-account-switcher-in {
	from {
		opacity: 0;
		filter: blur(2px);
		transform: translateY(6px) scale(0.96);
	}

	to {
		opacity: 1;
		filter: blur(0);
		transform: translateY(0) scale(1);
	}
}

@media (prefers-reduced-motion: reduce) {
	.player-account-switcher {
		animation: none;
	}
}
</style>
