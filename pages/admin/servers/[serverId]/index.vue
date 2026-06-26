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
					{{ t('admin.serverDetail.back') }}
				</UButton>
				<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
					{{ server?.name ?? t('admin.serverDetail.fallbackTitle') }}
				</h1>
				<p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
					{{ server?.serverId ?? serverId }}
				</p>
			</div>
			<SectionButtons :actions="headerActions" />
		</div>

		<div
			v-if="pending && !overview"
			class="mt-8 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
		>
			<UIcon name="i-lucide-loader-circle" class="h-4 w-4 animate-spin" />
			{{ t('admin.serverDetail.loading') }}
		</div>

		<div
			v-else-if="(error || !server) && !overview"
			class="mt-8 rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
		>
			{{ t('admin.serverDetail.loadFailed') }}
		</div>

		<div v-else-if="server" class="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-2">
			<ServerDetailOnlinePlayersCard
				:title="t('admin.serverDetail.sections.onlinePlayers')"
				:latest-online-text="latestOnlineText"
				:latest-status-at="latestStatusAt"
				:server-enabled="server.enabled"
				:state-text="
					server.enabled
						? t('admin.serverDetail.states.enabled')
						: t('admin.serverDetail.states.disabled')
				"
				:points="overview?.metrics.playerHistory ?? []"
				:chart-label="t('admin.serverDetail.chart.onlinePlayers')"
				:empty-text="t('admin.serverDetail.chart.empty')"
				:locale="locale"
			/>

			<ServerDetailInfoCard
				:title="t('admin.serverDetail.sections.portalBridge')"
				:items="portalBridgeItems"
				:error-text="server.portalBridge?.lastError"
				:actions="portalBridgeStatusActions"
			/>

			<ServerDetailInfoCard
				:title="t('admin.serverDetail.sections.serverInfo')"
				:items="serverInfoItems"
			/>

			<ServerDetailSyncStatusCard
				:title="t('admin.serverDetail.sections.syncStatus')"
				:tasks="syncTaskRows"
			/>

			<ServerDetailPlayerDataCard
				:title="t('admin.serverDetail.sections.playerData')"
				:items="playerDataItems"
			/>

			<ServerDetailSimpleListCard
				:title="t('admin.serverDetail.sections.recentSnapshots')"
				:action-label="t('admin.serverDetail.actions.testAndInspect')"
				action-icon="i-lucide-flask-conical"
				:items="snapshotListItems"
				empty-icon="i-lucide-files"
				:empty-text="t('admin.serverDetail.empty.snapshots')"
				@action="openInspector('snapshots')"
				@select="openSnapshotDetailById"
			/>

			<ServerDetailSimpleListCard
				:title="t('admin.serverDetail.sections.recentBridgeMessages')"
				:action-label="t('admin.serverDetail.actions.testAndInspect')"
				action-icon="i-lucide-flask-conical"
				:items="receiptListItems"
				empty-icon="i-lucide-radio"
				:empty-text="t('admin.serverDetail.empty.messages')"
				@action="openInspector('bridge')"
				@select="openReceiptDetailById"
			/>

			<ServerDetailSimpleListCard
				:title="t('admin.serverDetail.sections.recentCommands')"
				:items="commandListItems"
				empty-icon="i-lucide-terminal"
				:empty-text="t('admin.serverDetail.empty.commands')"
				@select="openCommandDetailById"
			/>

			<ServerDetailSimpleListCard
				:title="t('admin.serverDetail.sections.serverPlayerInfo')"
				:action-label="t('admin.serverDetail.actions.viewAll')"
				:items="serverPlayerListItems"
				empty-icon="i-lucide-users-round"
				:empty-text="t('admin.serverDetail.empty.playerInfo')"
				@action="navigateTo(localePath(`/admin/servers/${serverId}/players`))"
			/>
		</div>

		<AdminServerConfigModal
			v-model:open="basicOpen"
			mode="basic"
			:server="server"
			@saved="handleSaved"
		/>
		<AdminServerConfigModal
			v-model:open="portalBridgeOpen"
			mode="portalBridge"
			:server="server"
			@saved="handleSaved"
		/>
		<AdminServerConfigModal
			v-model:open="authMeOpen"
			mode="authMe"
			:server="server"
			@saved="handleSaved"
		/>
		<AdminServerConfigModal
			v-model:open="luckPermsOpen"
			mode="luckPerms"
			:server="server"
			@saved="handleSaved"
		/>
		<AdminServerConfigModal
			v-model:open="syncRateOpen"
			mode="sync"
			:server="server"
			@saved="handleSaved"
		/>

		<UModal
			v-model:open="detailOpen"
			:ui="{ content: 'max-w-3xl', body: 'p-0' }"
		>
			<template #content>
				<div class="grid max-h-[82vh] grid-rows-[auto_minmax(0,1fr)]">
					<div
						class="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800"
					>
						<div class="min-w-0">
							<p class="text-xs font-medium text-slate-500 dark:text-slate-400">
								{{
									selectedDetail?.type ?? t('admin.serverDetail.detail.title')
								}}
							</p>
							<h2
								class="mt-1 truncate text-xl font-semibold text-slate-950 dark:text-white"
							>
								{{
									selectedDetail?.title ?? t('admin.serverDetail.detail.title')
								}}
							</h2>
						</div>
						<UButton
							icon="i-lucide-x"
							color="neutral"
							variant="ghost"
							:aria-label="t('admin.serverDetail.actions.close')"
							@click="detailOpen = false"
						/>
					</div>
					<div class="overflow-y-auto p-5">
						<InfoGrid :items="selectedDetail?.meta ?? []" tone="modal" />
						<pre
							class="mt-5 max-h-[56vh] overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100 dark:border-slate-700"
						><code>{{ selectedDetail?.json ?? '' }}</code></pre>
					</div>
				</div>
			</template>
		</UModal>

		<UModal
			v-model:open="inspectorOpen"
			:ui="{ content: 'max-w-3xl', body: 'p-0' }"
		>
			<template #content>
				<div class="grid max-h-[82vh] grid-rows-[auto_minmax(0,1fr)]">
					<div
						class="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800"
					>
						<div class="min-w-0">
							<p class="text-xs font-medium text-slate-500 dark:text-slate-400">
								{{ t('admin.serverDetail.inspector.eyebrow') }}
							</p>
							<h2
								class="mt-1 truncate text-xl font-semibold text-slate-950 dark:text-white"
							>
								{{ inspectorTitle }}
							</h2>
						</div>
						<div class="flex shrink-0 items-center gap-2">
							<UButton
								size="sm"
								icon="i-lucide-refresh-cw"
								:loading="inspectorRefreshing"
								@click="testAndRefreshInspector"
								>{{ t('admin.serverDetail.actions.testRefresh') }}</UButton
							>
							<UButton
								icon="i-lucide-x"
								color="neutral"
								variant="ghost"
								:aria-label="t('admin.serverDetail.actions.close')"
								@click="inspectorOpen = false"
							/>
						</div>
					</div>
					<div class="overflow-y-auto p-5">
						<InfoGrid :items="inspectorMetaItems" tone="modal" />
						<pre
							class="mt-5 max-h-[56vh] overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100 dark:border-slate-700"
						><code>{{ inspectorJson }}</code></pre>
					</div>
				</div>
			</template>
		</UModal>

		<UModal
			v-model:open="bridgeStatusOpen"
			:ui="{ content: 'max-w-3xl', body: 'p-0' }"
		>
			<template #content>
				<div class="grid max-h-[82vh] grid-rows-[auto_minmax(0,1fr)]">
					<StatusModalHeader
						:title="t('admin.serverDetail.status.bridgeTitle')"
						:loading="bridgeStatusLoading"
						@refresh="loadBridgeStatus"
						@close="bridgeStatusOpen = false"
					/>
					<div class="overflow-y-auto p-5">
						<div
							class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
						>
							<div class="flex items-center gap-2">
								<UBadge
									:color="bridgeConnectionTone"
									variant="soft"
									:icon="bridgeConnectionIcon"
								>
									{{ bridgeConnectionLabel }}
								</UBadge>
								<span class="text-xs text-slate-500 dark:text-slate-400">
									{{ bridgeConnectionHint }}
								</span>
							</div>
							<div class="flex flex-wrap justify-end gap-2">
								<UButton
									v-for="action in bridgeControlActions"
									:key="action.action"
									size="sm"
									:color="action.color"
									:variant="action.variant"
									:icon="action.icon"
									:loading="bridgeStatusLoading"
									@click="controlBridge(action.action)"
								>
									{{ action.label }}
								</UButton>
							</div>
						</div>
						<InfoGrid :items="bridgeStatusItems" tone="modal" />
						<div class="mt-6">
							<div class="flex items-center justify-between gap-3">
								<h3
									class="text-sm font-semibold text-slate-950 dark:text-white"
								>
									{{ t('admin.serverDetail.status.syncStatus') }}
								</h3>
								<div class="flex flex-wrap justify-end gap-2">
									<UButton
										size="xs"
										variant="soft"
										icon="i-lucide-refresh-cw"
										:loading="manualSyncLoading"
										:disabled="!bridgeStatus?.config.enabled"
										@click="triggerManualSync('portalBridge')"
									>
										{{ t('admin.serverDetail.status.manualSync') }}
									</UButton>
									<UButton
										size="xs"
										variant="ghost"
										icon="i-lucide-rotate-cw"
										:loading="manualSyncStatusLoading"
										@click="loadManualSyncStatus('portalBridge')"
									>
										{{ t('admin.serverDetail.status.refreshSync') }}
									</UButton>
								</div>
							</div>
							<div class="mt-3 grid gap-2">
								<div
									v-for="task in manualSyncTasks.portalBridge"
									:key="task.taskKey"
									class="rounded-md bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300"
								>
									<div class="flex items-center justify-between gap-3">
										<span class="font-medium text-slate-900 dark:text-white">
											{{ formatSyncSource(task.source) }}
										</span>
										<UBadge
											:color="
												task.running
													? 'warning'
													: task.lastError
														? 'error'
														: 'success'
											"
											variant="soft"
										>
											{{ formatSyncTaskState(task) }}
										</UBadge>
									</div>
									<div class="mt-2 grid gap-1 sm:grid-cols-2">
										<span
											>{{ t('admin.serverDetail.status.lastStartedAt') }}：{{
												formatDate(task.lastStartedAt)
											}}</span
										>
										<span
											>{{ t('admin.serverDetail.status.lastFinishedAt') }}：{{
												formatDate(task.lastFinishedAt)
											}}</span
										>
										<span
											>{{ t('admin.serverDetail.status.rowsRead') }}：{{
												task.rowsRead
											}}</span
										>
										<span
											>{{ t('admin.serverDetail.status.rowsMatched') }}：{{
												task.rowsMatched
											}}</span
										>
										<span
											>{{ t('admin.serverDetail.status.rowsChanged') }}：{{
												task.rowsChanged
											}}</span
										>
										<span
											>{{ t('admin.serverDetail.status.rowsSkipped') }}：{{
												task.rowsSkipped
											}}</span
										>
									</div>
									<p
										v-if="task.lastError"
										class="mt-2 text-red-600 dark:text-red-400"
									>
										{{ task.lastError }}
									</p>
								</div>
								<p
									v-if="manualSyncTasks.portalBridge.length === 0"
									class="text-sm text-slate-500 dark:text-slate-400"
								>
									{{ t('admin.serverDetail.status.noSyncStatus') }}
								</p>
							</div>
						</div>
						<h3
							class="mt-6 text-sm font-semibold text-slate-950 dark:text-white"
						>
							{{ t('admin.serverDetail.status.heartbeats') }}
						</h3>
						<div class="mt-3 grid gap-2">
							<div
								v-for="heartbeat in bridgeStatus?.heartbeats ?? []"
								:key="heartbeat.id"
								class="rounded-md bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300"
							>
								<div class="flex items-center justify-between gap-3">
									<span>#{{ heartbeat.seq ?? '-' }}</span>
									<span>{{ formatDate(heartbeat.receivedAt) }}</span>
								</div>
							</div>
							<p
								v-if="(bridgeStatus?.heartbeats ?? []).length === 0"
								class="text-sm text-slate-500 dark:text-slate-400"
							>
								{{ t('admin.serverDetail.states.empty') }}
							</p>
						</div>
					</div>
				</div>
			</template>
		</UModal>

		<UModal
			v-model:open="mysqlStatusOpen"
			:ui="{ content: 'max-w-2xl', body: 'p-0' }"
		>
			<template #content>
				<div class="grid max-h-[82vh] grid-rows-[auto_minmax(0,1fr)]">
					<StatusModalHeader
						:title="mysqlStatusTitle"
						:loading="mysqlStatusLoading"
						@refresh="loadMysqlStatus"
						@close="mysqlStatusOpen = false"
					/>
					<div class="overflow-y-auto p-5">
						<InfoGrid :items="mysqlStatusItems" />
						<div class="mt-6">
							<div class="flex items-center justify-between gap-3">
								<h3
									class="text-sm font-semibold text-slate-950 dark:text-white"
								>
									{{ t('admin.serverDetail.status.syncStatus') }}
								</h3>
								<div class="flex flex-wrap justify-end gap-2">
									<UButton
										size="xs"
										variant="soft"
										icon="i-lucide-refresh-cw"
										:loading="manualSyncLoading"
										:disabled="!mysqlStatus?.config.enabled"
										@click="triggerManualSync(mysqlStatusSource)"
									>
										{{ t('admin.serverDetail.status.manualSync') }}
									</UButton>
									<UButton
										size="xs"
										variant="ghost"
										icon="i-lucide-rotate-cw"
										:loading="manualSyncStatusLoading"
										@click="loadManualSyncStatus(mysqlStatusSource)"
									>
										{{ t('admin.serverDetail.status.refreshSync') }}
									</UButton>
								</div>
							</div>
							<div class="mt-3 grid gap-2">
								<div
									v-for="task in manualSyncTasks[mysqlStatusSource]"
									:key="task.taskKey"
									class="rounded-md bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300"
								>
									<div class="flex items-center justify-between gap-3">
										<span class="font-medium text-slate-900 dark:text-white">
											{{ formatSyncSource(task.source) }}
										</span>
										<UBadge
											:color="
												task.running
													? 'warning'
													: task.lastError
														? 'error'
														: 'success'
											"
											variant="soft"
										>
											{{ formatSyncTaskState(task) }}
										</UBadge>
									</div>
									<div class="mt-2 grid gap-1 sm:grid-cols-2">
										<span
											>{{ t('admin.serverDetail.status.lastStartedAt') }}：{{
												formatDate(task.lastStartedAt)
											}}</span
										>
										<span
											>{{ t('admin.serverDetail.status.lastFinishedAt') }}：{{
												formatDate(task.lastFinishedAt)
											}}</span
										>
										<span
											>{{ t('admin.serverDetail.status.rowsRead') }}：{{
												task.rowsRead
											}}</span
										>
										<span
											>{{ t('admin.serverDetail.status.rowsMatched') }}：{{
												task.rowsMatched
											}}</span
										>
										<span
											>{{ t('admin.serverDetail.status.rowsChanged') }}：{{
												task.rowsChanged
											}}</span
										>
										<span
											>{{ t('admin.serverDetail.status.rowsSkipped') }}：{{
												task.rowsSkipped
											}}</span
										>
									</div>
									<p
										v-if="task.lastError"
										class="mt-2 text-red-600 dark:text-red-400"
									>
										{{ task.lastError }}
									</p>
								</div>
								<p
									v-if="manualSyncTasks[mysqlStatusSource].length === 0"
									class="text-sm text-slate-500 dark:text-slate-400"
								>
									{{ t('admin.serverDetail.status.noSyncStatus') }}
								</p>
							</div>
						</div>
					</div>
				</div>
			</template>
		</UModal>
	</div>
</template>

<script setup lang="ts">
import AdminServerConfigModal from '~/components/admin/AdminServerConfigModal.vue'
import type {
	MinecraftServerOverviewResponse,
	MinecraftServerSummary,
	MinecraftServerSnapshotSummary,
	MysqlSourceSummary,
	ExternalSyncTaskStateSummary,
	PortalBridgeCommandSummary,
	PortalBridgeInspectResponse,
	PortalBridgeReceiptSummary,
} from '~/components/admin/types'
import type {
	ServerDetailMetaItem,
	ServerDetailSelectedItem,
	ServerDetailSyncTaskRow,
} from '~/components/admin/server-detail/detail-types'

interface PortalBridgeStatusResponse {
	config: {
		id: string
		bridgeId: string
		module: string
		wsUrl: string
		enabled: boolean
		lastConnectionState: string
		lastConnectedAt: string | null
		lastDisconnectedAt: string | null
		lastError: string | null
		coreSyncIntervalMinutes: number
	}
	runtime: {
		running: boolean
		connected: boolean
		readyState: string
		reconnectAttempts: number
		maxReconnectAttempts: number | null
		nextRetryAt: string | null
		manualRequired: boolean
		lastRuntimeStateChangedAt: string | null
		lastHeartbeatAt: string | null
		lastHeartbeatLatencyMs: number | null
		lastHeartbeatPayload: unknown
	}
	heartbeats: Array<{
		id: string
		seq: string | null
		receivedAt: string
		ackedAt: string | null
		payload: unknown
	}>
}

type PortalBridgeControlAction = 'connect' | 'disconnect' | 'reconnect'
type ManualSyncTarget = 'portalBridge' | 'authme' | 'luckperms'

interface ManualSyncStatusResponse {
	tasks: ExternalSyncTaskStateSummary[]
}

interface MysqlSourceStatusResponse {
	source: 'authme' | 'luckperms'
	config: {
		id: string
		host: string
		port: number
		database: string
		username: string
		enabled: boolean
		syncIntervalSeconds: number
		lastSyncAt: string | null
		lastError: string | null
		hasPassword: boolean
	}
	connection: {
		ok: boolean
		skipped: boolean
		latencyMs: number | null
		errorMessage: string | null
		checkedAt: string | null
	}
}

definePageMeta({ headerVariant: 'solid', middleware: 'admin-auth' })

const route = useRoute()
const localePath = useLocalePath()
const { locale, t } = useI18n()
const { notifyError, notifySuccess } = useAdminToast()
const serverId = computed(() => String(route.params.serverId ?? ''))
const { data, pending, error, refresh } =
	await useFetch<MinecraftServerOverviewResponse>(
		() => `/api/minecraft/servers/${serverId.value}/overview`,
	)

const basicOpen = ref(false)
const portalBridgeOpen = ref(false)
const authMeOpen = ref(false)
const luckPermsOpen = ref(false)
const syncRateOpen = ref(false)
const detailOpen = ref(false)
const inspectorOpen = ref(false)
const inspectorRefreshing = ref(false)
const bridgeStatusOpen = ref(false)
const bridgeStatusLoading = ref(false)
const bridgeStatus = ref<PortalBridgeStatusResponse | null>(null)
const manualSyncLoading = ref(false)
const manualSyncStatusLoading = ref(false)
const manualSyncTasks = ref<
	Record<ManualSyncTarget, ExternalSyncTaskStateSummary[]>
>({
	portalBridge: [],
	authme: [],
	luckperms: [],
})
const mysqlStatusOpen = ref(false)
const mysqlStatusLoading = ref(false)
const mysqlStatusSource = ref<'authme' | 'luckperms'>('authme')
const mysqlStatus = ref<MysqlSourceStatusResponse | null>(null)
const inspectorTarget = ref<'snapshots' | 'bridge'>('snapshots')
const selectedDetail = ref<ServerDetailSelectedItem | null>(null)
const overviewReadAt = ref(new Date().toISOString())
const latestInspectorCommand = ref<{
	action: string
	commandId: string
	sentAt: string
	timedOut: boolean
} | null>(null)
const latestInspectorObserved = ref<unknown>(null)
const overview = computed(() => data.value ?? null)
const server = computed<MinecraftServerSummary | null>(
	() => overview.value?.server ?? null,
)
const observedPlayerCount = computed(
	() => overview.value?.metrics.latestPlayerSnapshot?.players.length ?? 0,
)
const serverPlayerRows = computed(() => overview.value?.playerInfoPreview ?? [])

const formatDate = (value: string | null | undefined): string => {
	if (!value) return t('admin.serverDetail.states.empty')
	return new Intl.DateTimeFormat(locale.value, {
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(value))
}
const formatJson = (value: unknown): string =>
	JSON.stringify(value ?? null, null, 2)
const headerActions = computed(() => [
	{
		label: t('admin.serverDetail.actions.basic'),
		icon: 'i-lucide-server',
		color: 'primary' as const,
		onClick: () => (basicOpen.value = true),
	},
	{
		label: t('admin.serverDetail.actions.bridge'),
		icon: 'i-lucide-radio-tower',
		color: 'primary' as const,
		onClick: () => (portalBridgeOpen.value = true),
	},
	{
		label: t('admin.serverDetail.actions.syncRate'),
		icon: 'i-lucide-timer-reset',
		color: 'primary' as const,
		onClick: () => (syncRateOpen.value = true),
	},
])

const portalBridgeItems = computed<ServerDetailMetaItem[]>(() => [
	{
		label: t('admin.serverDetail.fields.connectionState'),
		value:
			server.value?.portalBridge?.lastConnectionState ??
			t('admin.serverDetail.states.notConfigured'),
	},
	{
		label: 'Bridge ID',
		value:
			server.value?.portalBridge?.bridgeId ??
			t('admin.serverDetail.states.notConfigured'),
	},
	{
		label: 'Module',
		value:
			server.value?.portalBridge?.module ??
			t('admin.serverDetail.states.notConfigured'),
	},
	{
		label: 'Resume Seq',
		value: server.value?.portalBridge?.resumeFromSeq ?? '0',
	},
	{
		label: t('admin.serverDetail.fields.lastConnected'),
		value: formatDate(server.value?.portalBridge?.lastConnectedAt),
	},
	{
		label: t('admin.serverDetail.fields.lastMessage'),
		value: formatDate(overview.value?.bridge.lastReceipt?.receivedAt),
	},
])
const serverInfoItems = computed<ServerDetailMetaItem[]>(() => [
	{
		label: t('admin.serverDetail.fields.code'),
		value: server.value?.code ?? t('admin.serverDetail.states.empty'),
	},
	{
		label: t('admin.serverDetail.fields.address'),
		value: server.value
			? `${server.value.host}:${server.value.port}`
			: t('admin.serverDetail.states.empty'),
	},
	{
		label: t('admin.serverDetail.fields.sortOrder'),
		value: String(server.value?.sortOrder ?? 0),
	},
	{
		label: t('admin.serverDetail.fields.createdAt'),
		value: formatDate(server.value?.createdAt),
	},
])
const portalBridgeStatusActions = computed(() => [
	{
		label: t('admin.serverDetail.actions.bridgeStatus'),
		icon: 'i-lucide-activity',
		onClick: () => {
			bridgeStatusOpen.value = true
			void loadBridgeStatus()
			void loadManualSyncStatus('portalBridge')
		},
	},
])
const playerDataItems = computed<ServerDetailMetaItem[]>(() => [
	{
		label: t('admin.serverDetail.fields.identityCount'),
		value: String(overview.value?.metrics.identityCount ?? 0),
	},
	{
		label: t('admin.serverDetail.fields.observedPlayers'),
		value: String(observedPlayerCount.value),
	},
	{
		label: t('admin.serverDetail.fields.openSessions'),
		value: String(overview.value?.metrics.openSessionCount ?? 0),
	},
	{
		label: t('admin.serverDetail.fields.totalSessions'),
		value: String(overview.value?.metrics.totalSessionCount ?? 0),
	},
])

const formatBoolean = (value: boolean): string =>
	value
		? t('admin.serverDetail.states.enabled')
		: t('admin.serverDetail.states.disabled')

const formatLatency = (value: number | null | undefined): string =>
	value == null ? t('admin.serverDetail.states.empty') : `${value} ms`
const formatReconnectAttempts = (
	attempts: number,
	maxAttempts: number | null,
): string =>
	maxAttempts == null
		? `${attempts} / ${t('admin.serverDetail.status.unlimited')}`
		: `${attempts} / ${maxAttempts}`

const bridgeConnectionLabel = computed(() => {
	const status = bridgeStatus.value

	if (!status) return t('admin.serverDetail.status.notLoaded')
	if (!status.config.enabled) return t('admin.serverDetail.states.disabled')
	if (status.runtime.connected) {
		return t('admin.serverDetail.status.connected')
	}
	if (status.runtime.manualRequired) {
		return t('admin.serverDetail.status.manualRequired')
	}
	if (status.runtime.running) {
		return t('admin.serverDetail.status.connecting')
	}

	return t('admin.serverDetail.status.disconnected')
})

const bridgeConnectionHint = computed(() => {
	const status = bridgeStatus.value

	if (!status) return t('admin.serverDetail.status.notLoadedHint')
	if (!status.config.enabled) return t('admin.serverDetail.status.disabledHint')
	if (status.runtime.connected) {
		return t('admin.serverDetail.status.connectedHint')
	}
	if (status.runtime.nextRetryAt) {
		return t('admin.serverDetail.status.retryHint', {
			time: formatDate(status.runtime.nextRetryAt),
		})
	}
	if (status.runtime.manualRequired) {
		return t('admin.serverDetail.status.manualRequiredHint')
	}

	return t('admin.serverDetail.status.disconnectedHint')
})

const bridgeConnectionTone = computed(() => {
	const status = bridgeStatus.value

	if (!status || !status.config.enabled) return 'neutral'
	if (status.runtime.connected) return 'success'
	if (status.runtime.running && !status.runtime.manualRequired) return 'warning'

	return 'error'
})

const bridgeConnectionIcon = computed(() => {
	const status = bridgeStatus.value

	if (!status) return 'i-lucide-circle-help'
	if (!status.config.enabled) return 'i-lucide-circle-pause'
	if (status.runtime.connected) return 'i-lucide-circle-check'
	if (status.runtime.running && !status.runtime.manualRequired) {
		return 'i-lucide-loader-circle'
	}

	return 'i-lucide-circle-alert'
})

const bridgeControlActions = computed(() => {
	const status = bridgeStatus.value

	if (!status || !status.config.enabled) return []

	if (status.runtime.connected) {
		return [
			{
				action: 'reconnect' as const,
				label: t('admin.serverDetail.status.reconnect'),
				icon: 'i-lucide-refresh-cw',
				color: 'primary' as const,
				variant: 'solid' as const,
			},
			{
				action: 'disconnect' as const,
				label: t('admin.serverDetail.status.disconnect'),
				icon: 'i-lucide-unplug',
				color: 'neutral' as const,
				variant: 'soft' as const,
			},
		]
	}

	if (status.runtime.running && !status.runtime.manualRequired) {
		return [
			{
				action: 'reconnect' as const,
				label: t('admin.serverDetail.status.reconnect'),
				icon: 'i-lucide-refresh-cw',
				color: 'primary' as const,
				variant: 'solid' as const,
			},
			{
				action: 'disconnect' as const,
				label: t('admin.serverDetail.status.disconnect'),
				icon: 'i-lucide-unplug',
				color: 'neutral' as const,
				variant: 'soft' as const,
			},
		]
	}

	return [
		{
			action: 'connect' as const,
			label: t('admin.serverDetail.status.connect'),
			icon: 'i-lucide-plug',
			color: 'primary' as const,
			variant: 'solid' as const,
		},
	]
})

const bridgeStatusItems = computed<ServerDetailMetaItem[]>(() => {
	const status = bridgeStatus.value

	if (!status) {
		return []
	}

	return [
		{ label: 'Bridge ID', value: status.config.bridgeId },
		{ label: 'Module', value: status.config.module },
		{ label: 'WebSocket', value: status.config.wsUrl },
		{
			label: t('admin.serverDetail.status.enabled'),
			value: formatBoolean(status.config.enabled),
		},
		{
			label: t('admin.serverDetail.fields.connectionState'),
			value: status.config.lastConnectionState,
		},
		{
			label: t('admin.serverDetail.status.runtimeState'),
			value: status.runtime.readyState,
		},
		{
			label: t('admin.serverDetail.status.running'),
			value: formatBoolean(status.runtime.running),
		},
		{
			label: t('admin.serverDetail.status.connected'),
			value: formatBoolean(status.runtime.connected),
		},
		{
			label: t('admin.serverDetail.status.latency'),
			value: formatLatency(status.runtime.lastHeartbeatLatencyMs),
		},
		{
			label: t('admin.serverDetail.status.reconnectAttempts'),
			value: formatReconnectAttempts(
				status.runtime.reconnectAttempts,
				status.runtime.maxReconnectAttempts,
			),
		},
		{
			label: t('admin.serverDetail.status.nextRetryAt'),
			value: formatDate(status.runtime.nextRetryAt),
		},
		{
			label: t('admin.serverDetail.status.manualRequired'),
			value: formatBoolean(status.runtime.manualRequired),
		},
		{
			label: t('admin.serverDetail.status.lastHeartbeatAt'),
			value: formatDate(status.runtime.lastHeartbeatAt),
		},
		{
			label: t('admin.serverDetail.fields.lastConnected'),
			value: formatDate(status.config.lastConnectedAt),
		},
		{
			label: t('admin.serverDetail.status.lastDisconnectedAt'),
			value: formatDate(status.config.lastDisconnectedAt),
		},
		{
			label: t('admin.serverDetail.detail.error'),
			value: status.config.lastError ?? t('admin.serverDetail.states.empty'),
		},
	]
})

const mysqlStatusTitle = computed(() =>
	mysqlStatusSource.value === 'authme'
		? t('admin.serverDetail.status.authMeTitle')
		: t('admin.serverDetail.status.luckPermsTitle'),
)

const mysqlStatusItems = computed<ServerDetailMetaItem[]>(() => {
	const status = mysqlStatus.value

	if (!status) {
		return []
	}

	return [
		{ label: 'Host', value: status.config.host },
		{ label: 'Port', value: String(status.config.port) },
		{ label: 'Database', value: status.config.database },
		{ label: 'Username', value: status.config.username },
		{
			label: t('admin.serverDetail.status.enabled'),
			value: formatBoolean(status.config.enabled),
		},
		{
			label: t('admin.serverDetail.status.connected'),
			value: status.connection.skipped
				? t('admin.serverDetail.status.connectionSkipped')
				: status.connection.ok
					? t('admin.serverDetail.status.connectionOk')
					: t('admin.serverDetail.status.connectionFailed'),
		},
		{
			label: t('admin.serverDetail.status.latency'),
			value: formatLatency(status.connection.latencyMs),
		},
		{
			label: t('admin.serverDetail.status.checkedAt'),
			value: formatDate(status.connection.checkedAt),
		},
		{
			label: t('admin.serverDetail.fields.lastUpdated'),
			value: formatDate(status.config.lastSyncAt),
		},
		{
			label: t('admin.serverDetail.detail.error'),
			value:
				status.connection.errorMessage ??
				status.config.lastError ??
				t('admin.serverDetail.states.empty'),
		},
	]
})

const syncSourceOrder = [
	'PORTAL_BRIDGE_PLAYERS',
	'PORTAL_BRIDGE_PLAYERDATA',
	'PORTAL_BRIDGE_STATS',
	'PORTAL_BRIDGE_ADVANCEMENTS',
] as const
const syncSourceLabelKey: Record<(typeof syncSourceOrder)[number], string> = {
	PORTAL_BRIDGE_PLAYERS: 'portalBridgePlayers',
	PORTAL_BRIDGE_PLAYERDATA: 'portalBridgePlayerData',
	PORTAL_BRIDGE_STATS: 'portalBridgeStats',
	PORTAL_BRIDGE_ADVANCEMENTS: 'portalBridgeAdvancements',
}
const formatSyncSource = (source: string): string => {
	if (source in syncSourceLabelKey) {
		return t(
			`admin.serverDetail.syncSources.${syncSourceLabelKey[source as keyof typeof syncSourceLabelKey]}`,
		)
	}

	return source
}
const formatSyncTaskState = (task: ExternalSyncTaskStateSummary): string => {
	if (task.running) return t('admin.serverDetail.syncStates.running')
	if (task.lastError) return t('admin.serverDetail.syncStates.error')
	if (task.lastSuccessAt) return t('admin.serverDetail.syncStates.success')

	return t('admin.serverDetail.syncStates.waiting')
}
const syncTaskRows = computed<ServerDetailSyncTaskRow[]>(() =>
	syncSourceOrder.map((source) => {
		const task = overview.value?.syncTaskStates.find(
			(item) => item.source === source,
		)
		const label = t(
			`admin.serverDetail.syncSources.${syncSourceLabelKey[source]}`,
		)
		if (!task)
			return {
				source,
				label,
				icon: 'i-lucide-circle-dashed',
				iconClass: 'size-4 text-slate-400 dark:text-slate-500',
				statusText: t('admin.serverDetail.syncStates.waiting'),
				lastText: t('admin.serverDetail.states.empty'),
			}
		if (task.running)
			return {
				source,
				label,
				icon: 'i-lucide-loader-circle',
				iconClass: 'size-4 animate-spin text-sky-500',
				statusText: t('admin.serverDetail.syncStates.running'),
				lastText: formatDate(task.lastStartedAt),
			}
		if (task.lastError)
			return {
				source,
				label,
				icon: 'i-lucide-circle-alert',
				iconClass: 'size-4 text-rose-500',
				statusText: t('admin.serverDetail.syncStates.error'),
				lastText: task.lastError,
			}
		return {
			source,
			label,
			icon: 'i-lucide-circle-check',
			iconClass: 'size-4 text-emerald-500',
			statusText: t('admin.serverDetail.syncStates.success'),
			lastText: formatDate(task.lastSuccessAt ?? task.lastFinishedAt),
		}
	}),
)

const latestOnlineText = computed(() => {
	const latestPlayers =
		overview.value?.metrics.latestPlayerSnapshot?.players ?? []
	const latest = overview.value?.metrics.latestStatus
	if (latestPlayers.length > 0) return String(latestPlayers.length)
	if (!latest) return t('admin.serverDetail.states.empty')
	return latest.maxPlayers === null
		? String(latest.onlinePlayers)
		: `${latest.onlinePlayers} / ${latest.maxPlayers}`
})
const latestStatusAt = computed(() =>
	formatDate(
		overview.value?.metrics.latestPlayerSnapshot?.observedAt ??
			overview.value?.metrics.latestStatus?.observedAt,
	),
)

const snapshotListItems = computed(() =>
	(overview.value?.snapshots ?? []).map((snapshot) => ({
		key: snapshot.id,
		primary: snapshot.kind,
		secondary: formatDate(snapshot.observedAt),
	})),
)
const receiptListItems = computed(() =>
	(overview.value?.bridge.recentReceipts ?? []).map((receipt) => ({
		key: receipt.id ?? receipt.topic,
		primary: receipt.topic,
		secondary: `#${receipt.seq ?? '-'}`,
	})),
)
const commandListItems = computed(() =>
	(overview.value?.bridge.recentCommands ?? []).map((command) => ({
		key: command.id,
		primary: command.action,
		secondary: `${command.status} · ${formatDate(command.createdAt)}`,
	})),
)
const serverPlayerListItems = computed(() =>
	serverPlayerRows.value.map((player) => ({
		key: player.uuid ?? player.id,
		primary: player.username ?? t('admin.serverDetail.states.empty'),
	})),
)

const findSnapshot = (id: string) =>
	overview.value?.snapshots.find((item) => item.id === id) ?? null
const findReceipt = (id: string) =>
	(overview.value?.bridge.recentReceipts ?? []).find(
		(item) => item.id === id || item.topic === id,
	) ?? null
const findCommand = (id: string) =>
	(overview.value?.bridge.recentCommands ?? []).find(
		(item) => item.id === id,
	) ?? null

const openSnapshotDetail = (snapshot: MinecraftServerSnapshotSummary): void => {
	selectedDetail.value = {
		type: t('admin.serverDetail.sections.recentSnapshots'),
		title: snapshot.kind,
		meta: [
			{ label: t('admin.serverDetail.detail.snapshotId'), value: snapshot.id },
			{
				label: t('admin.serverDetail.detail.observedAt'),
				value: formatDate(snapshot.observedAt),
			},
			{
				label: t('admin.serverDetail.detail.createdAt'),
				value: formatDate(snapshot.createdAt),
			},
		],
		json: formatJson(snapshot.payload),
	}
	detailOpen.value = true
}
const openSnapshotDetailById = (id: string) => {
	const snapshot = findSnapshot(id)
	if (snapshot) openSnapshotDetail(snapshot)
}

const openReceiptDetail = (receipt: PortalBridgeReceiptSummary): void => {
	selectedDetail.value = {
		type: t('admin.serverDetail.sections.recentBridgeMessages'),
		title: receipt.topic,
		meta: [
			{
				label: t('admin.serverDetail.detail.messageId'),
				value: receipt.id ?? t('admin.serverDetail.states.empty'),
			},
			{
				label: 'Seq',
				value: receipt.seq ?? t('admin.serverDetail.states.empty'),
			},
			{
				label: t('admin.serverDetail.detail.receivedAt'),
				value: formatDate(receipt.receivedAt),
			},
			{
				label: t('admin.serverDetail.detail.ackedAt'),
				value: formatDate(receipt.ackedAt),
			},
		],
		json: formatJson(receipt.payload),
	}
	detailOpen.value = true
}
const openReceiptDetailById = (id: string) => {
	const receipt = findReceipt(id)
	if (receipt) openReceiptDetail(receipt)
}

const openCommandDetail = (command: PortalBridgeCommandSummary): void => {
	selectedDetail.value = {
		type: t('admin.serverDetail.sections.recentCommands'),
		title: command.action,
		meta: [
			{ label: 'Command ID', value: command.commandId },
			{ label: t('admin.serverDetail.detail.status'), value: command.status },
			{
				label: t('admin.serverDetail.detail.createdAt'),
				value: formatDate(command.createdAt),
			},
			{
				label: t('admin.serverDetail.detail.sentAt'),
				value: formatDate(command.sentAt),
			},
			{
				label: t('admin.serverDetail.detail.completedAt'),
				value: formatDate(command.completedAt),
			},
			{
				label: t('admin.serverDetail.detail.error'),
				value: command.errorMessage ?? t('admin.serverDetail.states.empty'),
			},
		],
		json: formatJson(command.payload),
	}
	detailOpen.value = true
}
const openCommandDetailById = (id: string) => {
	const command = findCommand(id)
	if (command) openCommandDetail(command)
}

const inspectorTitle = computed(() =>
	inspectorTarget.value === 'snapshots'
		? t('admin.serverDetail.inspector.snapshotsTitle')
		: t('admin.serverDetail.inspector.bridgeTitle'),
)
const inspectorJson = computed(() =>
	formatJson(
		inspectorTarget.value === 'snapshots'
			? {
					serverId: server.value?.serverId ?? serverId.value,
					lastTestCommand: latestInspectorCommand.value,
					observed: latestInspectorObserved.value,
					snapshots: overview.value?.snapshots ?? [],
				}
			: {
					serverId: server.value?.serverId ?? serverId.value,
					lastTestCommand: latestInspectorCommand.value,
					observed: latestInspectorObserved.value,
					bridge: overview.value?.bridge ?? null,
				},
	),
)
const inspectorMetaItems = computed<ServerDetailMetaItem[]>(() => [
	{
		label: t('admin.serverDetail.fields.serverId'),
		value: server.value?.serverId ?? serverId.value,
	},
	{
		label: t('admin.serverDetail.fields.lastUpdated'),
		value: formatDate(overviewReadAt.value),
	},
])
const openInspector = (target: 'snapshots' | 'bridge'): void => {
	inspectorTarget.value = target
	inspectorOpen.value = true
}

const loadBridgeStatus = async () => {
	bridgeStatusLoading.value = true
	try {
		bridgeStatus.value = await $fetch<PortalBridgeStatusResponse>(
			`/api/minecraft/servers/${serverId.value}/portal-bridge/status`,
		)
	} catch (err) {
		notifyError(err, { title: t('admin.serverDetail.status.loadFailed') })
	} finally {
		bridgeStatusLoading.value = false
	}
}

const controlBridge = async (action: PortalBridgeControlAction) => {
	bridgeStatusLoading.value = true
	try {
		await $fetch(
			`/api/minecraft/servers/${serverId.value}/portal-bridge/control`,
			{
				method: 'POST',
				body: { action },
			},
		)
		await loadBridgeStatus()
		await refreshOverview()
	} catch (err) {
		notifyError(err, { title: t('admin.serverDetail.status.controlFailed') })
	} finally {
		bridgeStatusLoading.value = false
	}
}

const loadManualSyncStatus = async (target: ManualSyncTarget) => {
	manualSyncStatusLoading.value = true
	try {
		const result = await $fetch<ManualSyncStatusResponse>(
			`/api/minecraft/servers/${serverId.value}/sync/status`,
			{
				query: { group: target },
			},
		)
		manualSyncTasks.value[target] = result.tasks
	} catch (err) {
		notifyError(err, { title: t('admin.serverDetail.status.loadFailed') })
	} finally {
		manualSyncStatusLoading.value = false
	}
}

const triggerManualSync = async (target: ManualSyncTarget) => {
	manualSyncLoading.value = true
	try {
		const result = await $fetch<ManualSyncStatusResponse>(
			`/api/minecraft/servers/${serverId.value}/sync/trigger`,
			{
				method: 'POST',
				body: { target },
			},
		)
		manualSyncTasks.value[target] = result.tasks
		await refreshOverview()
		if (target === 'portalBridge') {
			await loadBridgeStatus()
		} else {
			await loadMysqlStatus()
		}
	} catch (err) {
		notifyError(err, { title: t('admin.serverDetail.status.manualSyncFailed') })
	} finally {
		manualSyncLoading.value = false
	}
}

const openMysqlStatus = (source: 'authme' | 'luckperms') => {
	mysqlStatusSource.value = source
	mysqlStatusOpen.value = true
	void loadMysqlStatus()
	void loadManualSyncStatus(source)
}

const loadMysqlStatus = async () => {
	mysqlStatusLoading.value = true
	try {
		mysqlStatus.value = await $fetch<MysqlSourceStatusResponse>(
			`/api/minecraft/servers/${serverId.value}/sources/${mysqlStatusSource.value}/status`,
		)
	} catch (err) {
		notifyError(err, { title: t('admin.serverDetail.status.loadFailed') })
	} finally {
		mysqlStatusLoading.value = false
	}
}

const refreshOverview = async () => {
	await refresh()
	overviewReadAt.value = new Date().toISOString()
}
const refreshObservedOverview = async () => {
	if (!server.value?.portalBridge?.id) return await refreshOverview()
	try {
		const result = await $fetch<PortalBridgeInspectResponse>(
			`/api/minecraft/servers/${serverId.value}/portal-bridge/inspect`,
			{ method: 'POST', body: { target: 'snapshots' } },
		)
		latestInspectorCommand.value = {
			action: result.command.action,
			commandId: result.command.commandId,
			sentAt: result.command.sentAt,
			timedOut: result.command.timedOut,
		}
		latestInspectorObserved.value = result.observed
		data.value = result.overview
		overviewReadAt.value = new Date().toISOString()
	} catch {
		await refreshOverview()
	}
}
const testAndRefreshInspector = async () => {
	inspectorRefreshing.value = true
	try {
		const result = await $fetch<PortalBridgeInspectResponse>(
			`/api/minecraft/servers/${serverId.value}/portal-bridge/inspect`,
			{ method: 'POST', body: { target: inspectorTarget.value } },
		)
		latestInspectorCommand.value = {
			action: result.command.action,
			commandId: result.command.commandId,
			sentAt: result.command.sentAt,
			timedOut: result.command.timedOut,
		}
		latestInspectorObserved.value = result.observed
		data.value = result.overview
		overviewReadAt.value = new Date().toISOString()
	} catch (err) {
		notifyError(err, { title: t('admin.serverDetail.loadFailed') })
	} finally {
		inspectorRefreshing.value = false
	}
}

let refreshTimer: ReturnType<typeof setInterval> | null = null
let statusRefreshTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
	void refreshObservedOverview()
	refreshTimer = setInterval(() => {
		void refreshObservedOverview()
	}, 60_000)
	statusRefreshTimer = setInterval(() => {
		if (bridgeStatusOpen.value) {
			void loadBridgeStatus()
			void loadManualSyncStatus('portalBridge')
		}

		if (mysqlStatusOpen.value) {
			void loadMysqlStatus()
			void loadManualSyncStatus(mysqlStatusSource.value)
		}
	}, 5_000)
})
onBeforeUnmount(() => {
	if (refreshTimer) clearInterval(refreshTimer)
	if (statusRefreshTimer) clearInterval(statusRefreshTimer)
})
watch(
	error,
	(value) =>
		value && notifyError(value, { title: t('admin.serverDetail.loadFailed') }),
	{ immediate: true },
)
watch(
	data,
	(value) => {
		if (value) overviewReadAt.value = new Date().toISOString()
	},
	{ immediate: true },
)

const handleSaved = async (savedServer: MinecraftServerSummary) => {
	if (savedServer.serverId !== serverId.value)
		return await navigateTo(
			localePath(`/admin/servers/${savedServer.serverId}`),
		)
	await refreshOverview()
	notifySuccess({ title: t('admin.notifications.serverSaved') })
}
</script>
