<template>
	<div class="flex items-center gap-2">
		<div>
			<UTooltip :text="t('minecraftAccounts.toolbar.bindTip')">
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
				v-if="selectedAccount"
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
				v-if="selectedAccount"
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
				<div class="flex w-full justify-end gap-3">
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

interface MinecraftAccountsActionsProps {
	selectedAccount: MinecraftAccountForm | null
	savingId: string | null
	unbindingId: string | null
	unbindSuccessToken: number
}

const props = defineProps<MinecraftAccountsActionsProps>()

const emit = defineEmits<{
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
