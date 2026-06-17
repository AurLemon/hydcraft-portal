<template>
	<div class="-mt-2">
		<div
			class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
		>
			<div>
				<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
					{{ t('admin.servers.title') }}
				</h1>
			</div>
			<UButton
				:to="localePath('/admin/servers/create')"
				icon="i-lucide-plus"
				size="lg"
			>
				{{ t('admin.servers.create') }}
			</UButton>
		</div>

		<section class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
			<div
				v-for="source in externalSyncSources"
				:key="source.source"
				class="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
			>
				<div class="flex items-center justify-between gap-3">
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
						>
							<UIcon :name="sourceIcon(source.source)" class="h-5 w-5" />
						</div>
						<div>
							<p class="font-semibold text-slate-950 dark:text-white">
								{{ sourceLabel(source.source) }}
							</p>
							<p class="text-sm text-slate-500 dark:text-slate-400">
								{{ formatSourceMeta(source) }}
							</p>
						</div>
					</div>
					<UBadge :color="sourceStatusColor(source)" variant="soft">
						{{ sourceStatusLabel(source) }}
					</UBadge>
				</div>
				<div
					class="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-300"
				>
					<div>
						<p class="text-xs text-slate-500 dark:text-slate-400">
							{{ t('admin.servers.externalSync.lastSuccessAt') }}
						</p>
						<p class="mt-1 font-medium">
							{{ formatDate(source.lastSuccessAt) }}
						</p>
					</div>
					<div>
						<p class="text-xs text-slate-500 dark:text-slate-400">
							{{ t('admin.servers.externalSync.rowsRead') }}
						</p>
						<p class="mt-1 font-medium">{{ source.rowsRead }}</p>
					</div>
				</div>
			</div>
		</section>

		<div
			v-if="pending"
			class="mt-8 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
		>
			<UIcon name="i-lucide-loader-circle" class="h-4 w-4 animate-spin" />
			{{ t('admin.servers.loading') }}
		</div>

		<div
			v-else-if="servers.length === 0"
			class="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900"
		>
			<p class="text-lg font-semibold text-slate-950 dark:text-white">
				{{ t('admin.servers.empty.title') }}
			</p>
			<p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
				{{ t('admin.servers.empty.description') }}
			</p>
		</div>

		<div
			v-else
			class="mt-8 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
		>
			<UTable :data="servers" :columns="columns">
				<template #server-cell="{ row }">
					<div class="min-w-0">
						<p class="truncate font-medium text-slate-900 dark:text-white">
							{{ row.original.name }}
						</p>
						<p class="truncate text-xs text-slate-500 dark:text-slate-400">
							{{ row.original.serverId }}
						</p>
					</div>
				</template>
				<template #code-cell="{ row }">
					<span class="font-mono text-xs text-slate-600 dark:text-slate-300">
						{{ row.original.code }}
					</span>
				</template>
				<template #address-cell="{ row }">
					<span class="font-mono text-xs text-slate-600 dark:text-slate-300">
						{{ row.original.host }}:{{ row.original.port }}
					</span>
				</template>
				<template #portalBridge-cell="{ row }">
					<UBadge color="neutral" variant="subtle">
						{{
							row.original.portalBridge?.lastConnectionState ??
							t('admin.serverDetail.states.notConfigured')
						}}
					</UBadge>
				</template>
				<template #authMe-cell="{ row }">
					<UBadge
						:color="sourceConfiguredColor(row.original.authMe)"
						variant="subtle"
					>
						{{ sourceConfiguredLabel(row.original.authMe) }}
					</UBadge>
				</template>
				<template #luckPerms-cell="{ row }">
					<UBadge
						:color="sourceConfiguredColor(row.original.luckPerms)"
						variant="subtle"
					>
						{{ sourceConfiguredLabel(row.original.luckPerms) }}
					</UBadge>
				</template>
				<template #status-cell="{ row }">
					<UBadge
						:color="row.original.enabled ? 'success' : 'neutral'"
						variant="subtle"
					>
						{{
							row.original.enabled
								? t('admin.serverDetail.states.enabled')
								: t('admin.serverDetail.states.disabled')
						}}
					</UBadge>
				</template>
				<template #actions-cell="{ row }">
					<UButton
						type="button"
						size="xs"
						color="neutral"
						variant="ghost"
						icon="i-lucide-arrow-right"
						@click="openServer(row.original)"
					>
						{{ t('admin.servers.viewDetail') }}
					</UButton>
				</template>
			</UTable>
		</div>
	</div>
</template>

<script setup lang="ts">
import type {
	AdminExternalSyncSourceStatus,
	AdminExternalSyncStatusResponse,
	MysqlSourceSummary,
	MinecraftServerSummary,
	MinecraftServersResponse,
} from '~/components/admin/types'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'admin-auth',
})

const { notifyError } = useAdminToast()
const { data, pending, error } = await useFetch<MinecraftServersResponse>(
	'/api/minecraft/servers',
)
const { data: externalSyncData, error: externalSyncError } =
	await useFetch<AdminExternalSyncStatusResponse>(
		'/api/admin/external-sync/status',
	)

const localePath = useLocalePath()
const { locale, t } = useI18n()
const servers = computed(() => data.value?.servers ?? [])
const externalSyncSources = computed(
	() => externalSyncData.value?.sources ?? [],
)
const columns = [
	{ accessorKey: 'server', header: t('admin.servers.fields.server') },
	{ accessorKey: 'code', header: t('admin.serverDetail.fields.code') },
	{ accessorKey: 'address', header: t('admin.serverDetail.fields.address') },
	{
		accessorKey: 'portalBridge',
		header: t('admin.servers.fields.portalBridge'),
	},
	{ accessorKey: 'authMe', header: 'AuthMe' },
	{ accessorKey: 'luckPerms', header: 'LuckPerms' },
	{ accessorKey: 'status', header: t('admin.servers.fields.status') },
	{ id: 'actions', header: t('admin.servers.fields.actions') },
]

const sourceLabel = (
	source: AdminExternalSyncSourceStatus['source'],
): string =>
	source === 'AUTHME'
		? t('admin.servers.externalSync.authMe')
		: t('admin.servers.externalSync.luckPerms')

const sourceIcon = (source: AdminExternalSyncSourceStatus['source']): string =>
	source === 'AUTHME' ? 'i-lucide-database' : 'i-lucide-shield-check'

const sourceStatusLabel = (source: AdminExternalSyncSourceStatus): string =>
	source.running
		? t('admin.servers.externalSync.running')
		: source.lastError
			? t('admin.servers.externalSync.error')
			: !source.configured
				? t('admin.servers.externalSync.notConfigured')
				: !source.enabled
					? t('admin.servers.externalSync.disabled')
					: source.lastSuccessAt
						? t('admin.servers.externalSync.synced')
						: t('admin.servers.externalSync.pending')

const sourceStatusColor = (
	source: AdminExternalSyncSourceStatus,
): 'primary' | 'success' | 'warning' | 'error' | 'neutral' =>
	source.running
		? 'primary'
		: source.lastError
			? 'error'
			: !source.configured || !source.enabled
				? 'neutral'
				: source.lastSuccessAt
					? 'success'
					: 'warning'

const formatDate = (value: string | null): string =>
	value
		? new Intl.DateTimeFormat(locale.value, {
				dateStyle: 'medium',
				timeStyle: 'short',
			}).format(new Date(value))
		: t('admin.servers.externalSync.never')

const formatSourceMeta = (source: AdminExternalSyncSourceStatus): string =>
	source.database
		? t('admin.servers.externalSync.database', {
				database: source.database,
			})
		: t('admin.servers.externalSync.databaseMissing')

const sourceConfiguredLabel = (source: MysqlSourceSummary | null): string =>
	!source
		? t('admin.serverDetail.states.notConfigured')
		: source.enabled
			? t('admin.serverDetail.states.enabled')
			: t('admin.serverDetail.states.disabled')

const sourceConfiguredColor = (
	source: MysqlSourceSummary | null,
): 'success' | 'neutral' =>
	!source ? 'neutral' : source.enabled ? 'success' : 'neutral'

watch(
	error,
	(value) => {
		if (value) {
			notifyError(value, {
				title: t('admin.notifications.serversLoadFailed'),
			})
		}
	},
	{ immediate: true },
)

watch(
	externalSyncError,
	(value) => {
		if (value) {
			notifyError(value, {
				title: t('admin.notifications.serversLoadFailed'),
			})
		}
	},
	{ immediate: true },
)

const openServer = async (server: MinecraftServerSummary): Promise<void> => {
	await navigateTo(localePath(`/admin/servers/${server.serverId}`))
}
</script>
