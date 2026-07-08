<template>
	<div>
		<div
			class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
		>
			<div>
				<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
					{{ t('admin.servers.title') }}
				</h1>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<UButton
					icon="i-lucide-star"
					color="neutral"
					variant="soft"
					size="lg"
					@click="openDefaultServerModal"
				>
					{{ t('admin.servers.setDefault') }}
				</UButton>
				<UButton
					:to="localePath('/admin/servers/create')"
					icon="i-lucide-plus"
					size="lg"
				>
					{{ t('admin.servers.create') }}
				</UButton>
			</div>
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
					<div class="flex items-center gap-2">
						<UBadge :color="sourceStatusColor(source)" variant="soft">
							{{ sourceStatusLabel(source) }}
						</UBadge>
						<UButton
							size="xs"
							color="neutral"
							variant="ghost"
							icon="i-lucide-sliders-horizontal"
							@click="
								openExternalSyncSourceStatus(
									sourceNameFromStatus(source.source),
								)
							"
						>
							{{ t('admin.servers.externalSync.openStatus') }}
						</UButton>
					</div>
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
			<div class="overflow-x-auto">
				<table class="w-full min-w-[56rem] border-collapse">
					<thead>
						<tr
							class="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400"
						>
							<th class="w-10 p-3" />
							<th class="p-3">{{ t('admin.servers.fields.server') }}</th>
							<th class="p-3">{{ t('admin.serverDetail.fields.code') }}</th>
							<th class="p-3">{{ t('admin.serverDetail.fields.address') }}</th>
							<th class="p-3">{{ t('admin.servers.fields.portalBridge') }}</th>
							<th class="p-3">{{ t('admin.servers.fields.status') }}</th>
							<th class="p-3">{{ t('admin.servers.fields.actions') }}</th>
						</tr>
					</thead>
					<draggable
						:list="localServers"
						item-key="id"
						tag="tbody"
						handle=".server-grip"
						:animation="160"
						@end="reorderServers"
					>
						<template #item="{ element }">
							<tr
								class="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/30"
							>
								<td class="p-3 align-top">
									<UIcon
										name="i-lucide-grip-vertical"
										class="server-grip size-4 cursor-grab text-slate-400 active:cursor-grabbing"
									/>
								</td>
								<td class="p-3 align-top">
									<div class="min-w-0">
										<div class="flex items-center gap-2">
											<p
												class="truncate font-medium text-slate-900 dark:text-white"
											>
												{{ element.name }}
											</p>
											<UBadge
												v-if="element.isDefault"
												color="warning"
												variant="soft"
												size="xs"
											>
												{{ t('admin.servers.defaultBadge') }}
											</UBadge>
										</div>
										<p
											class="truncate text-xs text-slate-500 dark:text-slate-400"
										>
											{{ element.serverId }}
										</p>
									</div>
								</td>
								<td
									class="p-3 align-top text-xs text-slate-600 dark:text-slate-300"
								>
									{{ element.code }}
								</td>
								<td
									class="p-3 align-top text-xs text-slate-600 dark:text-slate-300"
								>
									{{ element.host }}:{{ element.port }}
								</td>
								<td class="p-3 align-top">
									<UBadge color="neutral" variant="subtle">
										{{
											element.portalBridge?.lastConnectionState ??
											t('admin.serverDetail.states.notConfigured')
										}}
									</UBadge>
								</td>
								<td class="p-3 align-top">
									<UBadge
										:color="element.enabled ? 'success' : 'neutral'"
										variant="subtle"
									>
										{{
											element.enabled
												? t('admin.serverDetail.states.enabled')
												: t('admin.serverDetail.states.disabled')
										}}
									</UBadge>
								</td>
								<td class="p-3 align-top">
									<UButton
										type="button"
										size="xs"
										color="neutral"
										variant="ghost"
										icon="i-lucide-arrow-right"
										@click="openServer(element)"
									>
										{{ t('admin.servers.viewDetail') }}
									</UButton>
								</td>
							</tr>
						</template>
					</draggable>
				</table>
			</div>
		</div>

		<UModal v-model:open="defaultServerModalOpen" :ui="{ content: 'max-w-md' }">
			<template #content>
				<div class="grid gap-4 p-5">
					<div>
						<h2 class="text-lg font-semibold text-slate-950 dark:text-white">
							{{ t('admin.servers.defaultModal.title') }}
						</h2>
						<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
							{{ t('admin.servers.defaultModal.description') }}
						</p>
					</div>
					<USelectMenu
						v-model="selectedDefaultServerId"
						:items="defaultServerItems"
						value-key="value"
						label-key="label"
						searchable
						:placeholder="t('admin.servers.defaultModal.placeholder')"
					>
						<template #item-label="{ item }">
							<div class="min-w-0">
								<p class="truncate">{{ item.label }}</p>
								<p class="truncate text-xs text-slate-500 dark:text-slate-400">
									{{ item.description }}
								</p>
							</div>
						</template>
					</USelectMenu>
					<div class="flex justify-end gap-2">
						<UButton
							color="neutral"
							variant="ghost"
							@click="defaultServerModalOpen = false"
						>
							{{ t('admin.actions.cancel') }}
						</UButton>
						<UButton
							:loading="defaultServerSaving"
							@click="submitDefaultServer"
						>
							{{ t('admin.actions.save') }}
						</UButton>
					</div>
				</div>
			</template>
		</UModal>

		<UModal
			v-model:open="externalSyncStatusOpen"
			:ui="{ content: 'max-w-2xl', body: 'p-0' }"
		>
			<template #content>
				<div class="grid max-h-[82vh] grid-rows-[auto_minmax(0,1fr)]">
					<StatusModalHeader
						:title="externalSyncStatusTitle"
						:loading="externalSyncStatusLoading"
						@refresh="loadExternalSyncSourceStatus"
						@close="externalSyncStatusOpen = false"
					/>
					<div class="overflow-y-auto p-5">
						<div
							class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
						>
							<div class="flex items-center gap-2">
								<UBadge
									:color="externalSyncConnectionTone"
									variant="soft"
									:icon="externalSyncConnectionIcon"
								>
									{{ externalSyncConnectionLabel }}
								</UBadge>
							</div>
							<div class="flex flex-wrap justify-end gap-2">
								<UButton
									size="xs"
									variant="soft"
									icon="i-lucide-plug"
									:disabled="externalSyncControlsDisabled"
									:loading="externalSyncActionLoading === 'connect'"
									@click="probeExternalSyncSource('connect')"
								>
									{{ t('admin.servers.externalSync.modal.checkConnection') }}
								</UButton>
								<UButton
									size="xs"
									variant="soft"
									icon="i-lucide-refresh-cw"
									:disabled="externalSyncControlsDisabled"
									:loading="externalSyncActionLoading === 'reconnect'"
									@click="probeExternalSyncSource('reconnect')"
								>
									{{ t('admin.servers.externalSync.modal.recheckConnection') }}
								</UButton>
								<UButton
									size="xs"
									variant="soft"
									icon="i-lucide-database"
									:disabled="externalSyncControlsDisabled"
									:loading="externalSyncActionLoading === 'sync'"
									@click="syncExternalSyncSource"
								>
									{{ t('admin.servers.externalSync.modal.syncNow') }}
								</UButton>
								<UButton
									size="xs"
									variant="ghost"
									icon="i-lucide-rotate-cw"
									:loading="externalSyncStatusLoading"
									@click="loadExternalSyncSourceStatus"
								>
									{{ t('admin.servers.externalSync.modal.refreshSync') }}
								</UButton>
							</div>
						</div>

						<InfoGrid :items="externalSyncStatusItems" />
					</div>
				</div>
			</template>
		</UModal>
	</div>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'
import type {
	AdminExternalSyncSourceDetailResponse,
	AdminExternalSyncSourceName,
	AdminExternalSyncSourceStatus,
	AdminExternalSyncStatusResponse,
	MinecraftServerSummary,
	MinecraftServersResponse,
} from '~/components/admin/types'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'admin-auth',
})

const { notifyError } = useAdminToast()
const { data, pending, error, refresh } =
	await useFetch<MinecraftServersResponse>('/api/minecraft/servers')
const {
	data: externalSyncData,
	error: externalSyncError,
	refresh: refreshExternalSyncData,
} = await useFetch<AdminExternalSyncStatusResponse>(
	'/api/admin/external-sync/status',
)

const localePath = useLocalePath()
const { locale, t } = useI18n()
const servers = computed(() => data.value?.servers ?? [])
const localServers = ref<MinecraftServerSummary[]>([])
const externalSyncSources = computed(
	() => externalSyncData.value?.sources ?? [],
)
const defaultServerModalOpen = ref(false)
const selectedDefaultServerId = ref('')
const defaultServerSaving = ref(false)
const reordering = ref(false)
const externalSyncStatusOpen = ref(false)
const externalSyncStatusLoading = ref(false)
const externalSyncActionLoading = ref<'connect' | 'reconnect' | 'sync' | null>(
	null,
)
const activeExternalSyncSource = ref<AdminExternalSyncSourceName>('authme')
const externalSyncStatus = ref<AdminExternalSyncSourceDetailResponse | null>(
	null,
)
const defaultServerItems = computed(() =>
	servers.value.map((server) => ({
		label: `${server.name} (${server.serverId})`,
		value: server.serverId,
		description: server.code,
	})),
)

const sourceNameFromStatus = (
	source: AdminExternalSyncSourceStatus['source'],
): AdminExternalSyncSourceName => (source === 'AUTHME' ? 'authme' : 'luckperms')

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

const activeExternalSyncSummary = computed(
	() =>
		externalSyncSources.value.find(
			(source) =>
				sourceNameFromStatus(source.source) === activeExternalSyncSource.value,
		) ?? null,
)

const externalSyncStatusTitle = computed(() =>
	activeExternalSyncSource.value === 'authme'
		? t('admin.servers.externalSync.modal.authMeTitle')
		: t('admin.servers.externalSync.modal.luckPermsTitle'),
)

const externalSyncControlsDisabled = computed(() => {
	const status = externalSyncStatus.value

	if (status) {
		return !status.config.enabled || !status.config.configured
	}

	return (
		!activeExternalSyncSummary.value?.enabled ||
		!activeExternalSyncSummary.value?.configured
	)
})

const externalSyncConnectionLabel = computed(() => {
	const status = externalSyncStatus.value

	if (!status) return t('admin.servers.externalSync.modal.states.notChecked')
	if (!status.config.configured) {
		return t('admin.servers.externalSync.modal.states.notConfigured')
	}
	if (!status.config.enabled) {
		return t('admin.servers.externalSync.modal.states.disabled')
	}
	if (status.connection.ok) {
		return t('admin.servers.externalSync.modal.states.connected')
	}
	if (status.connection.checkedAt) {
		return t('admin.servers.externalSync.modal.states.failed')
	}

	return t('admin.servers.externalSync.modal.states.notChecked')
})

const externalSyncConnectionTone = computed(() => {
	const status = externalSyncStatus.value

	if (!status || !status.config.configured || !status.config.enabled) {
		return 'neutral'
	}

	return status.connection.ok ? 'success' : 'error'
})

const externalSyncConnectionIcon = computed(() => {
	const status = externalSyncStatus.value

	if (!status) return 'i-lucide-circle-help'
	if (!status.config.configured) return 'i-lucide-circle-off'
	if (!status.config.enabled) return 'i-lucide-circle-pause'
	if (status.connection.ok) return 'i-lucide-circle-check'

	return 'i-lucide-circle-alert'
})

const formatInterval = (value: number): string =>
	value % 60 === 0
		? t('admin.servers.externalSync.modal.everyMinutes', {
				minutes: value / 60,
			})
		: t('admin.servers.externalSync.modal.everySeconds', {
				seconds: value,
			})

const externalSyncStatusItems = computed(() => {
	const status = externalSyncStatus.value

	if (!status) {
		return []
	}

	return [
		{
			label: t('admin.servers.externalSync.modal.fields.database'),
			value:
				status.config.database ??
				t('admin.servers.externalSync.modal.states.notConfigured'),
		},
		{
			label: t('admin.servers.externalSync.modal.fields.configured'),
			value: status.config.configured
				? t('admin.servers.externalSync.modal.states.configured')
				: t('admin.servers.externalSync.modal.states.notConfigured'),
		},
		{
			label: t('admin.servers.externalSync.modal.fields.enabled'),
			value: status.config.enabled
				? t('admin.serverDetail.states.enabled')
				: t('admin.serverDetail.states.disabled'),
		},
		{
			label: t('admin.servers.externalSync.modal.fields.syncInterval'),
			value: formatInterval(status.config.intervalSeconds),
		},
		{
			label: t('admin.servers.externalSync.modal.fields.checkedAt'),
			value: formatDate(status.connection.checkedAt),
		},
		{
			label: t('admin.servers.externalSync.modal.fields.latency'),
			value:
				status.connection.latencyMs == null
					? t('admin.servers.externalSync.never')
					: `${status.connection.latencyMs} ms`,
		},
		{
			label: t('admin.servers.externalSync.modal.fields.lastStartedAt'),
			value: formatDate(status.sync.lastStartedAt),
		},
		{
			label: t('admin.servers.externalSync.modal.fields.lastFinishedAt'),
			value: formatDate(status.sync.lastFinishedAt),
		},
		{
			label: t('admin.servers.externalSync.modal.fields.lastSuccessAt'),
			value: formatDate(status.sync.lastSuccessAt),
		},
		{
			label: t('admin.servers.externalSync.modal.fields.rowsRead'),
			value: String(status.sync.rowsRead),
		},
		{
			label: t('admin.servers.externalSync.modal.fields.rowsMatched'),
			value: String(status.sync.rowsMatched),
		},
		{
			label: t('admin.servers.externalSync.modal.fields.rowsChanged'),
			value: String(status.sync.rowsChanged),
		},
		{
			label: t('admin.servers.externalSync.modal.fields.rowsSkipped'),
			value: String(status.sync.rowsSkipped),
		},
		{
			label: t('admin.servers.externalSync.modal.fields.error'),
			value:
				status.connection.errorMessage ??
				status.sync.lastError ??
				t('admin.serverDetail.states.empty'),
		},
	]
})

let externalSyncStatusTimer: ReturnType<typeof setInterval> | null = null

const loadExternalSyncSourceStatus = async () => {
	externalSyncStatusLoading.value = true
	try {
		externalSyncStatus.value =
			await $fetch<AdminExternalSyncSourceDetailResponse>(
				`/api/admin/external-sync/sources/${activeExternalSyncSource.value}/status`,
			)
		await refreshExternalSyncData()
	} catch (value) {
		notifyError(value, {
			title: t('admin.servers.externalSync.modal.loadFailed'),
		})
	} finally {
		externalSyncStatusLoading.value = false
	}
}

const openExternalSyncSourceStatus = (source: AdminExternalSyncSourceName) => {
	activeExternalSyncSource.value = source
	externalSyncStatusOpen.value = true
	void loadExternalSyncSourceStatus()
}

const probeExternalSyncSource = async (
	action: 'connect' | 'reconnect',
): Promise<void> => {
	externalSyncActionLoading.value = action
	try {
		externalSyncStatus.value =
			await $fetch<AdminExternalSyncSourceDetailResponse>(
				`/api/admin/external-sync/sources/${activeExternalSyncSource.value}/probe`,
				{
					method: 'POST',
					body: { action },
				},
			)
	} catch (value) {
		notifyError(value, {
			title: t('admin.servers.externalSync.modal.controlFailed'),
		})
	} finally {
		externalSyncActionLoading.value = null
	}
}

const syncExternalSyncSource = async (): Promise<void> => {
	externalSyncActionLoading.value = 'sync'
	try {
		externalSyncStatus.value =
			await $fetch<AdminExternalSyncSourceDetailResponse>(
				`/api/admin/external-sync/sources/${activeExternalSyncSource.value}/sync`,
				{
					method: 'POST',
				},
			)
		await refreshExternalSyncData()
	} catch (value) {
		notifyError(value, {
			title: t('admin.servers.externalSync.modal.manualSyncFailed'),
		})
	} finally {
		externalSyncActionLoading.value = null
	}
}

watch(
	servers,
	(value) => {
		localServers.value = [...value]
		selectedDefaultServerId.value =
			value.find((server) => server.isDefault)?.serverId ?? ''
	},
	{ immediate: true },
)

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

watch(externalSyncStatusOpen, (value) => {
	if (!value) {
		if (externalSyncStatusTimer) {
			clearInterval(externalSyncStatusTimer)
			externalSyncStatusTimer = null
		}
		return
	}

	if (externalSyncStatusTimer) {
		clearInterval(externalSyncStatusTimer)
	}

	externalSyncStatusTimer = setInterval(() => {
		void loadExternalSyncSourceStatus()
	}, 5_000)
})

onBeforeUnmount(() => {
	if (externalSyncStatusTimer) {
		clearInterval(externalSyncStatusTimer)
	}
})

const openServer = async (server: MinecraftServerSummary): Promise<void> => {
	await navigateTo(localePath(`/admin/servers/${server.serverId}`))
}

const openDefaultServerModal = (): void => {
	selectedDefaultServerId.value =
		servers.value.find((server) => server.isDefault)?.serverId ?? ''
	defaultServerModalOpen.value = true
}

const submitDefaultServer = async (): Promise<void> => {
	if (!selectedDefaultServerId.value || defaultServerSaving.value) {
		return
	}

	defaultServerSaving.value = true

	try {
		await $fetch('/api/admin/servers/default', {
			method: 'POST',
			body: {
				serverId: selectedDefaultServerId.value,
			},
		})
		defaultServerModalOpen.value = false
		await refresh()
	} catch (value) {
		notifyError(value, {
			title: t('admin.notifications.serverDefaultSetFailed'),
		})
	} finally {
		defaultServerSaving.value = false
	}
}

const reorderServers = async (): Promise<void> => {
	if (reordering.value) {
		return
	}

	reordering.value = true

	try {
		await $fetch('/api/admin/servers/reorder', {
			method: 'POST',
			body: {
				orderedIds: localServers.value.map((server) => server.id),
			},
		})
		await refresh()
	} catch (value) {
		notifyError(value, {
			title: t('admin.notifications.serverReorderFailed'),
		})
		localServers.value = [...servers.value]
	} finally {
		reordering.value = false
	}
}
</script>
