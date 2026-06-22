<template>
	<div class="flex items-center justify-between gap-3 px-6">
		<div class="flex items-center gap-2">
			<UTooltip
				v-for="account in accounts"
				:key="account.id"
				:text="resolveDisplayName(account)"
			>
				<button
					type="button"
					class="rounded-md"
					:aria-label="resolveDisplayName(account)"
					@click="emit('select', account.id)"
				>
					<div class="flex items-center">
						<div class="relative size-6 shrink-0">
							<SkeletonImage
								:src="resolveAvatarUrl(account)"
								:alt="resolveDisplayName(account)"
								class="size-6 select-none"
								skeleton-class="rounded-md"
								:image-class="getAvatarClass(account)"
							/>
							<Transition name="toolbar-check">
								<div
									v-if="isSelectedAccount(account)"
									class="absolute -right-1 -bottom-0.5 flex size-3 items-center justify-center rounded-full bg-primary text-white shadow-sm"
								>
									<UIcon name="i-lucide-check" class="size-2" />
								</div>
							</Transition>
						</div>
						<span
							class="block truncate text-sm font-medium text-toned transition-[max-width,margin-left,opacity] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
							:class="
								isSelectedAccount(account)
									? 'ml-2 max-w-32 opacity-100'
									: 'ml-0 max-w-0 opacity-0'
							"
						>
							{{ resolveDisplayName(account) }}
						</span>
					</div>
				</button>
			</UTooltip>
		</div>

		<div class="flex items-center gap-2">
			<div>
				<UTooltip
					v-if="hasAccounts"
					:text="t('minecraftAccounts.toolbar.bindTip')"
				>
					<UButton
						type="button"
						color="neutral"
						variant="ghost"
						icon="i-lucide-plus"
						:aria-label="t('minecraftAccounts.toolbar.bindTip')"
						@click="emit('bind')"
					/>
				</UTooltip>
			</div>
			<div>
				<UTooltip
					v-if="hasAccounts && selectedAccount"
					:text="t('minecraftAccounts.toolbar.setPrimaryTip')"
				>
					<UButton
						type="button"
						color="neutral"
						variant="ghost"
						icon="i-lucide-settings-2"
						:aria-label="t('minecraftAccounts.toolbar.setPrimaryTip')"
						@click="settingsOpen = true"
					/>
				</UTooltip>
			</div>
		</div>

		<MinecraftSettingsModal
			v-if="selectedAccount"
			v-model:open="settingsOpen"
			:account="selectedAccount"
			:saving-id="savingId"
			:unbinding-id="unbindingId"
			@save="emit('save', $event)"
			@unbind="emit('unbind', $event)"
		/>
	</div>
</template>

<script setup lang="ts">
import SkeletonImage from '~/components/common/SkeletonImage.vue'
import { getMinecraftHeadRendererUrl } from '~/utils/minecraft/body-renderer'
import type { MinecraftAccountForm } from '~/utils/minecraft/accounts'

interface MinecraftAccountsToolbarProps {
	accounts: MinecraftAccountForm[]
	selectedAccountId: string | null
	selectedAccount: MinecraftAccountForm | null
	savingId: string | null
	unbindingId: string | null
}

const props = defineProps<MinecraftAccountsToolbarProps>()

const emit = defineEmits<{
	select: [accountId: string]
	bind: []
	save: [account: MinecraftAccountForm]
	unbind: [account: MinecraftAccountForm]
}>()

const { t } = useI18n()
const settingsOpen = ref(false)

const hasAccounts = computed(() => props.accounts.length > 0)

const resolveDisplayName = (account: MinecraftAccountForm): string =>
	account.playerIdentity.playerId || account.username

const resolveAvatarUrl = (account: MinecraftAccountForm): string =>
	getMinecraftHeadRendererUrl(account.uuid ?? account.username)

const isSelectedAccount = (account: MinecraftAccountForm): boolean =>
	account.id === props.selectedAccountId

const getAvatarClass = (account: MinecraftAccountForm): string => {
	const baseClass =
		'size-6 rounded-md object-cover drop-shadow-sm scale-100 transition-[transform,opacity,filter] duration-320 ease-[cubic-bezier(0.22,1,0.36,1)]'

	if (isSelectedAccount(account)) {
		return `${baseClass} scale-[1.1] opacity-100 saturate-[175%]`
	}

	return `${baseClass} opacity-50 saturate-[80%] hover:scale-[1.02]`
}
</script>

<style scoped>
.toolbar-check-enter-active,
.toolbar-check-leave-active {
	transition:
		opacity 220ms cubic-bezier(0.22, 1, 0.36, 1),
		transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.toolbar-check-enter-from,
.toolbar-check-leave-to {
	opacity: 0;
	transform: translateY(2px);
}

.toolbar-check-enter-to,
.toolbar-check-leave-from {
	opacity: 1;
	transform: translateY(0);
}
</style>
