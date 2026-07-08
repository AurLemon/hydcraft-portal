<template>
	<div>
		<div
			class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
		>
			<div>
				<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
					{{ t('admin.historicalPlayers.title') }}
				</h1>
			</div>
		</div>

		<div
			class="mt-8 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
		>
			<div
				class="grid gap-3 border-b border-slate-200 p-4 dark:border-slate-800 lg:grid-cols-6"
			>
				<UInput
					v-model="filters.search"
					icon="i-lucide-search"
					:placeholder="t('admin.historicalPlayers.filters.search')"
				/>
				<USelect
					v-model="filters.assigned"
					:items="assignedItems"
					:placeholder="t('admin.historicalPlayers.fields.assignedState')"
				/>
				<USelect
					v-model="filters.serverId"
					:items="serverFilterItems"
					:placeholder="t('admin.historicalPlayers.fields.servers')"
				/>
				<USelect
					v-model="filters.sortField"
					:items="sortFieldItems"
					:placeholder="t('admin.sort.field')"
				/>
				<USelect
					v-model="filters.sortDirection"
					:items="sortDirectionItems"
					:placeholder="t('admin.sort.direction')"
				/>
				<div />
				<UButton
					type="button"
					color="neutral"
					variant="soft"
					icon="i-lucide-rotate-ccw"
					@click="resetFilters"
				>
					{{ t('admin.actions.reset') }}
				</UButton>
			</div>

			<UTable
				:data="items"
				:columns="columns"
				:loading="pending"
				class="min-h-72"
			>
				<template #player-cell="{ row }">
					<div class="flex min-w-0 items-center gap-3">
						<SkeletonImage
							v-if="row.original.username"
							:src="getMinecraftHeadRendererUrl(row.original.username)"
							:alt="row.original.username"
							class="size-10 shrink-0 overflow-hidden rounded-md"
							image-class="size-10 object-cover"
							skeleton-class="rounded-md"
						/>
						<div
							v-else
							class="flex size-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
						>
							<UIcon name="i-lucide-user" class="size-5" />
						</div>
						<NuxtLink
							v-if="row.original.username"
							:to="
								localePath(
									`/players/${row.original.normalizedUsername || row.original.username}`,
								)
							"
							class="min-w-0 truncate font-medium text-slate-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
						>
							{{
								row.original.playerIdentity.playerId || row.original.username
							}}
						</NuxtLink>
						<p
							v-else
							class="min-w-0 truncate font-medium text-slate-900 dark:text-white"
						>
							{{
								row.original.playerIdentity.playerId || row.original.username
							}}
						</p>
					</div>
				</template>
				<template #user-cell="{ row }">
					<NuxtLink
						v-if="row.original.boundPortalUser"
						:to="localePath(`/u/${row.original.boundPortalUser.username}`)"
						class="flex min-w-0 items-center gap-2"
					>
						<UAvatar
							:src="row.original.boundPortalUser.avatarUrl || undefined"
							:alt="row.original.boundPortalUser.username"
							size="xs"
						/>
						<span class="truncate text-sm text-slate-900 dark:text-white">
							@{{ row.original.boundPortalUser.username }}
						</span>
					</NuxtLink>
					<span v-else class="text-sm text-slate-500">
						{{ t('admin.historicalPlayers.empty.unassigned') }}
					</span>
				</template>
				<template #servers-cell="{ row }">
					<div class="flex flex-wrap gap-1">
						<UBadge
							v-for="server in getServerRefs(row.original)"
							:key="server.serverId"
							color="neutral"
							variant="soft"
							as-child
						>
							<NuxtLink :to="localePath(`/admin/servers/${server.serverId}`)">
								{{ server.name }}
							</NuxtLink>
						</UBadge>
					</div>
				</template>
				<template #firstJoinedAt-cell="{ row }">
					{{ formatDate(row.original.firstJoinedAt) }}
				</template>
				<template #lastSeenAt-cell="{ row }">
					{{ formatDate(row.original.lastSeenAt) }}
				</template>
				<template #dataEntries-cell="{ row }">
					<div class="inline-flex flex-nowrap gap-1 whitespace-nowrap">
						<UButton
							size="xs"
							:color="
								hasAdvancementsEntry(row.original) ? 'primary' : 'neutral'
							"
							variant="soft"
							:disabled="!hasAdvancementsEntry(row.original)"
							:to="
								hasAdvancementsEntry(row.original)
									? getDataEntryRoute(row.original, 'advancements')
									: undefined
							"
						>
							{{ t('admin.players.dataEntries.advancements') }}
						</UButton>
						<UButton
							size="xs"
							:color="hasStatsEntry(row.original) ? 'primary' : 'neutral'"
							variant="soft"
							:disabled="!hasStatsEntry(row.original)"
							:to="
								hasStatsEntry(row.original)
									? getDataEntryRoute(row.original, 'stats')
									: undefined
							"
						>
							{{ t('admin.players.dataEntries.stats') }}
						</UButton>
					</div>
				</template>
				<template #actions-cell="{ row }">
					<div class="flex flex-wrap gap-2">
						<UButton
							v-if="row.original.boundPortalUser"
							size="xs"
							color="error"
							variant="soft"
							:loading="
								actionAccountId === row.original.id && actionType === 'unassign'
							"
							@click="unassignAccount(row.original.id)"
						>
							{{ t('admin.historicalPlayers.actions.unassign') }}
						</UButton>
						<UButton
							v-else
							size="xs"
							color="primary"
							variant="soft"
							@click="openAssignModal(row.original.id)"
						>
							{{ t('admin.historicalPlayers.actions.assign') }}
						</UButton>
					</div>
				</template>
			</UTable>

			<AdminTablePagination
				:page="page"
				:page-size="pageSize"
				:total="pageMeta.total"
				:page-count="pageMeta.pageCount"
				@update:page="page = $event"
				@update:page-size="setPageSize"
			/>
		</div>

		<UModal v-model:open="assignModalOpen" :ui="{ content: 'max-w-md' }">
			<template #content>
				<div class="grid gap-4 p-5">
					<div>
						<h2 class="text-lg font-semibold text-slate-950 dark:text-white">
							{{ t('admin.historicalPlayers.assignModal.title') }}
						</h2>
						<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
							{{ t('admin.historicalPlayers.assignModal.description') }}
						</p>
					</div>
					<USelectMenu
						v-model="assignUsername"
						v-model:search-term="assignUserSearchTerm"
						:items="assignUserItems"
						value-key="value"
						label-key="label"
						:loading="assignUsersPending"
						:placeholder="t('admin.historicalPlayers.assignModal.username')"
						:search-input="{
							placeholder: t('admin.players.filters.search'),
						}"
						ignore-filter
					>
						<template #item-leading="{ item }">
							<UAvatar
								:src="item.avatarUrl || undefined"
								:alt="item.label"
								size="xs"
							/>
						</template>
						<template #item-label="{ item }">
							<div class="min-w-0">
								<p class="truncate">{{ item.label }}</p>
								<p class="truncate text-xs text-slate-500">
									{{ item.description }}
								</p>
							</div>
						</template>
					</USelectMenu>
					<div class="flex justify-end gap-2">
						<UButton color="neutral" variant="ghost" @click="closeAssignModal">
							{{ t('admin.actions.cancel') }}
						</UButton>
						<UButton
							color="primary"
							:loading="
								actionAccountId === pendingAssignAccountId &&
								actionType === 'assign'
							"
							@click="submitAssign"
						>
							{{ t('admin.actions.save') }}
						</UButton>
					</div>
				</div>
			</template>
		</UModal>
	</div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import AdminTablePagination from '~/components/admin/AdminTablePagination.vue'
import type {
	AdminUsersResponse,
	MinecraftServerSummary,
	MinecraftServersResponse,
} from '~/components/admin/types'
import { getMinecraftHeadRendererUrl } from '~/utils/minecraft/body-renderer'
import type { MinecraftAccountForm } from '~/utils/minecraft/accounts'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'admin-auth',
})

interface AdminHistoricalPlayer extends MinecraftAccountForm {
	serverCount: number
	serverNames: string[]
}

interface AssignUserItem {
	value: string
	label: string
	description: string
	avatarUrl: string | null
}

interface ServerFilterItem {
	label: string
	value: string
}

interface AdminHistoricalPlayersResponse {
	items: AdminHistoricalPlayer[]
	page: number
	pageSize: number
	total: number
	pageCount: number
}

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { notifyError, notifySuccess } = useAdminToast()
const ALL_FILTER_VALUE = '__all__'
const page = ref(1)
const pageSize = ref(20)
const filters = reactive({
	search: '',
	assigned: ALL_FILTER_VALUE,
	serverId: ALL_FILTER_VALUE,
	sortField: 'username',
	sortDirection: 'asc',
})
const query = computed(() => ({
	page: page.value,
	pageSize: pageSize.value,
	search: filters.search || undefined,
	assigned:
		filters.assigned === ALL_FILTER_VALUE ? undefined : filters.assigned,
	serverId:
		filters.serverId === ALL_FILTER_VALUE ? undefined : filters.serverId,
	sortField: filters.sortField,
	sortDirection: filters.sortDirection,
}))

const { data: serversData } = await useFetch<MinecraftServersResponse>(
	'/api/minecraft/servers',
	{
		default: () => ({
			servers: [],
		}),
	},
)

const { data, pending, error, refresh } =
	await useFetch<AdminHistoricalPlayersResponse>(
		'/api/admin/historical-players',
		{
			query,
			default: () => ({
				items: [],
				page: 1,
				pageSize: 20,
				total: 0,
				pageCount: 1,
			}),
		},
	)

const items = computed(() => data.value?.items ?? [])
const pageMeta = computed(() => ({
	total: data.value?.total ?? 0,
	pageCount: data.value?.pageCount ?? 1,
}))
const tableHeader = (label: string) => () =>
	h('span', { class: 'whitespace-nowrap' }, label)
const columns = [
	{
		accessorKey: 'player',
		header: tableHeader(t('admin.historicalPlayers.fields.player')),
	},
	{
		accessorKey: 'user',
		header: tableHeader(t('admin.historicalPlayers.fields.user')),
	},
	{
		accessorKey: 'servers',
		header: tableHeader(t('admin.historicalPlayers.fields.servers')),
	},
	{
		accessorKey: 'firstJoinedAt',
		header: tableHeader(t('admin.historicalPlayers.fields.firstJoinedAt')),
	},
	{
		accessorKey: 'lastSeenAt',
		header: tableHeader(t('admin.historicalPlayers.fields.lastSeenAt')),
	},
	{
		accessorKey: 'dataEntries',
		header: tableHeader(t('admin.players.fields.dataEntries')),
	},
	{
		id: 'actions',
		header: tableHeader(t('admin.historicalPlayers.fields.actions')),
	},
]
const assignedItems = [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	{
		label: t('admin.historicalPlayers.filters.assigned'),
		value: 'assigned',
	},
	{
		label: t('admin.historicalPlayers.filters.unassigned'),
		value: 'unassigned',
	},
]
const resolveServerDisplayName = (server: MinecraftServerSummary): string => {
	switch (locale.value) {
		case 'zh-TW':
			return server.nameZhTw || server.nameZhCn || server.name
		case 'en-US':
			return server.nameEnUs || server.nameZhCn || server.name
		case 'ja-JP':
			return server.nameJaJp || server.nameZhCn || server.name
		default:
			return server.nameZhCn || server.name
	}
}
const serverFilterItems = computed<ServerFilterItem[]>(() => [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	...(serversData.value?.servers ?? []).map((server) => ({
		label: resolveServerDisplayName(server),
		value: server.serverId,
	})),
])
const sortFieldItems = [
	{
		label: t('admin.historicalPlayers.fields.player'),
		value: 'username',
	},
	{
		label: t('admin.historicalPlayers.fields.user'),
		value: 'user',
	},
	{
		label: t('admin.historicalPlayers.fields.servers'),
		value: 'servers',
	},
	{
		label: t('admin.historicalPlayers.fields.firstJoinedAt'),
		value: 'firstJoinedAt',
	},
	{
		label: t('admin.historicalPlayers.fields.lastSeenAt'),
		value: 'lastSeenAt',
	},
]
const sortDirectionItems = [
	{ label: t('admin.sort.asc'), value: 'asc' },
	{ label: t('admin.sort.desc'), value: 'desc' },
]

const assignModalOpen = ref(false)
const pendingAssignAccountId = ref<string | null>(null)
const assignUsername = ref<string | undefined>(undefined)
const assignUserSearchTerm = ref('')
const actionAccountId = ref<string | null>(null)
const actionType = ref<'assign' | 'unassign' | null>(null)
const assignUserQuery = computed(() => ({
	search: assignUserSearchTerm.value || undefined,
	page: 1,
	pageSize: 8,
}))
const {
	data: assignUsersData,
	pending: assignUsersPending,
	refresh: refreshAssignUsers,
} = await useFetch<AdminUsersResponse>('/api/admin/users', {
	query: assignUserQuery,
	immediate: false,
})
const assignUserItems = computed<AssignUserItem[]>(() =>
	(assignUsersData.value?.items ?? []).map((user) => ({
		value: user.username,
		label: user.displayName || user.username,
		description: `@${user.username}`,
		avatarUrl: user.avatarUrl,
	})),
)

watch(error, (value) => value && notifyError(value), { immediate: true })
watch(
	() => ({ ...filters }),
	() => {
		page.value = 1
	},
	{ deep: true },
)
watch(
	() => assignModalOpen.value,
	(open) => {
		if (open) {
			void refreshAssignUsers()
		}
	},
)
watch(assignUserSearchTerm, () => {
	if (assignModalOpen.value) {
		void refreshAssignUsers()
	}
})

const formatDate = (value: string | null): string => {
	if (!value) {
		return t('minecraftAccounts.fields.notAvailable')
	}

	return new Intl.DateTimeFormat(locale.value, {
		dateStyle: 'short',
		timeStyle: 'short',
	}).format(new Date(value))
}

const hasStatsEntry = (account: AdminHistoricalPlayer): boolean =>
	account.playerProfile.hasStats ||
	account.serverViews.some((view) => view.playerProfile.hasStats)

const hasAdvancementsEntry = (account: AdminHistoricalPlayer): boolean =>
	account.playerProfile.hasAdvancements ||
	account.serverViews.some((view) => view.playerProfile.hasAdvancements)

const getDataEntryRoute = (
	account: AdminHistoricalPlayer,
	type: 'stats' | 'advancements',
) =>
	localePath({
		path: `/admin/servers/${type}`,
		query: {
			player: account.normalizedUsername || account.username,
		},
	})

const resetFilters = () => {
	filters.search = ''
	filters.assigned = ALL_FILTER_VALUE
	filters.serverId = ALL_FILTER_VALUE
	filters.sortField = 'username'
	filters.sortDirection = 'asc'
}

const setPageSize = (value: number): void => {
	pageSize.value = value
	page.value = 1
}

const closeAssignModal = () => {
	assignModalOpen.value = false
	pendingAssignAccountId.value = null
	assignUsername.value = undefined
	assignUserSearchTerm.value = ''
}

const openAssignModal = (accountId: string) => {
	pendingAssignAccountId.value = accountId
	assignUsername.value = undefined
	assignUserSearchTerm.value = ''
	assignModalOpen.value = true
}

const submitAssign = async () => {
	if (!pendingAssignAccountId.value || !assignUsername.value?.trim()) {
		return
	}

	actionAccountId.value = pendingAssignAccountId.value
	actionType.value = 'assign'

	try {
		await $fetch(
			`/api/admin/historical-players/${pendingAssignAccountId.value}/assign`,
			{
				method: 'POST',
				body: {
					username: assignUsername.value.trim(),
				},
			},
		)
		closeAssignModal()
		await refresh()
		notifySuccess({
			title: t('admin.historicalPlayers.notifications.assigned'),
		})
	} catch (assignError) {
		notifyError(assignError, {
			title: t('admin.historicalPlayers.notifications.assignFailed'),
		})
	} finally {
		actionAccountId.value = null
		actionType.value = null
	}
}

const unassignAccount = async (accountId: string) => {
	actionAccountId.value = accountId
	actionType.value = 'unassign'

	try {
		await $fetch(`/api/admin/historical-players/${accountId}/unassign`, {
			method: 'POST',
		})
		await refresh()
		notifySuccess({
			title: t('admin.historicalPlayers.notifications.unassigned'),
		})
	} catch (unassignError) {
		notifyError(unassignError, {
			title: t('admin.historicalPlayers.notifications.unassignFailed'),
		})
	} finally {
		actionAccountId.value = null
		actionType.value = null
	}
}

const getServerRefs = (account: AdminHistoricalPlayer) =>
	account.serverViews
		.filter((view) => view.serverId)
		.map((view) => ({
			serverId: view.serverId as string,
			name: view.serverName || view.label,
		}))
</script>
