<template>
	<div class="-mt-2">
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
				class="grid gap-3 border-b border-slate-200 p-4 dark:border-slate-800 lg:grid-cols-7"
			>
				<UInput
					v-model="filters.search"
					icon="i-lucide-search"
					:placeholder="t('admin.players.filters.search')"
				/>
				<USelect
					v-model="filters.status"
					:items="statusItems"
					:placeholder="t('admin.players.fields.status')"
				/>
				<USelect
					v-model="filters.source"
					:items="sourceItems"
					:placeholder="t('admin.players.fields.source')"
				/>
				<USelect
					v-model="filters.linked"
					:items="linkedItems"
					:placeholder="t('admin.players.fields.linkedUser')"
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
					<div class="min-w-0">
						<p
							class="flex min-w-0 items-center gap-1 font-medium text-slate-900 dark:text-white"
						>
							<span class="truncate">{{ row.original.username }}</span>
							<UTooltip
								v-if="hasSameNameSplit(row.original.observed.sameNameUuidCount)"
								:text="
									getSameNameSplitMessage(
										row.original.observed.sameNameUuidCount,
									)
								"
							>
								<UIcon
									name="i-lucide-triangle-alert"
									class="size-3.5 shrink-0 text-amber-500"
								/>
							</UTooltip>
							<UBadge
								v-if="row.original.isPrimary"
								color="primary"
								variant="subtle"
							>
								{{ t('admin.players.states.primary') }}
							</UBadge>
						</p>
						<p class="truncate text-xs text-slate-500">
							{{ row.original.authmeName ?? t('admin.players.empty.noAuthMe') }}
						</p>
					</div>
				</template>
				<template #user-cell="{ row }">
					<div v-if="row.original.user" class="flex min-w-0 items-center gap-2">
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
					</div>
					<span v-else class="text-sm text-slate-500">{{
						t('admin.players.empty.notLinked')
					}}</span>
				</template>
				<template #status-cell="{ row }">
					<UBadge :color="getStatusColor(row.original.status)" variant="subtle">
						{{ row.original.status }}
					</UBadge>
				</template>
				<template #source-cell="{ row }">
					<UBadge color="neutral" variant="subtle">{{
						row.original.source
					}}</UBadge>
				</template>
				<template #observed-cell="{ row }">
					<div class="flex flex-wrap gap-1">
						<UBadge color="neutral" variant="subtle">
							{{
								t('admin.players.observed.serverPlayers', {
									count: row.original.observed.serverPlayerCount,
								})
							}}
						</UBadge>
						<UBadge color="neutral" variant="subtle">
							{{
								t('admin.players.observed.servers', {
									count: row.original.observed.serverCount,
								})
							}}
						</UBadge>
					</div>
				</template>
				<template #firstJoinedAt-cell="{ row }">
					{{ formatDate(row.original.firstJoinedAt) }}
				</template>
				<template #lastSeenAt-cell="{ row }">
					{{ formatDate(row.original.lastSeenAt) }}
				</template>
				<template #createdAt-cell="{ row }">
					{{ formatDate(row.original.createdAt) }}
				</template>
				<template #updatedAt-cell="{ row }">
					{{ formatDate(row.original.updatedAt) }}
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
	</div>
</template>

<script setup lang="ts">
import AdminTablePagination from '~/components/admin/AdminTablePagination.vue'
import type { AdminMinecraftAccountsResponse } from '~/components/admin/types'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'admin-auth',
})

const { locale, t } = useI18n()
const ALL_FILTER_VALUE = '__all__'
const page = ref(1)
const pageSize = ref(20)
const filters = reactive({
	search: '',
	status: ALL_FILTER_VALUE,
	source: ALL_FILTER_VALUE,
	linked: ALL_FILTER_VALUE,
	sortField: 'updatedAt',
	sortDirection: 'desc',
})
const getFilterQueryValue = (value: string): string | undefined =>
	value === ALL_FILTER_VALUE ? undefined : value
const query = computed(() => ({
	page: page.value,
	pageSize: pageSize.value,
	search: filters.search || undefined,
	status: getFilterQueryValue(filters.status),
	source: getFilterQueryValue(filters.source),
	linked: getFilterQueryValue(filters.linked),
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
const columns = [
	{ accessorKey: 'player', header: t('admin.players.fields.player') },
	{ accessorKey: 'user', header: t('admin.players.fields.linkedUser') },
	{ accessorKey: 'status', header: t('admin.players.fields.status') },
	{ accessorKey: 'source', header: t('admin.players.fields.source') },
	{ accessorKey: 'observed', header: t('admin.players.fields.observed') },
	{
		accessorKey: 'firstJoinedAt',
		header: t('admin.players.fields.firstJoinedAt'),
	},
	{ accessorKey: 'lastSeenAt', header: t('admin.players.fields.lastSeenAt') },
	{ accessorKey: 'createdAt', header: t('admin.players.fields.createdAt') },
	{ accessorKey: 'updatedAt', header: t('admin.players.fields.updatedAt') },
]
const statusItems = [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	{ label: 'PENDING', value: 'PENDING' },
	{ label: 'VERIFIED', value: 'VERIFIED' },
	{ label: 'IMPORTED', value: 'IMPORTED' },
	{ label: 'UNLINKED', value: 'UNLINKED' },
	{ label: 'CONFLICTED', value: 'CONFLICTED' },
]
const sourceItems = [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	{ label: 'PORTAL', value: 'PORTAL' },
	{ label: 'AUTHME', value: 'AUTHME' },
	{ label: 'MANUAL', value: 'MANUAL' },
	{ label: 'MIGRATION', value: 'MIGRATION' },
	{ label: 'OTHER', value: 'OTHER' },
]
const linkedItems = [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	{ label: t('admin.players.filters.linked'), value: 'linked' },
	{ label: t('admin.players.filters.unlinked'), value: 'unlinked' },
]
const sortFieldItems = [
	{ label: t('admin.players.fields.updatedAt'), value: 'updatedAt' },
	{ label: t('admin.players.fields.lastSeenAt'), value: 'lastSeenAt' },
	{ label: t('admin.players.fields.firstJoinedAt'), value: 'firstJoinedAt' },
	{ label: t('admin.players.fields.player'), value: 'username' },
	{ label: t('admin.players.fields.status'), value: 'status' },
	{ label: t('admin.players.fields.source'), value: 'source' },
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

const hasSameNameSplit = (count: number): boolean => count > 1

const getSameNameSplitMessage = (count: number): string =>
	t('admin.players.sameNameSplitTooltip', { count })

const getStatusColor = (status: string) => {
	if (status === 'VERIFIED') {
		return 'success'
	}

	if (status === 'CONFLICTED') {
		return 'warning'
	}

	if (status === 'UNLINKED') {
		return 'neutral'
	}

	return 'primary'
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
	filters.status = ALL_FILTER_VALUE
	filters.source = ALL_FILTER_VALUE
	filters.linked = ALL_FILTER_VALUE
	filters.sortField = 'updatedAt'
	filters.sortDirection = 'desc'
}

const setPageSize = (value: number): void => {
	pageSize.value = value
	page.value = 1
}
</script>
