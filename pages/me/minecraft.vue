<template>
	<div class="site-shell -mt-2 pb-16">
		<div class="flex flex-col gap-4">
			<div v-if="initialLoading" class="grid gap-4">
				<div class="flex items-center justify-between gap-3 px-6">
					<div class="flex items-center gap-2">
						<USkeleton
							v-for="index in 2"
							:key="`minecraft-toolbar-skeleton-${index}`"
							class="size-6 rounded-md"
						/>
					</div>
					<div class="flex items-center gap-2">
						<USkeleton class="size-8 rounded-md" />
						<USkeleton class="size-8 rounded-md" />
					</div>
				</div>
				<USkeleton class="h-160 rounded-3xl" />
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
					:unbinding-id="unbindingId"
					@select="selectedAccountId = $event"
					@bind="bindOpen = true"
					@save="saveAccount"
					@unbind="unbindAccount"
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
const { fetchCurrentUser } = usePortalAuth()
const savingId = ref<string | null>(null)
const unbindingId = ref<string | null>(null)
const binding = ref(false)
const bindSuccessToken = ref(0)
const bindOpen = ref(false)
const selectedAccountId = ref<string | null>(null)
const minecraftAccountsEndpoint = '/api/users/me/minecraft-accounts' as string
const { data, error, refresh } = await useFetch<MinecraftAccountsResponse>(
	minecraftAccountsEndpoint,
)
const accountsState = ref<MinecraftAccountForm[]>([])
let refreshTimer: ReturnType<typeof setInterval> | null = null

// 区分「首次加载」与「静默刷新」：useFetch 的 refresh() 会把 pending 置 true，
// 若用 pending 控制 skeleton，每分钟刷新都会 unmount 整个内容区，导致内部状态
// （hover 坐标、body 图加载态、carousel）重置与动画重放。仅首次拿到 data/error
// 前显示 skeleton，之后刷新静默 diff 更新。
const initialLoading = ref(true)
watch(
	[data, error],
	() => {
		if (initialLoading.value && (data.value || error.value)) {
			initialLoading.value = false
		}
	},
	{ immediate: true },
)

const reconcileAccountList = (
	currentAccounts: MinecraftAccountForm[],
	nextAccounts: MinecraftAccountForm[],
): MinecraftAccountForm[] => {
	const currentAccountMap = new Map(
		currentAccounts.map((account) => [account.id, account]),
	)

	return nextAccounts.map((nextAccount) => {
		const currentAccount = currentAccountMap.get(nextAccount.id)

		if (!currentAccount) {
			return nextAccount
		}

		Object.assign(currentAccount, nextAccount)
		return currentAccount
	})
}

watch(
	data,
	(value) => {
		accountsState.value = reconcileAccountList(
			accountsState.value,
			value?.accounts ?? [],
		)
	},
	{ immediate: true },
)

const accounts = computed<MinecraftAccountForm[]>(() => accountsState.value)
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
		await fetchCurrentUser()
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

const unbindAccount = async (account: MinecraftAccountForm): Promise<void> => {
	if (!account.id || unbindingId.value) {
		return
	}

	const endpoint = `/api/users/me/minecraft-accounts/${account.id}` as string
	unbindingId.value = account.id

	try {
		await $fetch(endpoint, {
			method: 'DELETE',
		})
		await refresh()
		notifySuccess({
			title: t('minecraftAccounts.notifications.unbindSuccess'),
		})
	} catch (unbindError) {
		notifyError(unbindError, {
			title: t('minecraftAccounts.notifications.unbindFailed'),
			description: t('minecraftAccounts.notifications.unbindFailedDescription'),
		})
	} finally {
		unbindingId.value = null
	}
}

onMounted(() => {
	refreshTimer = setInterval(() => {
		void refresh()
	}, 60_000)
})

onBeforeUnmount(() => {
	if (!refreshTimer) {
		return
	}

	clearInterval(refreshTimer)
	refreshTimer = null
})
</script>
