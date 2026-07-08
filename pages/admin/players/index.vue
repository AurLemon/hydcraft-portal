<template>
	<div>
		<div
			class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
		>
			<div>
				<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
					{{ t('admin.players.title') }}
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
					:placeholder="t('admin.players.filters.search')"
				/>
				<USelect
					v-model="filters.linked"
					:items="linkedItems"
					:placeholder="t('admin.players.fields.linkedUser')"
				/>
				<UInput
					v-model="filters.group"
					icon="i-lucide-shield"
					:placeholder="t('admin.players.filters.group')"
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
				:data="players"
				:columns="columns"
				:loading="pending"
				class="min-h-72"
			>
				<template #player-cell="{ row }">
					<div class="flex min-w-0 items-center gap-3">
						<SkeletonImage
							:src="getMinecraftHeadRendererUrl(row.original.username)"
							:alt="row.original.username"
							class="size-10 shrink-0 overflow-hidden rounded-md"
							image-class="size-10 object-cover"
							skeleton-class="rounded-md"
						/>
						<NuxtLink
							:to="
								localePath(
									`/players/${row.original.normalizedUsername || row.original.username}`,
								)
							"
							class="min-w-0 truncate font-medium text-slate-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
						>
							{{ row.original.username }}
						</NuxtLink>
					</div>
				</template>
				<template #user-cell="{ row }">
					<NuxtLink
						v-if="row.original.user"
						:to="localePath(`/u/${row.original.user.username}`)"
						class="flex min-w-0 items-center gap-2"
					>
						<UAvatar
							:src="row.original.user.avatarUrl || undefined"
							:alt="row.original.user.displayName || row.original.user.username"
							size="xs"
						/>
						<span class="min-w-0">
							<span
								class="block truncate text-sm text-slate-900 dark:text-white"
							>
								{{
									row.original.user.displayName || row.original.user.username
								}}
							</span>
							<span class="block truncate text-xs text-slate-500">
								@{{ row.original.user.username }}
							</span>
						</span>
					</NuxtLink>
					<span v-else class="text-sm text-slate-500">{{
						t('admin.players.empty.notLinked')
					}}</span>
				</template>
				<template #authMeRegisteredAt-cell="{ row }">
					{{ formatDate(row.original.authMe?.registeredAt ?? null) }}
				</template>
				<template #authMeRegisterIp-cell="{ row }">
					<div class="min-w-0">
						<p class="truncate text-sm text-slate-900 dark:text-white">
							{{
								getIpLocationDisplay(row.original.authMe?.registerIpLocation)
							}}
						</p>
						<p class="truncate text-xs text-slate-500">
							{{ getIpAddressDisplay(row.original.authMe?.registerIp ?? null) }}
						</p>
					</div>
				</template>
				<template #authMeLastLoginAt-cell="{ row }">
					{{ formatDate(row.original.authMe?.lastLoginAt ?? null) }}
				</template>
				<template #authMeLastIp-cell="{ row }">
					<div class="min-w-0">
						<p class="truncate text-sm text-slate-900 dark:text-white">
							{{ getIpLocationDisplay(row.original.authMe?.lastIpLocation) }}
						</p>
						<p class="truncate text-xs text-slate-500">
							{{ getIpAddressDisplay(row.original.authMe?.lastIp ?? null) }}
						</p>
					</div>
				</template>
				<template #luckPermsPrimaryGroup-cell="{ row }">
					<UBadge
						v-if="row.original.luckPerms?.primaryGroup"
						color="neutral"
						variant="subtle"
					>
						{{ row.original.luckPerms.primaryGroup }}
					</UBadge>
					<span v-else class="text-sm text-slate-500">
						{{ t('admin.players.empty.noGroup') }}
					</span>
				</template>
				<template #worldFirstJoinedAt-cell="{ row }">
					{{ formatDate(row.original.worldJoin.firstJoinedAt) }}
				</template>
				<template #worldLastJoinedAt-cell="{ row }">
					{{ formatDate(row.original.worldJoin.lastJoinedAt) }}
				</template>
				<template #servers-cell="{ row }">
					<div
						v-if="getServerRefs(row.original).length"
						class="flex flex-nowrap gap-1 whitespace-nowrap"
					>
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
					<span v-else class="text-sm text-slate-500">
						{{ t('admin.players.empty.unknown') }}
					</span>
				</template>
				<template #dataEntries-cell="{ row }">
					<div class="inline-flex flex-nowrap gap-1 whitespace-nowrap">
						<UButton
							size="xs"
							color="neutral"
							variant="soft"
							@click="openLoginHistory(row.original)"
						>
							{{ t('admin.players.dataEntries.loginHistory') }}
						</UButton>
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

		<MinecraftSessionHistoryModal
			:open="loginHistoryOpen"
			:title="loginHistoryTitle"
			:recent-sessions-label="t('admin.players.sessionHistory.allSessions')"
			:not-available-label="t('admin.players.empty.unknown')"
			:show-server="true"
			:fetch-sessions="fetchLoginHistorySessions"
			@update:open="loginHistoryOpen = $event"
		/>
	</div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import AdminTablePagination from '~/components/admin/AdminTablePagination.vue'
import type {
	AdminMinecraftAccountInfo,
	AdminMinecraftAccountSessionHistoryItem,
	AdminMinecraftAccountSessionHistoryResponse,
	AdminMinecraftAccountsResponse,
	IpLocationSummary,
} from '~/components/admin/types'
import { getMinecraftHeadRendererUrl } from '~/utils/minecraft/body-renderer'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'admin-auth',
})

const { locale, t } = useI18n()
const localePath = useLocalePath()
const ALL_FILTER_VALUE = '__all__'
const page = ref(1)
const pageSize = ref(20)
const loginHistoryOpen = ref(false)
const selectedAccount = ref<AdminMinecraftAccountInfo | null>(null)
const filters = reactive({
	search: '',
	linked: ALL_FILTER_VALUE,
	group: '',
	sortField: 'authMeLastLoginAt',
	sortDirection: 'desc',
})
const getFilterQueryValue = (value: string): string | undefined =>
	value === ALL_FILTER_VALUE ? undefined : value
const query = computed(() => ({
	page: page.value,
	pageSize: pageSize.value,
	search: filters.search || undefined,
	linked: getFilterQueryValue(filters.linked),
	group: filters.group || undefined,
	sortField: filters.sortField,
	sortDirection: filters.sortDirection,
}))
const { data, pending } = await useFetch<AdminMinecraftAccountsResponse>(
	'/api/admin/players',
	{ query },
)
const players = computed(() => data.value?.items ?? [])
const pageMeta = computed(() => ({
	total: data.value?.total ?? 0,
	pageCount: data.value?.pageCount ?? 1,
}))
const loginHistoryTitle = computed(
	() =>
		selectedAccount.value?.username ??
		selectedAccount.value?.authmeName ??
		selectedAccount.value?.uuid ??
		'-',
)
const tableHeader = (label: string) => () =>
	h('span', { class: 'whitespace-nowrap' }, label)
const columns = [
	{
		accessorKey: 'player',
		header: tableHeader(t('admin.players.fields.player')),
	},
	{
		accessorKey: 'user',
		header: tableHeader(t('admin.players.fields.linkedUser')),
	},
	{
		accessorKey: 'authMeRegisteredAt',
		header: tableHeader(t('admin.players.fields.authMeRegisteredAt')),
	},
	{
		accessorKey: 'authMeRegisterIp',
		header: tableHeader(t('admin.players.fields.authMeRegisterIp')),
	},
	{
		accessorKey: 'authMeLastLoginAt',
		header: tableHeader(t('admin.players.fields.authMeLastLoginAt')),
	},
	{
		accessorKey: 'authMeLastIp',
		header: tableHeader(t('admin.players.fields.authMeLastIp')),
	},
	{
		accessorKey: 'luckPermsPrimaryGroup',
		header: tableHeader(t('admin.players.fields.luckPermsPrimaryGroup')),
	},
	{
		accessorKey: 'worldFirstJoinedAt',
		header: tableHeader(t('admin.players.fields.worldFirstJoinedAt')),
	},
	{
		accessorKey: 'worldLastJoinedAt',
		header: tableHeader(t('admin.players.fields.worldLastJoinedAt')),
	},
	{
		accessorKey: 'servers',
		header: tableHeader(t('admin.players.fields.servers')),
	},
	{
		accessorKey: 'dataEntries',
		header: tableHeader(t('admin.players.fields.dataEntries')),
	},
]
const linkedItems = [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	{ label: t('admin.players.filters.linked'), value: 'linked' },
	{ label: t('admin.players.filters.unlinked'), value: 'unlinked' },
]
const sortFieldItems = [
	{
		label: t('admin.players.fields.authMeLastLoginAt'),
		value: 'authMeLastLoginAt',
	},
	{
		label: t('admin.players.fields.authMeRegisteredAt'),
		value: 'authMeRegisteredAt',
	},
	{
		label: t('admin.players.fields.authMeSyncedAt'),
		value: 'authMeSyncedAt',
	},
	{
		label: t('admin.players.fields.luckPermsPrimaryGroup'),
		value: 'luckPermsPrimaryGroup',
	},
	{
		label: t('admin.players.fields.worldFirstJoinedAt'),
		value: 'worldFirstJoinedAt',
	},
	{
		label: t('admin.players.fields.worldLastJoinedAt'),
		value: 'worldLastJoinedAt',
	},
	{ label: t('admin.players.fields.player'), value: 'username' },
	{ label: t('admin.players.fields.updatedAt'), value: 'updatedAt' },
]
const sortDirectionItems = [
	{ label: t('admin.sort.desc'), value: 'desc' },
	{ label: t('admin.sort.asc'), value: 'asc' },
]

const formatDate = (value: string | null): string => {
	if (!value) {
		return t('admin.players.empty.unknown')
	}

	return new Intl.DateTimeFormat(locale.value, {
		dateStyle: 'short',
		timeStyle: 'short',
	}).format(new Date(value))
}

const getIpLocationDisplay = (
	ipLocation: IpLocationSummary | null | undefined,
): string => ipLocation?.display ?? t('admin.players.empty.unknownLocation')

const getIpAddressDisplay = (ipAddress: string | null): string =>
	ipAddress ?? t('admin.players.empty.unknown')

const getServerRefs = (
	account: AdminMinecraftAccountInfo,
): Array<{ serverId: string; name: string }> => {
	const refs = new Map<string, { serverId: string; name: string }>()

	for (const link of account.serverLinks) {
		if (refs.has(link.serverId)) {
			continue
		}

		refs.set(link.serverId, {
			serverId: link.serverId,
			name: link.serverName ?? link.serverId,
		})
	}

	return Array.from(refs.values())
}

const hasStatsEntry = (account: AdminMinecraftAccountInfo): boolean =>
	account.serverLinks.some((link) => link.hasStats)

const hasAdvancementsEntry = (account: AdminMinecraftAccountInfo): boolean =>
	account.serverLinks.some((link) => link.hasAdvancements)

const getDataEntryRoute = (
	account: AdminMinecraftAccountInfo,
	type: 'stats' | 'advancements',
) => {
	return localePath({
		path: `/admin/servers/${type}`,
		query: { player: account.normalizedUsername || account.username },
	})
}

const openLoginHistory = (account: AdminMinecraftAccountInfo): void => {
	selectedAccount.value = account
	loginHistoryOpen.value = true
}

const fetchLoginHistorySessions = async (): Promise<{
	sessions: AdminMinecraftAccountSessionHistoryItem[]
}> => {
	if (!selectedAccount.value?.id) {
		return {
			sessions: [],
		}
	}

	const response = await $fetch<AdminMinecraftAccountSessionHistoryResponse>(
		`/api/admin/players/${selectedAccount.value.id}/sessions`,
	)

	return {
		sessions: response.sessions,
	}
}

watch(
	() => ({ ...filters }),
	() => {
		page.value = 1
	},
	{ deep: true },
)

const resetFilters = (): void => {
	filters.search = ''
	filters.linked = ALL_FILTER_VALUE
	filters.group = ''
	filters.sortField = 'authMeLastLoginAt'
	filters.sortDirection = 'desc'
}

const setPageSize = (value: number): void => {
	pageSize.value = value
	page.value = 1
}
</script>
