<template>
	<div class="site-shell pb-16">
		<div class="flex flex-col gap-4">
			<div v-if="initialLoading" class="grid gap-4">
				<div class="flex items-center justify-between gap-3 px-6">
					<div class="flex items-center gap-2">
						<USkeleton
							v-for="index in 3"
							:key="`minecraft-tab-skeleton-${index}`"
							class="h-8 w-16 rounded-md"
						/>
					</div>
					<div class="flex items-center gap-2">
						<USkeleton class="size-8 rounded-md" />
						<USkeleton class="size-8 rounded-md" />
						<USkeleton class="size-8 rounded-md" />
					</div>
				</div>
				<USkeleton class="h-160 rounded-3xl" />
			</div>
			<UAlert
				v-else-if="accountError && !accountLoaded"
				color="error"
				icon="i-lucide-circle-alert"
				:title="t('minecraftAccounts.empty.loadFailed')"
			/>
			<template v-else>
				<div
					class="flex flex-col gap-3 items-center lg:mb-8 sm:flex-row sm:items-start sm:justify-between"
				>
					<div
						class="grid w-fit grid-cols-4 gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950"
					>
						<button
							v-for="tab in tabItems"
							:key="tab.key"
							type="button"
							class="rounded-md px-3 py-1.5 text-sm transition-all duration-250 ease-out"
							:class="
								activeTab === tab.key
									? 'bg-primary-500 text-white shadow-sm translate-y-0 dark:bg-white dark:text-slate-950'
									: 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
							"
							@click="void setActiveTab(tab.key)"
						>
							{{ tab.label }}
						</button>
					</div>

					<div v-if="accounts.length" class="flex items-center gap-3">
						<MinecraftAccountsActions
							:accounts="accounts"
							:selected-account="selectedAccount"
							:saving-id="savingId"
							:unbinding-id="unbindingId"
							:unbind-success-token="unbindSuccessToken"
							@bind="bindOpen = true"
							@save="saveAccount"
							@unbind="unbindAccount"
						/>
					</div>
				</div>

				<Transition name="history-tab-switch" mode="out-in">
					<div v-if="activeTab === 'overview'" key="overview">
						<div v-if="accounts.length" class="mb-4 px-6">
							<MinecraftAccountsSelector
								:accounts="accounts"
								:selected-account-id="selectedAccountId"
								@select="selectedAccountId = $event"
							/>
						</div>
						<MinecraftAccountsContent
							:accounts="accounts"
							:selected-account="selectedAccount"
							:saving-id="savingId"
							:require-map-for-selector="true"
							@bind="bindOpen = true"
						/>
					</div>

					<div
						v-else-if="activeTab === 'official'"
						key="official"
						class="grid gap-4"
					>
						<MinecraftPublicAccountsContent
							v-for="account in accounts"
							:key="account.id"
							:account="account"
						/>
						<PageInlineException
							v-if="!accounts.length"
							icon="i-lucide-box"
							:title="t('minecraftAccounts.tabs.officialEmptyTitle')"
						>
							<p
								class="text-sm leading-6 text-slate-600 dark:text-slate-300/80"
							>
								{{ t('minecraftAccounts.tabs.officialEmptyDescription') }}
							</p>
						</PageInlineException>
					</div>

					<div
						v-else-if="activeTab === 'historical'"
						key="historical"
						class="grid gap-4"
					>
						<UAlert
							color="neutral"
							variant="soft"
							icon="i-lucide-circle-help"
							:title="t('minecraftAccounts.history.explainer.title')"
							:description="
								t('minecraftAccounts.history.explainer.description')
							"
						/>
						<div v-if="historyPending && !historyLoaded" class="grid gap-4">
							<USkeleton class="h-48 rounded-lg" />
							<USkeleton class="h-48 rounded-lg" />
						</div>
						<UAlert
							v-else-if="historyError && !historyLoaded"
							color="error"
							icon="i-lucide-circle-alert"
							:title="t('minecraftAccounts.history.loadFailed')"
						/>
						<template v-else-if="historicalAccounts.length">
							<MinecraftPublicAccountsContent
								v-for="account in historicalAccounts"
								:key="account.id"
								:account="account"
							/>
						</template>
						<PageInlineException
							v-else
							icon="i-lucide-archive"
							:title="t('minecraftAccounts.history.emptyTitle')"
						>
							<p
								class="text-sm leading-6 text-slate-600 dark:text-slate-300/80"
							>
								{{ t('minecraftAccounts.history.emptyDescription') }}
							</p>
						</PageInlineException>
					</div>

					<div v-else key="all" class="grid gap-6">
						<div v-if="historyPending && !historyLoaded" class="grid gap-4">
							<USkeleton class="h-48 rounded-lg" />
							<USkeleton class="h-48 rounded-lg" />
						</div>
						<UAlert
							v-else-if="historyError && !historyLoaded"
							color="error"
							icon="i-lucide-circle-alert"
							:title="t('minecraftAccounts.history.loadFailed')"
						/>
						<template v-else-if="allAccountsByServer.length">
							<section
								v-for="group in allAccountsByServer"
								:key="group.serverId"
								class="grid gap-3"
							>
								<div class="flex items-center gap-2 px-1">
									<h2 class="mx-1 text-2xl text-slate-950 dark:text-white">
										{{ resolveServerDisplayName(group.serverNames) }}
									</h2>
									<UBadge color="neutral" variant="soft">
										{{
											t('minecraftAccounts.history.serverCount', {
												count: group.accounts.length,
											})
										}}
									</UBadge>
								</div>
								<div class="grid gap-4">
									<MinecraftPublicAccountsContent
										v-for="item in group.accounts"
										:key="`${group.serverId}-${item.account.id}-${item.serverViewId}`"
										:account="item.account"
										:fixed-server-view-id="item.serverViewId"
										:show-coordinates="true"
									/>
								</div>
							</section>
						</template>
						<PageInlineException
							v-else
							icon="i-lucide-archive"
							:title="t('minecraftAccounts.history.emptyTitle')"
						>
							<p
								class="text-sm leading-6 text-slate-600 dark:text-slate-300/80"
							>
								{{ t('minecraftAccounts.history.emptyDescription') }}
							</p>
						</PageInlineException>
					</div>
				</Transition>
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
import {
	getServerViewSelectionValueForSummary,
	resolveServerViewSummary,
} from '~/utils/minecraft/accounts'
import {
	resolveMinecraftServerLocalizedName,
	type MinecraftServerLocalizedName,
} from '~/utils/minecraft/server-name'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'portal-auth',
})

interface HistoricalAccountsResponse {
	accounts: MinecraftAccountForm[]
	serverOrder: Array<{
		serverId: string
		serverNames: MinecraftServerLocalizedName
	}>
	servers: Array<{
		serverId: string
		serverNames: MinecraftServerLocalizedName | null
		accounts: Array<{
			account: MinecraftAccountForm
			serverViewId: string
		}>
	}>
}

type MinecraftTabKey = 'overview' | 'official' | 'historical' | 'all'

const { locale, t } = useI18n()
const route = useRoute()
const router = useRouter()
const { notifyError, notifySuccess } = useAdminToast()
const { fetchCurrentUser, bindMinecraftAccount, unbindMinecraftAccount } =
	usePortalAuth()
const savingId = ref<string | null>(null)
const unbindingId = ref<string | null>(null)
const unbindSuccessToken = ref(0)
const binding = ref(false)
const bindSuccessToken = ref(0)
const bindOpen = ref(false)
const selectedAccountId = ref<string | null>(null)
const DEFAULT_MINECRAFT_TAB: MinecraftTabKey = 'overview'
const MINECRAFT_TAB_KEYS = [
	'overview',
	'official',
	'historical',
	'all',
] as const satisfies readonly MinecraftTabKey[]
const minecraftAccountsEndpoint = '/api/users/me/minecraft-accounts' as string
const {
	data,
	error: accountError,
	refresh,
} = await useFetch<MinecraftAccountsResponse>(minecraftAccountsEndpoint)
const {
	data: historyData,
	pending: historyPending,
	error: historyError,
	refresh: refreshHistory,
} = await useFetch<HistoricalAccountsResponse>('/api/users/me/history', {
	default: () => ({
		accounts: [],
		serverOrder: [],
		servers: [],
	}),
})
const accountsState = ref<MinecraftAccountForm[]>([])
const historyState = ref<HistoricalAccountsResponse>({
	accounts: [],
	serverOrder: [],
	servers: [],
})
let refreshTimer: ReturnType<typeof setInterval> | null = null

const initialLoading = ref(true)
const accountLoaded = ref(false)
const historyLoaded = ref(false)
watch(
	[data, accountError],
	() => {
		if (data.value) {
			accountLoaded.value = true
		}

		if (initialLoading.value && (data.value || accountError.value)) {
			initialLoading.value = false
		}
	},
	{ immediate: true },
)

watch(
	[historyPending, historyError],
	([pending, error]) => {
		if (!pending && !error) {
			historyLoaded.value = true
		}
	},
	{ immediate: true },
)

const tabItems = computed(() => [
	{ key: 'overview' as const, label: t('minecraftAccounts.tabs.overview') },
	{ key: 'official' as const, label: t('minecraftAccounts.tabs.official') },
	{ key: 'historical' as const, label: t('minecraftAccounts.tabs.historical') },
	{ key: 'all' as const, label: t('minecraftAccounts.tabs.all') },
])

const isMinecraftTabKey = (value: string): value is MinecraftTabKey =>
	MINECRAFT_TAB_KEYS.includes(value as MinecraftTabKey)

const readTabQueryValue = (value: unknown): string | null => {
	if (typeof value === 'string') {
		return value
	}

	if (Array.isArray(value) && typeof value[0] === 'string') {
		return value[0]
	}

	return null
}

const parseMinecraftTabQuery = (value: unknown): MinecraftTabKey => {
	const tab = readTabQueryValue(value)
	return tab && isMinecraftTabKey(tab) ? tab : DEFAULT_MINECRAFT_TAB
}

const replaceTabQuery = async (nextTab: MinecraftTabKey): Promise<void> => {
	const nextQuery = {
		...route.query,
	} as Record<string, string | string[] | undefined>

	if (nextTab === DEFAULT_MINECRAFT_TAB) {
		delete nextQuery.tab
	} else {
		nextQuery.tab = nextTab
	}

	await router.replace({
		query: nextQuery,
	})
}

const activeTab = computed<MinecraftTabKey>(() =>
	parseMinecraftTabQuery(route.query.tab),
)

const setActiveTab = async (nextTab: MinecraftTabKey): Promise<void> => {
	if (activeTab.value === nextTab) {
		return
	}

	await replaceTabQuery(nextTab)
}

watch(
	() => route.query.tab,
	(tab) => {
		const rawTab = readTabQueryValue(tab)
		if (!rawTab) {
			return
		}

		if (!isMinecraftTabKey(rawTab)) {
			void replaceTabQuery(DEFAULT_MINECRAFT_TAB)
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

const reconcileHistory = (
	current: HistoricalAccountsResponse,
	next: HistoricalAccountsResponse,
): HistoricalAccountsResponse => {
	const accounts = reconcileAccountList(current.accounts, next.accounts)
	const accountById = new Map(accounts.map((account) => [account.id, account]))

	return {
		accounts,
		serverOrder: next.serverOrder,
		servers: next.servers.map((server) => ({
			...server,
			accounts: server.accounts.map((item) => ({
				...item,
				account: accountById.get(item.account.id) ?? item.account,
			})),
		})),
	}
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

watch(
	historyData,
	(value) => {
		historyState.value = reconcileHistory(historyState.value, {
			accounts: value?.accounts ?? [],
			serverOrder: value?.serverOrder ?? [],
			servers: value?.servers ?? [],
		})
	},
	{ immediate: true },
)

const accounts = computed<MinecraftAccountForm[]>(() => accountsState.value)
const resolveServerDisplayName = (
	serverNames: MinecraftServerLocalizedName | null | undefined,
	fallback = '',
): string =>
	serverNames
		? resolveMinecraftServerLocalizedName(serverNames, locale.value)
		: fallback

const historicalAccounts = computed<MinecraftAccountForm[]>(
	() => historyState.value.accounts,
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

const allAccountsByServer = computed(() => {
	const serverOrder = new Map<string, number>()
	const serverNames = new Map<string, MinecraftServerLocalizedName>()

	for (const [index, server] of historyState.value.serverOrder.entries()) {
		serverOrder.set(server.serverId, index)
		serverNames.set(server.serverId, server.serverNames)
	}

	for (const group of historyState.value.servers) {
		if (!serverOrder.has(group.serverId)) {
			serverOrder.set(group.serverId, serverOrder.size)
		}

		if (!serverNames.has(group.serverId) && group.serverNames) {
			serverNames.set(group.serverId, group.serverNames)
		}
	}

	const grouped = new Map<
		string,
		{
			serverId: string
			serverNames: MinecraftServerLocalizedName | null
			accounts: Array<{
				account: MinecraftAccountForm
				serverViewId: string
				firstJoinedAt: string | null
			}>
		}
	>()

	const appendAccountToGroup = (
		account: MinecraftAccountForm,
		serverViewId: string,
		serverId: string,
		fallbackServerNames: MinecraftServerLocalizedName | null,
	): void => {
		if (!serverOrder.has(serverId)) {
			serverOrder.set(serverId, serverOrder.size)
		}

		const serverView = resolveServerViewSummary(account, serverViewId)
		const bucket = grouped.get(serverId) ?? {
			serverId,
			serverNames:
				serverNames.get(serverId) ??
				serverView?.serverNames ??
				fallbackServerNames,
			accounts: [],
		}

		bucket.accounts.push({
			account,
			serverViewId,
			firstJoinedAt: serverView?.firstJoinedAt ?? account.firstJoinedAt ?? null,
		})
		grouped.set(serverId, bucket)
	}

	for (const group of historyState.value.servers) {
		for (const item of group.accounts) {
			appendAccountToGroup(
				item.account,
				item.serverViewId,
				group.serverId,
				group.serverNames,
			)
		}
	}

	for (const account of accounts.value) {
		for (const view of account.serverViews.filter(
			(candidate) => candidate.serverId,
		)) {
			const serverId = view.serverId as string

			appendAccountToGroup(
				account,
				getServerViewSelectionValueForSummary(account, view),
				serverId,
				view.serverNames,
			)
		}
	}

	return Array.from(grouped.values())
		.sort(
			(left, right) =>
				(serverOrder.get(left.serverId) ?? Number.MAX_SAFE_INTEGER) -
				(serverOrder.get(right.serverId) ?? Number.MAX_SAFE_INTEGER),
		)
		.map((group) => ({
			...group,
			accounts: [...group.accounts].sort((left, right) => {
				const leftTime = left.firstJoinedAt
					? new Date(left.firstJoinedAt).getTime()
					: Number.NEGATIVE_INFINITY
				const rightTime = right.firstJoinedAt
					? new Date(right.firstJoinedAt).getTime()
					: Number.NEGATIVE_INFINITY

				return rightTime - leftTime
			}),
		}))
})

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
	if (!body.username || !body.password || !body.captchaToken || binding.value) {
		return
	}

	binding.value = true

	try {
		await bindMinecraftAccount(body)
		await fetchCurrentUser()
		bindSuccessToken.value += 1
		await Promise.all([refresh(), refreshHistory()])
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

const unbindAccount = async (payload: {
	account: MinecraftAccountForm
	captchaToken: string
}): Promise<void> => {
	if (!payload.account.id || !payload.captchaToken || unbindingId.value) {
		return
	}

	unbindingId.value = payload.account.id

	try {
		await unbindMinecraftAccount(payload.account.id, {
			captchaToken: payload.captchaToken,
		})
		await Promise.all([refresh(), refreshHistory()])
		unbindSuccessToken.value += 1
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
		void refreshHistory()
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

<style scoped>
.history-tab-switch-enter-active,
.history-tab-switch-leave-active {
	transition:
		opacity 220ms ease-out,
		transform 260ms cubic-bezier(0.16, 1, 0.3, 1),
		filter 220ms ease-out;
}

.history-tab-switch-enter-from,
.history-tab-switch-leave-to {
	opacity: 0;
	filter: blur(2px);
	transform: translateY(8px);
}

.history-tab-switch-enter-to,
.history-tab-switch-leave-from {
	opacity: 1;
	filter: blur(0);
	transform: translateY(0);
}
</style>
