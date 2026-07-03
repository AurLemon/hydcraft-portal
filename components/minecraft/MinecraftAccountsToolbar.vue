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
			<div>
				<UTooltip
					v-if="hasAccounts && selectedAccount"
					:text="t('minecraftAccounts.actions.unbind')"
				>
					<UButton
						type="button"
						color="error"
						variant="ghost"
						icon="i-lucide-unlink"
						:loading="unbindingId === selectedAccount.id"
						:aria-label="t('minecraftAccounts.actions.unbind')"
						@click="unbindConfirmOpen = true"
					/>
				</UTooltip>
			</div>
		</div>

		<MinecraftSettingsModal
			v-if="selectedAccount"
			v-model:open="settingsOpen"
			:account="selectedAccount"
			:saving-id="savingId"
			@save="emit('save', $event)"
		/>

		<UModal
			v-if="selectedAccount"
			v-model:open="unbindConfirmOpen"
			:title="t('minecraftAccounts.actions.unbind')"
			:ui="{ content: 'max-w-lg' }"
		>
			<template #body>
				<div class="space-y-4">
					<div class="flex items-start gap-3">
						<div class="relative size-10 shrink-0 overflow-hidden rounded-lg">
							<SkeletonImage
								:src="resolveAvatarUrl(selectedAccount)"
								:alt="resolveDisplayName(selectedAccount)"
								class="size-10 select-none"
								skeleton-class="rounded-lg"
								:image-class="'size-10 rounded-lg object-cover drop-shadow-sm'"
							/>
						</div>
						<div class="min-w-0">
							<p class="truncate font-medium text-slate-950 dark:text-white">
								{{ resolveDisplayName(selectedAccount) }}
							</p>
							<p
								class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400"
							>
								{{ t('minecraftAccounts.settings.confirmations.unbind') }}
							</p>
						</div>
					</div>

					<CapWidget
						ref="unbindCaptchaWidgetRef"
						v-model="unbindCaptcha.token.value"
					/>
				</div>
			</template>

			<template #footer>
				<div
					class="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end"
				>
					<UButton
						type="button"
						color="neutral"
						variant="ghost"
						:disabled="unbindingId === selectedAccount.id"
						@click="unbindConfirmOpen = false"
					>
						{{ t('common.cancel') }}
					</UButton>
					<UButton
						type="button"
						color="error"
						icon="i-lucide-unlink"
						:loading="unbindingId === selectedAccount.id"
						:disabled="unbindSubmitDisabled"
						@click="submitUnbind"
					>
						{{ t('minecraftAccounts.actions.unbind') }}
					</UButton>
				</div>
			</template>
		</UModal>
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
	unbindSuccessToken: number
}

const props = defineProps<MinecraftAccountsToolbarProps>()

const emit = defineEmits<{
	select: [accountId: string]
	bind: []
	save: [account: MinecraftAccountForm]
	unbind: [
		payload: {
			account: MinecraftAccountForm
			captchaToken: string
		},
	]
}>()

const { t } = useI18n()
const settingsOpen = ref(false)
const unbindConfirmOpen = ref(false)
const unbindCaptcha = useCap(true)
const unbindCaptchaWidgetRef = ref<{ reset: () => void } | null>(null)

const hasAccounts = computed(() => props.accounts.length > 0)
const unbindSubmitDisabled = computed(
	() =>
		!props.selectedAccount ||
		!unbindCaptcha.token.value ||
		props.unbindingId === props.selectedAccount.id,
)

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

const resetUnbindCaptcha = (): void => {
	unbindCaptcha.reset(true)
	unbindCaptchaWidgetRef.value?.reset()
}

const submitUnbind = (): void => {
	if (unbindSubmitDisabled.value || !props.selectedAccount) {
		return
	}

	emit('unbind', {
		account: props.selectedAccount,
		captchaToken: unbindCaptcha.consumeToken(),
	})
}

watch(unbindConfirmOpen, () => {
	resetUnbindCaptcha()
})

watch(
	() => props.selectedAccount?.id ?? null,
	(selectedAccountId) => {
		if (!selectedAccountId && unbindConfirmOpen.value) {
			unbindConfirmOpen.value = false
		}

		if (unbindConfirmOpen.value) {
			resetUnbindCaptcha()
		}
	},
)

watch(
	() => props.unbindingId,
	(current, previous) => {
		if (previous && !current) {
			resetUnbindCaptcha()
		}
	},
)

watch(
	() => props.unbindSuccessToken,
	() => {
		unbindConfirmOpen.value = false
		resetUnbindCaptcha()
	},
)
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
