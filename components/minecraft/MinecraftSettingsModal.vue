<template>
	<UModal v-model:open="open" :title="t('minecraftAccounts.settings.title')">
		<template #body>
			<div class="space-y-4">
				<div class="flex items-center gap-3">
					<img
						:src="avatarUrl"
						:alt="displayName"
						class="size-10 rounded-lg border border-slate-200 bg-slate-100 object-cover dark:border-slate-700 dark:bg-slate-800"
					/>
					<div class="min-w-0">
						<p class="truncate font-medium text-slate-950 dark:text-white">
							{{ displayName }}
						</p>
						<p class="font-mono text-xs text-slate-500 dark:text-slate-400">
							{{ uuidStateLabel }}
						</p>
					</div>
				</div>

				<div class="flex justify-end">
					<UButton
						type="button"
						icon="i-lucide-check"
						:disabled="account.isPrimary"
						:loading="savingId === account.id"
						@click="submit"
					>
						{{ t('minecraftAccounts.actions.setPrimary') }}
					</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import { getMinecraftAvatarRendererUrl } from '~/utils/minecraft/body-renderer'
import {
	describeMinecraftUuidState,
	type MinecraftAccountForm,
} from '~/utils/minecraft/accounts'

interface MinecraftSettingsModalProps {
	account: MinecraftAccountForm
	savingId: string | null
}

const props = defineProps<MinecraftSettingsModalProps>()

const emit = defineEmits<{
	save: [account: MinecraftAccountForm]
}>()

const { t } = useI18n()
const open = defineModel<boolean>('open', { default: false })

const displayName = computed(
	() => props.account.playerIdentity.playerId || props.account.username,
)
const avatarUrl = computed(() =>
	getMinecraftAvatarRendererUrl(props.account.uuid ?? props.account.username),
)
const uuidStateLabel = computed(() =>
	describeMinecraftUuidState(props.account, {
		boundUuid: t('minecraftAccounts.identity.boundUuid'),
		observedUuid: t('minecraftAccounts.identity.observedUuid'),
		uuidConflictValue: (count) =>
			t('minecraftAccounts.identity.uuidConflictValue', { count }),
		uuidPending: t('minecraftAccounts.identity.uuidPending'),
	}),
)

const submit = () => {
	emit('save', props.account)
	open.value = false
}
</script>
