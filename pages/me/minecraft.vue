<template>
	<div class="site-shell -mt-2 pb-16">
		<div class="flex flex-col gap-4">
			<div v-if="pending" class="grid gap-4">
				<USkeleton class="h-12 rounded-2xl" />
				<USkeleton class="h-115 rounded-3xl" />
			</div>
			<UAlert
				v-else-if="error"
				color="error"
				icon="i-lucide-circle-alert"
				:title="t('minecraftAccounts.empty.loadFailed')"
			/>
			<template v-else>
				<MinecraftAccountsToolbar
					:accounts="accounts"
					:selected-account-id="selectedAccountId"
					:selected-account="selectedAccount"
					:saving-id="savingId"
					@select="selectedAccountId = $event"
					@bind="bindOpen = true"
					@save="saveAccount"
				/>
				<MinecraftAccountsContent
					:accounts="accounts"
					:selected-account="selectedAccount"
					:saving-id="savingId"
					@bind="bindOpen = true"
				/>
			</template>
		</div>

		<MinecraftBindModal
			v-model:open="bindOpen"
			:binding="binding"
			:success-token="bindSuccessToken"
			@submit="bindAccount"
		/>
	</div>
</template>

<script setup lang="ts">
import type {
	BindMinecraftAccountBody,
	MinecraftAccountForm,
	MinecraftAccountsResponse,
} from '~/utils/minecraft/accounts'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'portal-auth',
})

const { t } = useI18n()
const { notifyError, notifySuccess } = useAdminToast()
const savingId = ref<string | null>(null)
const binding = ref(false)
const bindSuccessToken = ref(0)
const bindOpen = ref(false)
const selectedAccountId = ref<string | null>(null)
const minecraftAccountsEndpoint = '/api/users/me/minecraft-accounts' as string
const { data, pending, error, refresh } =
	await useFetch<MinecraftAccountsResponse>(minecraftAccountsEndpoint)

const accounts = computed<MinecraftAccountForm[]>(() =>
	(data.value?.accounts ?? []).map((account) => ({
		...account,
	})),
)
const primaryAccount = computed<MinecraftAccountForm | null>(
	() =>
		accounts.value.find((account) => account.isPrimary) ??
		accounts.value[0] ??
		null,
)
const selectedAccount = computed<MinecraftAccountForm | null>(
	() =>
		accounts.value.find((account) => account.id === selectedAccountId.value) ??
		primaryAccount.value,
)

watch(
	accounts,
	(list) => {
		const exists = selectedAccountId.value
			? list.some((account) => account.id === selectedAccountId.value)
			: false

		if (!exists) {
			selectedAccountId.value =
				list.find((account) => account.isPrimary)?.id ?? list[0]?.id ?? null
		}
	},
	{ immediate: true },
)

const saveAccount = async (account: MinecraftAccountForm): Promise<void> => {
	savingId.value = account.id

	try {
		await $fetch(`/api/users/me/minecraft-accounts/${account.id}`, {
			method: 'PATCH',
			body: {
				isPrimary: true,
			},
		})
		await refresh()
		notifySuccess({
			title: t('minecraftAccounts.notifications.primarySet'),
		})
	} catch (saveError) {
		notifyError(saveError, {
			title: t('minecraftAccounts.notifications.primarySetFailed'),
			description: t(
				'minecraftAccounts.notifications.primarySetFailedDescription',
			),
		})
	} finally {
		savingId.value = null
	}
}

const bindAccount = async (body: BindMinecraftAccountBody): Promise<void> => {
	if (!body.username || !body.password || binding.value) {
		return
	}

	binding.value = true

	try {
		await $fetch(minecraftAccountsEndpoint, {
			method: 'POST',
			body,
		})
		bindSuccessToken.value += 1
		await refresh()
		notifySuccess({
			title: t('minecraftAccounts.bind.notifications.successTitle'),
		})
	} catch (bindError) {
		notifyError(bindError, {
			title: t('minecraftAccounts.bind.notifications.failedTitle'),
			description: t('minecraftAccounts.bind.notifications.failedDescription'),
		})
	} finally {
		binding.value = false
	}
}
</script>
