<template>
	<div :class="isImmersiveView ? '-mt-24 lg:-mt-36' : ''">
		<div
			class="pointer-events-none fixed inset-x-0 bottom-3 z-90 flex justify-center px-3 sm:bottom-4"
		>
			<MinecraftAccountsViewToolbar
				class="pointer-events-auto"
				:tabs="tabItems"
				:active-tab="activeTab"
				:view-mode="viewMode"
				:accounts="accounts"
				:selected-account="selectedAccount"
				:saving-id="savingId"
				:unbinding-id="unbindingId"
				:unbind-success-token="unbindSuccessToken"
				@update:active-tab="void setActiveTab($event)"
				@update:view-mode="void setViewMode($event)"
				@bind="bindOpen = true"
				@save="saveAccount"
				@unbind="unbindAccount"
			/>
		</div>

		<div
			v-if="initialLoading"
			:class="isImmersiveView ? 'h-dvh' : 'grid gap-4 pt-20 sm:pt-16'"
		>
			<USkeleton
				:class="
					isImmersiveView
						? 'h-full w-full rounded-none bg-slate-900'
						: 'h-160 rounded-3xl'
				"
			/>
		</div>
		<div
			v-else-if="accountError && !accountLoaded"
			:class="
				isImmersiveView
					? 'immersive-site-shell flex h-dvh items-center justify-center pt-24 lg:pt-36'
					: 'pt-20 sm:pt-16'
			"
		>
			<UAlert
				color="error"
				icon="i-lucide-circle-alert"
				:title="t('minecraftAccounts.empty.loadFailed')"
			/>
		</div>
		<template v-else>
			<template v-if="isImmersiveView">
				<div
					v-if="immersiveHistoryPending"
					class="h-dvh bg-slate-950 pt-44 lg:pt-56"
				>
					<USkeleton class="h-full w-full rounded-none bg-slate-900" />
				</div>
				<div
					v-else-if="immersiveHistoryFailed"
					class="immersive-site-shell flex h-dvh items-center justify-center pt-44 text-white lg:pt-56"
				>
					<UAlert
						color="error"
						icon="i-lucide-circle-alert"
						:title="t('minecraftAccounts.history.loadFailed')"
					/>
				</div>
				<PlayerImmersiveHero
					v-else-if="selectedImmersiveAccount"
					:account="selectedImmersiveAccount"
					:accounts="immersiveAccounts"
					:selected-account-id="selectedImmersiveAccount.id"
					:has-overlay-toolbar="true"
					:show-bound-portal-user="false"
					@select-account="immersiveSelectedAccountId = $event"
				/>
				<div
					v-else
					class="flex h-dvh items-center justify-center bg-slate-950 pt-40 text-white lg:pt-52"
				>
					<PageInlineException
						:icon="
							activeTab === 'historical' ? 'i-lucide-archive' : 'i-lucide-box'
						"
						:title="immersiveEmptyTitle"
					>
						<p class="text-sm leading-6 text-white/70">
							{{ immersiveEmptyDescription }}
						</p>
					</PageInlineException>
				</div>
			</template>

			<Transition v-else name="history-tab-switch" mode="out-in">
				<div :key="activeTab" class="grid gap-4 pb-24">
					<template v-if="activeTab === 'official'">
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
					</template>

					<template v-else-if="activeTab === 'historical'">
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
					</template>

					<div v-else class="grid gap-6">
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
				</div>
			</Transition>
		</template>

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
	headerVariant: 'minecraftAccounts',
	pageContainerVariant: 'minecraftAccounts',
	middleware: 'portal-auth',
	pageTransition: {
		name: 'player-immersive',
		mode: 'out-in',
	},
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

type MinecraftTabKey = 'official' | 'historical' | 'all'
type MinecraftViewMode = 'immersive' | 'list'

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
const immersiveSelectedAccountId = ref<string | null>(null)
const actionSelectedAccountId = ref<string | null>(null)
const DEFAULT_MINECRAFT_TAB: MinecraftTabKey = 'official'
const DEFAULT_MINECRAFT_VIEW: MinecraftViewMode = 'immersive'
const MINECRAFT_TAB_KEYS = [
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

const parseMinecraftViewQuery = (value: unknown): MinecraftViewMode =>
	readTabQueryValue(value) === 'list' ? 'list' : DEFAULT_MINECRAFT_VIEW

const viewMode = computed<MinecraftViewMode>(() =>
	parseMinecraftViewQuery(route.query.view),
)
const isImmersiveView = computed(() => viewMode.value === 'immersive')

const setViewMode = async (nextViewMode: MinecraftViewMode): Promise<void> => {
	if (viewMode.value === nextViewMode) {
		return
	}

	const nextQuery = {
		...route.query,
	} as Record<string, string | string[] | undefined>

	if (nextViewMode === DEFAULT_MINECRAFT_VIEW) {
		delete nextQuery.view
	} else {
		nextQuery.view = nextViewMode
	}

	await router.replace({ query: nextQuery })
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
		accounts.value.find(
			(account) => account.id === actionSelectedAccountId.value,
		) ?? primaryAccount.value,
)

watch(
	accounts,
	(list) => {
		const actionAccountExists = actionSelectedAccountId.value
			? list.some((account) => account.id === actionSelectedAccountId.value)
			: false

		if (!actionAccountExists) {
			actionSelectedAccountId.value =
				list.find((account) => account.isPrimary)?.id ?? list[0]?.id ?? null
		}
	},
	{ immediate: true },
)

watch(immersiveSelectedAccountId, (accountId) => {
	if (accountId && accounts.value.some((account) => account.id === accountId)) {
		actionSelectedAccountId.value = accountId
	}
})

const allImmersiveAccounts = computed<MinecraftAccountForm[]>(() => {
	const accountsById = new Map<string, MinecraftAccountForm>()

	for (const account of accounts.value) {
		accountsById.set(account.id, account)
	}

	for (const account of historicalAccounts.value) {
		if (!accountsById.has(account.id)) {
			accountsById.set(account.id, account)
		}
	}

	return Array.from(accountsById.values())
})

const immersiveAccounts = computed<MinecraftAccountForm[]>(() => {
	if (activeTab.value === 'official') {
		return accounts.value
	}

	if (activeTab.value === 'historical') {
		return historicalAccounts.value
	}

	return allImmersiveAccounts.value
})

const selectedImmersiveAccount = computed<MinecraftAccountForm | null>(
	() =>
		immersiveAccounts.value.find(
			(account) => account.id === immersiveSelectedAccountId.value,
		) ??
		immersiveAccounts.value[0] ??
		null,
)

const immersiveEmptyTitle = computed(() =>
	activeTab.value === 'official'
		? t('minecraftAccounts.tabs.officialEmptyTitle')
		: t('minecraftAccounts.history.emptyTitle'),
)
const immersiveEmptyDescription = computed(() =>
	activeTab.value === 'official'
		? t('minecraftAccounts.tabs.officialEmptyDescription')
		: t('minecraftAccounts.history.emptyDescription'),
)
const immersiveHistoryPending = computed(
	() =>
		activeTab.value !== 'official' &&
		historyPending.value &&
		!historyLoaded.value,
)
const immersiveHistoryFailed = computed(
	() =>
		activeTab.value !== 'official' &&
		Boolean(historyError.value) &&
		!historyLoaded.value,
)

watch(
	immersiveAccounts,
	(list) => {
		const selectedAccountExists = immersiveSelectedAccountId.value
			? list.some((account) => account.id === immersiveSelectedAccountId.value)
			: false

		if (selectedAccountExists) {
			return
		}

		immersiveSelectedAccountId.value =
			list.find((account) => account.isPrimary)?.id ?? list[0]?.id ?? null
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
