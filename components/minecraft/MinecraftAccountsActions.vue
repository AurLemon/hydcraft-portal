<template>
	<div class="flex items-center gap-2">
		<div>
			<UTooltip :text="t('minecraftAccounts.toolbar.bindTip')">
				<UButton
					type="button"
					color="neutral"
					variant="ghost"
					icon="i-lucide-plus"
					:class="immersive ? immersiveNeutralActionClass : undefined"
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
					:class="immersive ? immersiveNeutralActionClass : undefined"
					:aria-label="t('minecraftAccounts.toolbar.setPrimaryTip')"
					@click="settingsOpen = true"
				/>
			</UTooltip>
		</div>
		<div>
			<UTooltip
				v-if="accounts.length"
				:text="t('minecraftAccounts.actions.unbind')"
			>
				<UButton
					type="button"
					color="error"
					variant="ghost"
					icon="i-lucide-unlink"
					:class="immersive ? immersiveErrorActionClass : undefined"
					:loading="
						!!(
							unbindingTargetAccount &&
							unbindingId === unbindingTargetAccount.id
						)
					"
					:aria-label="t('minecraftAccounts.actions.unbind')"
					@click="openUnbindConfirm"
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
			v-if="accounts.length"
			v-model:open="unbindConfirmOpen"
			:title="t('minecraftAccounts.actions.unbind')"
			:ui="{ content: 'max-w-lg' }"
		>
			<template #body>
				<div class="space-y-4">
					<div v-if="!unbindingTargetAccount" class="space-y-2">
						<p class="text-sm font-medium text-slate-700 dark:text-slate-200">
							{{ t('minecraftAccounts.unbind.targetLabel') }}
						</p>
						<MinecraftAccountsSelector
							:accounts="accounts"
							:selected-account-id="unbindingTargetAccountId"
							@select="unbindingTargetAccountId = $event"
						/>
						<p class="text-sm leading-6 text-slate-500 dark:text-slate-400">
							{{ t('minecraftAccounts.unbind.targetDescription') }}
						</p>
					</div>

					<div v-if="unbindingTargetAccount" class="flex items-start gap-3">
						<div class="relative size-10 shrink-0 overflow-hidden rounded-lg">
							<SkeletonImage
								:src="resolveAvatarUrl(unbindingTargetAccount)"
								:alt="resolveDisplayName(unbindingTargetAccount)"
								class="size-10 select-none"
								skeleton-class="rounded-lg"
								:image-class="'size-10 rounded-lg object-cover drop-shadow-sm'"
							/>
						</div>
						<div class="min-w-0">
							<p class="truncate font-medium text-slate-950 dark:text-white">
								{{ resolveDisplayName(unbindingTargetAccount) }}
							</p>
							<p
								class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400"
							>
								{{ t('minecraftAccounts.settings.confirmations.unbind') }}
							</p>
						</div>
					</div>

					<TurnstileWidget
						v-if="unbindingTargetAccount"
						ref="unbindCaptchaWidgetRef"
						v-model="unbindCaptcha.token.value"
						:action="TURNSTILE_ACTIONS.MINECRAFT_UNBIND"
					/>
				</div>
			</template>

			<template #footer>
				<div class="flex w-full justify-end gap-3">
					<UButton
						type="button"
						color="neutral"
						variant="ghost"
						:disabled="
							!!(
								unbindingTargetAccount &&
								unbindingId === unbindingTargetAccount.id
							)
						"
						@click="unbindConfirmOpen = false"
					>
						{{ t('common.cancel') }}
					</UButton>
					<UButton
						type="button"
						color="error"
						icon="i-lucide-unlink"
						:loading="
							!!(
								unbindingTargetAccount &&
								unbindingId === unbindingTargetAccount.id
							)
						"
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
import { TURNSTILE_ACTIONS } from '~/utils/security/turnstile-actions'
import SkeletonImage from '~/components/common/SkeletonImage.vue'
import MinecraftAccountsSelector from '~/components/minecraft/MinecraftAccountsSelector.vue'
import { getMinecraftHeadRendererUrl } from '~/utils/minecraft/body-renderer'
import type { MinecraftAccountForm } from '~/utils/minecraft/accounts'

interface MinecraftAccountsActionsProps {
	accounts: MinecraftAccountForm[]
	selectedAccount: MinecraftAccountForm | null
	savingId: string | null
	unbindingId: string | null
	unbindSuccessToken: number
	immersive?: boolean
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
const immersiveNeutralActionClass =
	'!text-slate-400 hover:!bg-white/10 hover:!text-white active:!bg-white/15'
const immersiveErrorActionClass =
	'!text-danger-400 hover:!bg-danger-500/15 hover:!text-danger-300 active:!bg-danger-500/20'
const settingsOpen = ref(false)
const unbindConfirmOpen = ref(false)
const unbindingTargetAccountId = ref<string | null>(null)
const unbindCaptcha = useTurnstile(true)
const unbindCaptchaWidgetRef = ref<{ reset: () => void } | null>(null)
const unbindingTargetAccount = computed<MinecraftAccountForm | null>(
	() =>
		props.accounts.find(
			(account) => account.id === unbindingTargetAccountId.value,
		) ?? null,
)

const unbindSubmitDisabled = computed(
	() =>
		!unbindingTargetAccount.value ||
		!unbindCaptcha.token.value ||
		props.unbindingId === unbindingTargetAccount.value.id,
)

const resolveDisplayName = (account: MinecraftAccountForm): string =>
	account.playerIdentity.playerId || account.username

const resolveAvatarUrl = (account: MinecraftAccountForm): string =>
	getMinecraftHeadRendererUrl(account.uuid ?? account.username)

const resetUnbindCaptcha = (): void => {
	unbindCaptcha.reset(true)
	unbindCaptchaWidgetRef.value?.reset()
}

const openUnbindConfirm = (): void => {
	unbindingTargetAccountId.value = null
	unbindConfirmOpen.value = true
}

const submitUnbind = (): void => {
	if (unbindSubmitDisabled.value || !unbindingTargetAccount.value) {
		return
	}

	emit('unbind', {
		account: unbindingTargetAccount.value,
		captchaToken: unbindCaptcha.consumeToken(),
	})
}

watch(unbindConfirmOpen, () => {
	resetUnbindCaptcha()
})

watch(
	() => props.accounts,
	(accounts) => {
		if (!accounts.length && unbindConfirmOpen.value) {
			unbindConfirmOpen.value = false
		}

		const targetExists = unbindingTargetAccountId.value
			? accounts.some(
					(account) => account.id === unbindingTargetAccountId.value,
				)
			: false

		if (!targetExists) {
			unbindingTargetAccountId.value = null
		}
	},
	{ deep: true },
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
		unbindingTargetAccountId.value = null
		resetUnbindCaptcha()
	},
)
</script>
