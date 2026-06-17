<template>
	<div class="-mt-2">
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
					{{ t('admin.serverAdvancements.back') }}
				</UButton>
				<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
					{{ t('admin.serverAdvancements.title') }}
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
					:placeholder="t('admin.serverAdvancements.filters.player')"
					:search-input="{
						placeholder: t('admin.serverAdvancements.filters.playerSearch'),
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
					:placeholder="t('admin.serverAdvancements.filters.serverId')"
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
								<span class="truncate font-mono">
									{{ row.original.player.uuid }}
								</span>
							</UTooltip>
							<span v-else class="truncate font-mono">
								{{ row.original.player.uuid }}
							</span>
						</p>
					</div>
				</template>
				<template #serverId-cell="{ row }">
					<span class="font-mono text-xs">
						{{ row.original.player.serverId }}
					</span>
				</template>
				<template #advancementKey-cell="{ row }">
					<span class="font-mono text-xs">
						{{ row.original.advancementKey }}
					</span>
				</template>
				<template #done-cell="{ row }">
					<UBadge
						:color="row.original.done ? 'primary' : 'neutral'"
						variant="subtle"
					>
						{{
							row.original.done
								? t('admin.serverPlayers.states.yes')
								: t('admin.serverPlayers.states.no')
						}}
					</UBadge>
				</template>
				<template #criteria-cell="{ row }">
					<div class="flex items-center gap-1">
						<UTooltip :text="formatCriteria(row.original.completedCriteria)">
							<UBadge color="neutral" variant="subtle">
								{{ row.original.completedCriteriaCount }} /
								{{ row.original.criteriaCount }}
							</UBadge>
						</UTooltip>
						<UButton
							v-if="row.original.completedCriteria.length"
							variant="link"
							size="xs"
							:label="t('admin.valueModal.showAll')"
							@click="openCriteriaModal(row.original)"
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
			v-model:open="criteriaModalOpen"
			:value="criteriaModalState?.value"
			:eyebrow="criteriaModalState?.eyebrow"
			:title="t('admin.serverAdvancements.criteriaModalTitle')"
		/>
	</div>
</template>

<script setup lang="ts">
import AdminTablePagination from '~/components/admin/AdminTablePagination.vue'
import type {
	AdminMinecraftAccountsResponse,
	MinecraftServerPlayerAdvancementDetailInfo,
	MinecraftServerPlayerAdvancementsSnapshotsResponse,
	MinecraftServersResponse,
} from '~/components/admin/types'
import { getMinecraftHeadRendererUrl } from '~/utils/minecraft/body-renderer'

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
	await useFetch<MinecraftServerPlayerAdvancementsSnapshotsResponse>(
		'/api/admin/servers/advancements',
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
		label: server.name,
		value: server.serverId,
	})),
])
const columns = [
	{ accessorKey: 'player', header: t('admin.serverPlayers.fields.player') },
	{
		accessorKey: 'serverId',
		header: t('admin.serverAdvancements.fields.server'),
	},
	{
		accessorKey: 'advancementKey',
		header: t('admin.serverAdvancements.fields.advancementKey'),
	},
	{
		accessorKey: 'done',
		header: t('admin.serverAdvancements.fields.done'),
	},
	{
		accessorKey: 'criteria',
		header: t('admin.serverAdvancements.fields.criteria'),
	},
	{
		accessorKey: 'observedAt',
		header: t('admin.serverAdvancements.fields.observedAt'),
	},
	{
		accessorKey: 'lastScannedAt',
		header: t('admin.serverAdvancements.fields.lastScannedAt'),
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
	{
		label: t('admin.serverAdvancements.fields.observedAt'),
		value: 'observedAt',
	},
	{
		label: t('admin.serverAdvancements.fields.lastScannedAt'),
		value: 'lastScannedAt',
	},
	{
		label: t('admin.serverAdvancements.fields.advancementKey'),
		value: 'advancementKey',
	},
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

const formatCriteria = (criteria: string[]): string =>
	criteria.length
		? criteria.join('\n')
		: t('admin.serverAdvancements.empty.noCriteria')

const getUuidSourceText = (source: string): string =>
	t('admin.serverPlayers.uuidSourceTooltip', { source })

const criteriaModalOpen = ref(false)
const criteriaModalState = ref<{
	value: unknown
	eyebrow: string
} | null>(null)

const openCriteriaModal = (
	row: MinecraftServerPlayerAdvancementDetailInfo,
): void => {
	criteriaModalState.value = {
		value: row.completedCriteria,
		eyebrow: row.advancementKey,
	}
	criteriaModalOpen.value = true
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
