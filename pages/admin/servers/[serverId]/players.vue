<template>
	<div>
		<div
			class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
		>
			<div>
				<UButton
					:to="localePath(`/admin/servers/${serverId}`)"
					color="primary"
					variant="ghost"
					icon="i-lucide-arrow-left"
					class="-ml-2 mb-3"
				>
					{{ t('admin.serverPlayers.back') }}
				</UButton>
				<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
					{{ t('admin.serverPlayers.title') }}
				</h1>
				<p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
					{{ serverId }}
				</p>
			</div>
			<UButton
				type="button"
				color="error"
				variant="soft"
				icon="i-lucide-refresh-cw"
				class="self-start md:self-end"
				@click="resetSyncOpen = true"
			>
				{{ t('admin.serverPlayers.actions.resetSync') }}
			</UButton>
		</div>

		<div
			class="mt-8 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
		>
			<div
				class="grid gap-3 border-b border-slate-200 p-4 dark:border-slate-800 lg:grid-cols-5"
			>
				<UInput
					v-model="filters.search"
					icon="i-lucide-search"
					:placeholder="t('admin.serverPlayers.filters.search')"
				/>
				<UInput
					v-model="filters.group"
					icon="i-lucide-shield"
					:placeholder="t('admin.serverPlayers.filters.group')"
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
							v-if="row.original.username"
							:src="getMinecraftHeadRendererUrl(row.original.username)"
							:alt="row.original.username"
							class="size-10 shrink-0 overflow-hidden rounded-md"
							image-class="size-10 object-cover"
							skeleton-class="rounded-md"
						/>
						<USkeleton v-else class="size-10 shrink-0 rounded-md" />
						<div class="min-w-0">
							<p class="truncate font-medium text-slate-900 dark:text-white">
								{{
									row.original.username ??
									t('admin.serverPlayers.empty.unknown')
								}}
							</p>
							<p class="flex min-w-0 items-center gap-1 text-xs text-slate-500">
								<UTooltip
									v-if="row.original.uuidSource"
									:text="getUuidSourceText(row.original.uuidSource)"
								>
									<span class="truncate">
										{{
											row.original.uuid ??
											t('admin.serverPlayers.empty.unknown')
										}}
									</span>
								</UTooltip>
								<span v-else class="truncate">
									{{
										row.original.uuid ?? t('admin.serverPlayers.empty.unknown')
									}}
								</span>
								<UTooltip
									v-if="hasConflict(row.original.conflictState)"
									:text="getConflictMessage(row.original.conflictState)"
								>
									<UIcon
										name="i-lucide-triangle-alert"
										class="size-3.5 shrink-0 text-amber-500"
									/>
								</UTooltip>
							</p>
						</div>
					</div>
				</template>
				<template #firstSeenAt-cell="{ row }">
					{{ formatDate(row.original.firstSeenAt) }}
				</template>
				<template #lastSeenAt-cell="{ row }">
					{{ formatDate(row.original.lastSeenAt) }}
				</template>
				<template #authMeRegisteredAt-cell="{ row }">
					{{ formatDate(row.original.authMe.registeredAt) }}
				</template>
				<template #authMeRegisterIp-cell="{ row }">
					<div class="min-w-0">
						<p class="truncate text-sm text-slate-900 dark:text-white">
							{{ getIpLocationDisplay(row.original.authMe.registerIpLocation) }}
						</p>
						<p class="truncate text-xs text-slate-500">
							{{ getIpAddressDisplay(row.original.authMe.registerIp) }}
						</p>
					</div>
				</template>
				<template #authMeLastLoginAt-cell="{ row }">
					{{ formatDate(row.original.authMe.lastLoginAt) }}
				</template>
				<template #authMeLastIp-cell="{ row }">
					<div class="min-w-0">
						<p class="truncate text-sm text-slate-900 dark:text-white">
							{{ getIpLocationDisplay(row.original.authMe.lastIpLocation) }}
						</p>
						<p class="truncate text-xs text-slate-500">
							{{ getIpAddressDisplay(row.original.authMe.lastIp) }}
						</p>
					</div>
				</template>
				<template #authMeSyncedAt-cell="{ row }">
					{{ formatDate(row.original.authMe.syncedAt) }}
				</template>
				<template #luckPermsPrimaryGroup-cell="{ row }">
					<UBadge
						v-if="row.original.luckPerms.primaryGroup"
						color="neutral"
						variant="subtle"
					>
						{{ row.original.luckPerms.primaryGroup }}
					</UBadge>
					<span v-else class="text-sm text-slate-500">
						{{ t('admin.serverPlayers.empty.notLinked') }}
					</span>
				</template>
				<template #luckPermsSyncedAt-cell="{ row }">
					{{ formatDate(row.original.luckPerms.syncedAt) }}
				</template>
				<template #bridgeSyncedAt-cell="{ row }">
					{{ formatDate(row.original.bridgeSyncedAt) }}
				</template>
				<template #createdAt-cell="{ row }">
					{{ formatDate(row.original.createdAt) }}
				</template>
				<template #updatedAt-cell="{ row }">
					{{ formatDate(row.original.updatedAt) }}
				</template>
				<template #dataEntries-cell="{ row }">
					<div class="inline-flex flex-nowrap gap-1 whitespace-nowrap">
						<UButton
							size="xs"
							:color="row.original.hasAdvancements ? 'primary' : 'neutral'"
							variant="soft"
							:disabled="!row.original.hasAdvancements"
							:to="
								row.original.hasAdvancements
									? getDataEntryRoute(row.original, 'advancements')
									: undefined
							"
						>
							{{ t('admin.serverPlayers.dataEntries.advancements') }}
						</UButton>
						<UButton
							size="xs"
							:color="row.original.hasStats ? 'primary' : 'neutral'"
							variant="soft"
							:disabled="!row.original.hasStats"
							:to="
								row.original.hasStats
									? getDataEntryRoute(row.original, 'stats')
									: undefined
							"
						>
							{{ t('admin.serverPlayers.dataEntries.stats') }}
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

		<UModal v-model:open="resetSyncOpen" :ui="{ content: 'max-w-xl' }">
			<template #content>
				<div class="p-5">
					<div class="flex items-start justify-between gap-4">
						<div>
							<p class="text-xs font-medium text-slate-500 dark:text-slate-400">
								{{ t('admin.serverPlayers.resetSync.eyebrow') }}
							</p>
							<h2
								class="mt-1 text-xl font-semibold text-slate-950 dark:text-white"
							>
								{{ t('admin.serverPlayers.resetSync.title') }}
							</h2>
						</div>
						<UButton
							icon="i-lucide-x"
							color="neutral"
							variant="ghost"
							:aria-label="t('admin.actions.cancel')"
							@click="resetSyncOpen = false"
						/>
					</div>

					<p class="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
						{{ t('admin.serverPlayers.resetSync.description') }}
					</p>

					<div
						class="mt-4 grid gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800"
					>
						<UCheckbox
							v-model="resetSyncTargets.portalBridge"
							:label="t('admin.serverPlayers.resetSync.targets.portalBridge')"
						/>
						<UCheckbox
							v-model="resetSyncTargets.authme"
							:label="t('admin.serverPlayers.resetSync.targets.authme')"
						/>
						<UCheckbox
							v-model="resetSyncTargets.luckperms"
							:label="t('admin.serverPlayers.resetSync.targets.luckperms')"
						/>
					</div>

					<div class="mt-5 flex items-center justify-end gap-3">
						<UButton
							color="neutral"
							variant="ghost"
							@click="resetSyncOpen = false"
						>
							{{ t('admin.actions.cancel') }}
						</UButton>
						<UButton
							color="error"
							variant="solid"
							icon="i-lucide-rotate-ccw"
							:disabled="!canResetSync"
							:loading="resetSyncLoading"
							@click="confirmResetSync"
						>
							{{ t('admin.serverPlayers.resetSync.confirm') }}
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
	IpLocationSummary,
	MinecraftServerPlayerInfo,
	MinecraftServerPlayersResponse,
} from '~/components/admin/types'
import { useAdminToast } from '~/composables/useAdminToast'
import { getMinecraftHeadRendererUrl } from '~/utils/minecraft/body-renderer'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'admin-auth',
})

const route = useRoute()
const localePath = useLocalePath()
const { locale, t } = useI18n()
const serverId = computed(() => String(route.params.serverId ?? ''))
const page = ref(1)
const pageSize = ref(20)
const resetSyncOpen = ref(false)
const resetSyncLoading = ref(false)
const resetSyncTargets = reactive({
	portalBridge: true,
	authme: true,
	luckperms: true,
})
const filters = reactive({
	search: '',
	group: '',
	sortField: 'lastSeenAt',
	sortDirection: 'desc',
})
const query = computed(() => ({
	page: page.value,
	pageSize: pageSize.value,
	search: filters.search || undefined,
	group: filters.group || undefined,
	sortField: filters.sortField,
	sortDirection: filters.sortDirection,
}))
const { data, pending, refresh } =
	await useFetch<MinecraftServerPlayersResponse>(
		() => `/api/minecraft/servers/${serverId.value}/players`,
		{ query },
	)
const players = computed(() => data.value?.items ?? [])
const pageMeta = computed(() => ({
	total: data.value?.total ?? 0,
	pageCount: data.value?.pageCount ?? 1,
}))
const canResetSync = computed(
	() =>
		resetSyncTargets.portalBridge ||
		resetSyncTargets.authme ||
		resetSyncTargets.luckperms,
)
const { notifyError, notifySuccess } = useAdminToast()
const tableHeader = (label: string) => () =>
	h('span', { class: 'whitespace-nowrap' }, label)
const columns = [
	{
		accessorKey: 'player',
		header: tableHeader(t('admin.serverPlayers.fields.player')),
	},
	{
		accessorKey: 'firstSeenAt',
		header: tableHeader(t('admin.serverPlayers.fields.firstSeenAt')),
	},
	{
		accessorKey: 'lastSeenAt',
		header: tableHeader(t('admin.serverPlayers.fields.lastSeenAt')),
	},
	{
		accessorKey: 'authMeRegisteredAt',
		header: tableHeader(t('admin.serverPlayers.fields.authMeRegisteredAt')),
	},
	{
		accessorKey: 'authMeRegisterIp',
		header: tableHeader(t('admin.serverPlayers.fields.authMeRegisterIp')),
	},
	{
		accessorKey: 'authMeLastLoginAt',
		header: tableHeader(t('admin.serverPlayers.fields.authMeLastLoginAt')),
	},
	{
		accessorKey: 'authMeLastIp',
		header: tableHeader(t('admin.serverPlayers.fields.authMeLastIp')),
	},
	{
		accessorKey: 'authMeSyncedAt',
		header: tableHeader(t('admin.serverPlayers.fields.authMeSyncedAt')),
	},
	{
		accessorKey: 'luckPermsPrimaryGroup',
		header: tableHeader(t('admin.serverPlayers.fields.luckPermsPrimaryGroup')),
	},
	{
		accessorKey: 'luckPermsSyncedAt',
		header: tableHeader(t('admin.serverPlayers.fields.luckPermsSyncedAt')),
	},
	{
		accessorKey: 'bridgeSyncedAt',
		header: tableHeader(t('admin.serverPlayers.fields.bridgeSyncedAt')),
	},
	{
		accessorKey: 'createdAt',
		header: tableHeader(t('admin.serverPlayers.fields.createdAt')),
	},
	{
		accessorKey: 'updatedAt',
		header: tableHeader(t('admin.serverPlayers.fields.updatedAt')),
	},
	{
		accessorKey: 'dataEntries',
		header: tableHeader(t('admin.serverPlayers.fields.dataEntries')),
	},
]
const sortFieldItems = [
	{ label: t('admin.serverPlayers.fields.lastSeenAt'), value: 'lastSeenAt' },
	{ label: t('admin.serverPlayers.fields.firstSeenAt'), value: 'firstSeenAt' },
	{ label: t('admin.serverPlayers.fields.player'), value: 'username' },
	{ label: t('admin.serverPlayers.fields.updatedAt'), value: 'updatedAt' },
	{
		label: t('admin.serverPlayers.fields.luckPermsPrimaryGroup'),
		value: 'luckPermsPrimaryGroup',
	},
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

const getIpLocationDisplay = (
	ipLocation: IpLocationSummary | null | undefined,
): string =>
	ipLocation?.display ?? t('admin.serverPlayers.empty.unknownLocation')

const getIpAddressDisplay = (ipAddress: string | null): string =>
	ipAddress ?? t('admin.serverPlayers.empty.notLinked')

const hasConflict = (state: string): boolean => state !== 'NONE'

const getUuidSourceText = (source: string): string =>
	t('admin.serverPlayers.uuidSourceTooltip', { source })

const getConflictMessage = (state: string): string =>
	t('admin.serverPlayers.conflictTooltip', { state })

const getDataEntryRoute = (
	player: Pick<MinecraftServerPlayerInfo, 'normalizedUsername' | 'username'>,
	type: 'stats' | 'advancements',
) =>
	localePath({
		path: `/admin/servers/${type}`,
		query: {
			player: player.normalizedUsername || player.username || undefined,
			serverId: serverId.value,
		},
	})

const confirmResetSync = async (): Promise<void> => {
	if (!canResetSync.value) {
		return
	}

	resetSyncLoading.value = true
	try {
		await $fetch(
			`/api/minecraft/servers/${serverId.value}/players/reset-sync`,
			{
				method: 'POST',
				body: {
					sources: {
						portalBridge: resetSyncTargets.portalBridge,
						authme: resetSyncTargets.authme,
						luckperms: resetSyncTargets.luckperms,
					},
				},
			},
		)
		await refresh()
		notifySuccess({
			title: t('admin.serverPlayers.resetSync.successTitle'),
			description: t('admin.serverPlayers.resetSync.successDescription'),
		})
		resetSyncOpen.value = false
	} catch (error) {
		notifyError(error, {
			title: t('admin.serverPlayers.resetSync.failedTitle'),
		})
	} finally {
		resetSyncLoading.value = false
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
	filters.group = ''
	filters.sortField = 'lastSeenAt'
	filters.sortDirection = 'desc'
}

const setPageSize = (value: number): void => {
	pageSize.value = value
	page.value = 1
}
</script>
