<template>
	<div>
		<div
			class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
		>
			<div>
				<UButton
					:to="localePath('/admin/servers')"
					color="primary"
					variant="ghost"
					icon="i-lucide-arrow-left"
					class="-ml-2 mb-3"
				>
					{{ t('admin.serverStats.back') }}
				</UButton>
				<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
					{{ t('admin.serverStats.title') }}
				</h1>
			</div>
		</div>

		<div
			class="mt-8 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
		>
			<div
				class="grid gap-3 border-b border-slate-200 p-4 dark:border-slate-800 lg:grid-cols-6"
			>
				<USelectMenu
					v-model="filters.player"
					v-model:search-term="playerSearch"
					:items="playerItems"
					value-key="value"
					label-key="label"
					:placeholder="t('admin.serverStats.filters.player')"
					:search-input="{
						placeholder: t('admin.serverStats.filters.playerSearch'),
					}"
					:loading="playersPending"
					ignore-filter
				>
					<template #leading>
						<SkeletonImage
							v-if="filters.player"
							:src="getMinecraftHeadRendererUrl(filters.player)"
							:alt="filters.player"
							class="size-5 shrink-0 overflow-hidden rounded-sm"
							image-class="size-5 object-cover"
							skeleton-class="rounded-sm"
						/>
						<UIcon
							v-else
							name="i-lucide-user"
							class="size-5 shrink-0 text-slate-400"
						/>
					</template>
				</USelectMenu>
				<UInput
					v-model="filters.search"
					icon="i-lucide-search"
					:placeholder="t('admin.serverPlayers.filters.search')"
				/>
				<USelect
					v-model="filters.serverId"
					:items="serverItems"
					:placeholder="t('admin.serverStats.filters.serverId')"
				/>
				<USelect
					v-model="filters.sortField"
					:items="sortFieldItems"
					:placeholder="t('admin.sort.field')"
				/>
				<div class="flex gap-3">
					<USelect
						v-model="filters.sortDirection"
						:items="sortDirectionItems"
						:placeholder="t('admin.sort.direction')"
						class="min-w-0 flex-1"
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
			</div>

			<UTable
				:data="snapshots"
				:columns="columns"
				:loading="pending"
				class="min-h-72"
			>
				<template #player-cell="{ row }">
					<div class="min-w-0">
						<p class="truncate font-medium text-slate-900 dark:text-white">
							{{
								row.original.player.username ??
								t('admin.serverPlayers.empty.unknown')
							}}
						</p>
						<p class="flex min-w-0 items-center gap-1 text-xs text-slate-500">
							<UTooltip
								v-if="row.original.player.uuidSource"
								:text="getUuidSourceText(row.original.player.uuidSource)"
							>
								<span class="truncate">
									{{ row.original.player.uuid }}
								</span>
							</UTooltip>
							<span v-else class="truncate">
								{{ row.original.player.uuid }}
							</span>
						</p>
					</div>
				</template>
				<template #serverId-cell="{ row }">
					<span class="text-xs">
						{{ row.original.player.serverId }}
					</span>
				</template>
				<template #category-cell="{ row }">
					<span class="text-xs">
						{{ row.original.category }}
					</span>
				</template>
				<template #key-cell="{ row }">
					<span class="text-xs">
						{{ row.original.key }}
					</span>
				</template>
				<template #value-cell="{ row }">
					<div class="flex items-center gap-1">
						<span class="max-w-55 truncate text-xs">
							{{ truncatedValueText(row.original) }}
						</span>
						<UButton
							v-if="isValueExpandable(row.original)"
							variant="link"
							size="xs"
							:label="t('admin.valueModal.showAll')"
							@click="openValueModal(row.original)"
						/>
					</div>
				</template>
				<template #observedAt-cell="{ row }">
					{{ formatDate(row.original.observedAt) }}
				</template>
				<template #lastScannedAt-cell="{ row }">
					{{ formatDate(row.original.lastScannedAt) }}
				</template>
				<template #authMeLastLoginAt-cell="{ row }">
					{{ formatDate(row.original.authMe.lastLoginAt) }}
				</template>
				<template #createdAt-cell="{ row }">
					{{ formatDate(row.original.createdAt) }}
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

		<AdminJsonValueModal
			v-model:open="valueModalOpen"
			:value="valueModalState?.value"
			:eyebrow="valueModalState?.eyebrow"
			:title="t('admin.serverStats.valueModalTitle')"
		/>
	</div>
</template>

<script setup lang="ts">
import AdminTablePagination from '~/components/admin/AdminTablePagination.vue'
import type {
	AdminMinecraftAccountsResponse,
	MinecraftServerPlayerStatsDetailInfo,
	MinecraftServerPlayerStatsSnapshotsResponse,
	MinecraftServersResponse,
} from '~/components/admin/types'
import { getMinecraftHeadRendererUrl } from '~/utils/minecraft/body-renderer'
import { resolveMinecraftServerLocalizedName } from '~/utils/minecraft/server-name'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'admin-auth',
})

const localePath = useLocalePath()
const route = useRoute()
const { locale, t } = useI18n()
const ALL_FILTER_VALUE = '__all__'
const page = ref(1)
const pageSize = ref(20)
const getRouteQueryString = (key: string): string => {
	const value = route.query[key]

	return typeof value === 'string' ? value : ''
}
const getFilterQueryValue = (value: string): string | undefined =>
	value === ALL_FILTER_VALUE ? undefined : value
const filters = reactive({
	search: getRouteQueryString('search'),
	serverId: getRouteQueryString('serverId') || ALL_FILTER_VALUE,
	player: getRouteQueryString('player'),
	sortField: 'observedAt',
	sortDirection: 'desc',
})
const playerSearch = ref(filters.player)
const playerQuery = computed(() => ({
	page: 1,
	pageSize: 20,
	search: playerSearch.value || filters.player || undefined,
	sortField: 'username',
	sortDirection: 'asc',
}))
const query = computed(() => ({
	page: page.value,
	pageSize: pageSize.value,
	search: filters.search || undefined,
	serverId: getFilterQueryValue(filters.serverId),
	player: filters.player || undefined,
	sortField: filters.sortField,
	sortDirection: filters.sortDirection,
}))
const { data, pending } =
	await useFetch<MinecraftServerPlayerStatsSnapshotsResponse>(
		'/api/admin/servers/stats',
		{ query },
	)
const { data: playerOptionsData, pending: playersPending } =
	await useFetch<AdminMinecraftAccountsResponse>('/api/admin/players', {
		query: playerQuery,
	})
const { data: serversData } = await useFetch<MinecraftServersResponse>(
	'/api/minecraft/servers',
)
const snapshots = computed(() => data.value?.items ?? [])
const pageMeta = computed(() => ({
	total: data.value?.total ?? 0,
	pageCount: data.value?.pageCount ?? 1,
}))
const playerItems = computed(() => {
	const items = (playerOptionsData.value?.items ?? []).map((player) => ({
		label: player.username,
		value: player.normalizedUsername || player.username,
		description: player.authMe?.email ?? undefined,
		avatar: {
			src: getMinecraftHeadRendererUrl(player.username),
			alt: player.username,
		},
	}))

	if (filters.player && !items.some((item) => item.value === filters.player)) {
		return [
			{
				label: filters.player,
				value: filters.player,
				avatar: {
					src: getMinecraftHeadRendererUrl(filters.player),
					alt: filters.player,
				},
			},
			...items,
		]
	}

	return items
})
const serverItems = computed(() => [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	...(serversData.value?.servers ?? []).map((server) => ({
		label: resolveMinecraftServerLocalizedName(server, locale.value),
		value: server.serverId,
	})),
])
const columns = [
	{ accessorKey: 'player', header: t('admin.serverPlayers.fields.player') },
	{ accessorKey: 'serverId', header: t('admin.serverStats.fields.server') },
	{ accessorKey: 'category', header: t('admin.serverStats.fields.category') },
	{ accessorKey: 'key', header: t('admin.serverStats.fields.key') },
	{ accessorKey: 'value', header: t('admin.serverStats.fields.value') },
	{
		accessorKey: 'observedAt',
		header: t('admin.serverStats.fields.observedAt'),
	},
	{
		accessorKey: 'lastScannedAt',
		header: t('admin.serverStats.fields.lastScannedAt'),
	},
	{
		accessorKey: 'authMeLastLoginAt',
		header: t('admin.serverPlayers.fields.authMeLastLoginAt'),
	},
	{
		accessorKey: 'createdAt',
		header: t('admin.serverPlayers.fields.createdAt'),
	},
]
const sortFieldItems = [
	{ label: t('admin.serverStats.fields.observedAt'), value: 'observedAt' },
	{
		label: t('admin.serverStats.fields.lastScannedAt'),
		value: 'lastScannedAt',
	},
	{ label: t('admin.serverStats.fields.category'), value: 'category' },
	{ label: t('admin.serverStats.fields.key'), value: 'key' },
	{ label: t('admin.serverPlayers.fields.player'), value: 'username' },
	{ label: t('admin.serverPlayers.fields.createdAt'), value: 'createdAt' },
]
const sortDirectionItems = [
	{ label: t('admin.sort.desc'), value: 'desc' },
	{ label: t('admin.sort.asc'), value: 'asc' },
]

const formatDate = (value: string | null): string => {
	if (!value) {
		return t('admin.serverPlayers.empty.unknown')
	}

	return new Intl.DateTimeFormat(locale.value, {
		dateStyle: 'short',
		timeStyle: 'short',
	}).format(new Date(value))
}

const getUuidSourceText = (source: string): string =>
	t('admin.serverPlayers.uuidSourceTooltip', { source })

const VALUE_PREVIEW_LIMIT = 40
const valueModalOpen = ref(false)
const valueModalState = ref<{
	value: unknown
	eyebrow: string
} | null>(null)

const isValueExpandable = (
	row: MinecraftServerPlayerStatsDetailInfo,
): boolean => row.valueText.length > VALUE_PREVIEW_LIMIT

const truncatedValueText = (
	row: MinecraftServerPlayerStatsDetailInfo,
): string =>
	row.valueText.length > VALUE_PREVIEW_LIMIT
		? `${row.valueText.slice(0, VALUE_PREVIEW_LIMIT)}…`
		: row.valueText

const openValueModal = (row: MinecraftServerPlayerStatsDetailInfo): void => {
	valueModalState.value = {
		value: row.value,
		eyebrow: `${row.category}/${row.key}`,
	}
	valueModalOpen.value = true
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
	filters.serverId = ALL_FILTER_VALUE
	filters.player = ''
	playerSearch.value = ''
	filters.sortField = 'observedAt'
	filters.sortDirection = 'desc'
}

const setPageSize = (value: number): void => {
	pageSize.value = value
	page.value = 1
}
</script>
