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
					{{ t('admin.serverDetail.back') }}
				</UButton>
				<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
					{{ server?.name ?? t('admin.serverDetail.fallbackTitle') }}
				</h1>
				<p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
					{{ server?.serverId ?? serverId }}
				</p>
			</div>
			<div class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
				<UButton
					icon="i-lucide-server"
					color="primary"
					@click="basicOpen = true"
				>
					{{ t('admin.serverDetail.actions.basic') }}
				</UButton>
				<UButton
					icon="i-lucide-radio-tower"
					color="primary"
					@click="portalBridgeOpen = true"
				>
					{{ t('admin.serverDetail.actions.bridge') }}
				</UButton>
				<UButton
					icon="i-lucide-database"
					color="primary"
					@click="authMeOpen = true"
				>
					{{ t('admin.serverDetail.actions.authMe') }}
				</UButton>
				<UButton
					icon="i-lucide-shield-check"
					color="primary"
					@click="luckPermsOpen = true"
				>
					{{ t('admin.serverDetail.actions.luckPerms') }}
				</UButton>
			</div>
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
			<section
				class="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
			>
				<h2 class="text-base font-semibold text-slate-950 dark:text-white">
					{{ t('admin.serverDetail.sections.onlinePlayers') }}
				</h2>
				<div class="mt-4 flex items-end justify-between gap-4">
					<div>
						<p class="text-3xl font-semibold text-slate-950 dark:text-white">
							{{ latestOnlineText }}
						</p>
						<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
							{{ latestStatusAt }}
						</p>
					</div>
					<div
						class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
					>
						<span
							class="h-2 w-2 rounded-full"
							:class="server.enabled ? 'bg-emerald-500' : 'bg-slate-400'"
						/>
						{{
							server.enabled
								? t('admin.serverDetail.states.enabled')
								: t('admin.serverDetail.states.disabled')
						}}
					</div>
				</div>
				<AdminServerPlayersChart
					:points="overview?.metrics.playerHistory ?? []"
					:label="t('admin.serverDetail.chart.onlinePlayers')"
					:empty-text="t('admin.serverDetail.chart.empty')"
					:locale="locale"
				/>
			</section>

			<section
				class="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
			>
				<h2 class="text-base font-semibold text-slate-950 dark:text-white">
					{{ t('admin.serverDetail.sections.portalBridge') }}
				</h2>
				<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
					<InfoItem
						:label="t('admin.serverDetail.fields.connectionState')"
						:value="
							server.portalBridge?.lastConnectionState ??
							t('admin.serverDetail.states.notConfigured')
						"
					/>
					<InfoItem
						label="Bridge ID"
						:value="
							server.portalBridge?.bridgeId ??
							t('admin.serverDetail.states.notConfigured')
						"
					/>
					<InfoItem
						label="Module"
						:value="
							server.portalBridge?.module ??
							t('admin.serverDetail.states.notConfigured')
						"
					/>
					<InfoItem
						label="Resume Seq"
						:value="server.portalBridge?.resumeFromSeq ?? '0'"
					/>
					<InfoItem
						:label="t('admin.serverDetail.fields.lastConnected')"
						:value="formatDate(server.portalBridge?.lastConnectedAt)"
					/>
					<InfoItem
						:label="t('admin.serverDetail.fields.lastMessage')"
						:value="formatDate(overview?.bridge.lastReceipt?.receivedAt)"
					/>
				</div>
				<p
					v-if="server.portalBridge?.lastError"
					class="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-400/10 dark:text-rose-300"
				>
					{{ server.portalBridge.lastError }}
				</p>
			</section>

			<section
				class="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
			>
				<h2 class="text-base font-semibold text-slate-950 dark:text-white">
					{{ t('admin.serverDetail.sections.serverInfo') }}
				</h2>
				<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
					<InfoItem
						:label="t('admin.serverDetail.fields.code')"
						:value="server.code"
					/>
					<InfoItem
						:label="t('admin.serverDetail.fields.address')"
						:value="`${server.host}:${server.port}`"
					/>
					<InfoItem
						:label="t('admin.serverDetail.fields.sortOrder')"
						:value="String(server.sortOrder)"
					/>
					<InfoItem
						:label="t('admin.serverDetail.fields.createdAt')"
						:value="formatDate(server.createdAt)"
					/>
				</div>
			</section>

			<section
				class="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
			>
				<h2 class="text-base font-semibold text-slate-950 dark:text-white">
					{{ t('admin.serverDetail.sections.dataSources') }}
				</h2>
				<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
					<InfoItem label="AuthMe" :value="sourceState(server.authMe)" />
					<InfoItem
						:label="t('admin.serverDetail.fields.authMeDatabase')"
						:value="
							server.authMe?.database ??
							t('admin.serverDetail.states.notConfigured')
						"
					/>
					<InfoItem label="LuckPerms" :value="sourceState(server.luckPerms)" />
					<InfoItem
						:label="t('admin.serverDetail.fields.luckPermsDatabase')"
						:value="
							server.luckPerms?.database ??
							t('admin.serverDetail.states.notConfigured')
						"
					/>
				</div>
			</section>

			<section
				class="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
			>
				<h2 class="text-base font-semibold text-slate-950 dark:text-white">
					{{ t('admin.serverDetail.sections.playerData') }}
				</h2>
				<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
					<InfoItem
						:label="t('admin.serverDetail.fields.identityCount')"
						:value="String(overview?.metrics.identityCount ?? 0)"
					/>
					<InfoItem
						:label="t('admin.serverDetail.fields.observedPlayers')"
						:value="String(observedPlayerCount)"
					/>
					<InfoItem
						:label="t('admin.serverDetail.fields.openSessions')"
						:value="String(overview?.metrics.openSessionCount ?? 0)"
					/>
					<InfoItem
						:label="t('admin.serverDetail.fields.totalSessions')"
						:value="String(overview?.metrics.totalSessionCount ?? 0)"
					/>
				</div>
			</section>

			<section
				class="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
			>
				<div class="flex items-center justify-between gap-3">
					<h2 class="text-base font-semibold text-slate-950 dark:text-white">
						{{ t('admin.serverDetail.sections.recentSnapshots') }}
					</h2>
					<UButton
						size="xs"
						variant="link"
						icon="i-lucide-flask-conical"
						@click="openInspector('snapshots')"
					>
						{{ t('admin.serverDetail.actions.testAndInspect') }}
					</UButton>
				</div>
				<div class="mt-4 grid gap-3">
					<button
						v-for="snapshot in overview?.snapshots ?? []"
						:key="snapshot.id"
						type="button"
						class="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-3 py-2 text-left text-sm transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 dark:bg-slate-900 dark:hover:bg-slate-800"
						@click="openSnapshotDetail(snapshot)"
					>
						<span class="font-medium text-slate-800 dark:text-slate-100">
							{{ snapshot.kind }}
						</span>
						<span
							class="flex shrink-0 items-center gap-2 text-slate-500 dark:text-slate-400"
						>
							{{ formatDate(snapshot.observedAt) }}
							<UIcon name="i-lucide-chevron-right" class="size-4" />
						</span>
					</button>
					<p
						v-if="(overview?.snapshots.length ?? 0) === 0"
						class="text-sm text-slate-500 dark:text-slate-400"
					>
						{{ t('admin.serverDetail.empty.snapshots') }}
					</p>
				</div>
			</section>

			<section
				class="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
			>
				<div class="flex items-center justify-between gap-3">
					<h2 class="text-base font-semibold text-slate-950 dark:text-white">
						{{ t('admin.serverDetail.sections.recentBridgeMessages') }}
					</h2>
					<UButton
						size="xs"
						variant="link"
						icon="i-lucide-flask-conical"
						@click="openInspector('bridge')"
					>
						{{ t('admin.serverDetail.actions.testAndInspect') }}
					</UButton>
				</div>
				<div class="mt-4 grid gap-3">
					<button
						v-for="receipt in overview?.bridge.recentReceipts ?? []"
						:key="receipt.id"
						type="button"
						class="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-3 py-2 text-left text-sm transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 dark:bg-slate-900 dark:hover:bg-slate-800"
						@click="openReceiptDetail(receipt)"
					>
						<span
							class="min-w-0 truncate font-medium text-slate-800 dark:text-slate-100"
						>
							{{ receipt.topic }}
						</span>
						<span
							class="flex shrink-0 items-center gap-2 text-slate-500 dark:text-slate-400"
						>
							#{{ receipt.seq ?? '-' }}
							<UIcon name="i-lucide-chevron-right" class="size-4" />
						</span>
					</button>
					<p
						v-if="(overview?.bridge.recentReceipts.length ?? 0) === 0"
						class="text-sm text-slate-500 dark:text-slate-400"
					>
						{{ t('admin.serverDetail.empty.messages') }}
					</p>
				</div>
			</section>

			<section
				class="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
			>
				<h2 class="text-base font-semibold text-slate-950 dark:text-white">
					{{ t('admin.serverDetail.sections.recentCommands') }}
				</h2>
				<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
					{{ t('admin.serverDetail.sections.recentCommandsHint') }}
				</p>
				<div class="mt-4 grid gap-3">
					<button
						v-for="command in overview?.bridge.recentCommands ?? []"
						:key="command.id"
						type="button"
						class="grid gap-1 rounded-md bg-slate-50 px-3 py-2 text-left text-sm transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 dark:bg-slate-900 dark:hover:bg-slate-800 sm:grid-cols-[1fr_auto]"
						@click="openCommandDetail(command)"
					>
						<span
							class="min-w-0 truncate font-medium text-slate-800 dark:text-slate-100"
						>
							{{ command.action }}
						</span>
						<span
							class="flex items-center gap-2 text-slate-500 dark:text-slate-400"
						>
							{{ command.status }} · {{ formatDate(command.createdAt) }}
							<UIcon name="i-lucide-chevron-right" class="size-4" />
						</span>
					</button>
					<p
						v-if="(overview?.bridge.recentCommands.length ?? 0) === 0"
						class="text-sm text-slate-500 dark:text-slate-400"
					>
						{{ t('admin.serverDetail.empty.commands') }}
					</p>
				</div>
			</section>

			<section
				class="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
			>
				<div class="flex items-center justify-between gap-3">
					<h2 class="text-base font-semibold text-slate-950 dark:text-white">
						{{ t('admin.serverDetail.sections.serverPlayerInfo') }}
					</h2>
					<UButton size="xs" variant="link" icon="i-lucide-chevron-right">
						{{ t('admin.serverDetail.actions.viewAll') }}
					</UButton>
				</div>
				<div
					class="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800"
				>
					<div
						class="grid grid-cols-[1.4fr_1.1fr_1fr_auto] gap-3 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400"
					>
						<span>{{ t('admin.serverDetail.fields.playerName') }}</span>
						<span>UUID</span>
						<span>{{ t('admin.serverDetail.fields.firstJoinedAt') }}</span>
						<span class="text-right">&nbsp;</span>
					</div>
					<div
						v-if="serverPlayerRows.length === 0"
						class="flex flex-col items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500 dark:text-slate-400"
					>
						<UIcon name="i-lucide-inbox" class="size-5" />
						<span>{{ t('admin.serverDetail.empty.playerInfo') }}</span>
					</div>
					<div v-else class="divide-y divide-slate-200 dark:divide-slate-800">
						<button
							v-for="player in serverPlayerRows"
							:key="player.uuid"
							type="button"
							class="grid w-full grid-cols-[1.4fr_1.1fr_1fr_auto] gap-3 px-4 py-3 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-900"
						>
							<span
								class="truncate font-medium text-slate-900 dark:text-slate-100"
							>
								{{ player.username }}
							</span>
							<span class="truncate text-slate-500 dark:text-slate-400">
								{{ player.uuid }}
							</span>
							<span class="text-slate-500 dark:text-slate-400">
								{{ formatDate(player.firstSeenAt) }}
							</span>
							<span class="flex justify-end text-slate-400 dark:text-slate-500">
								<UIcon name="i-lucide-chevron-right" class="size-4" />
							</span>
						</button>
					</div>
				</div>
			</section>
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
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<InfoItem
								v-for="meta in selectedDetail?.meta ?? []"
								:key="meta.label"
								:label="meta.label"
								:value="meta.value"
							/>
						</div>
						<pre
							class="mt-5 max-h-[56vh] overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100 dark:border-slate-800"
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
							>
								{{ t('admin.serverDetail.actions.testRefresh') }}
							</UButton>
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
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<InfoItem
								:label="t('admin.serverDetail.fields.serverId')"
								:value="server?.serverId ?? serverId"
							/>
							<InfoItem
								:label="t('admin.serverDetail.fields.lastUpdated')"
								:value="formatDate(overviewReadAt)"
							/>
						</div>
						<pre
							class="mt-5 max-h-[56vh] overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100 dark:border-slate-800"
						><code>{{ inspectorJson }}</code></pre>
					</div>
				</div>
			</template>
		</UModal>
	</div>
</template>

<script setup lang="ts">
import AdminServerConfigModal from '~/components/admin/AdminServerConfigModal.vue'
import AdminServerPlayersChart from '~/components/admin/AdminServerPlayersChart.client.vue'
import type {
	MinecraftServerOverviewResponse,
	MinecraftServerSummary,
	MinecraftServerSnapshotSummary,
	MysqlSourceSummary,
	PortalBridgeCommandSummary,
	PortalBridgeInspectResponse,
	PortalBridgeReceiptSummary,
} from '~/components/admin/types'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'admin-auth',
})

interface InfoItemProps {
	label: string
	value: string
}

interface DetailMetaItem {
	label: string
	value: string
}

interface SelectedDetail {
	type: string
	title: string
	meta: DetailMetaItem[]
	json: string
}

const InfoItem = defineComponent<InfoItemProps>({
	props: {
		label: {
			type: String,
			required: true,
		},
		value: {
			type: String,
			required: true,
		},
	},
	setup(props) {
		return () =>
			h('div', { class: 'rounded-md bg-slate-50 p-3 dark:bg-slate-900' }, [
				h(
					'p',
					{ class: 'text-xs text-slate-500 dark:text-slate-400' },
					props.label,
				),
				h(
					'p',
					{
						class:
							'mt-1 truncate text-sm font-medium text-slate-900 dark:text-slate-50',
					},
					props.value,
				),
			])
	},
})

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
const detailOpen = ref(false)
const inspectorOpen = ref(false)
const inspectorRefreshing = ref(false)
const inspectorTarget = ref<'snapshots' | 'bridge'>('snapshots')
const selectedDetail = ref<SelectedDetail | null>(null)
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
const serverPlayerRows = computed<
	Array<{
		uuid: string
		username: string
		firstSeenAt: string | null
	}>
>(() => [])
let refreshTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
	void refreshObservedOverview()
	refreshTimer = setInterval(() => {
		void refreshObservedOverview()
	}, 60_000)
})

onBeforeUnmount(() => {
	if (refreshTimer) {
		clearInterval(refreshTimer)
	}
})

watch(
	error,
	(value) => {
		if (value) {
			notifyError(value, {
				title: t('admin.serverDetail.loadFailed'),
			})
		}
	},
	{ immediate: true },
)

watch(
	data,
	(value) => {
		if (value) {
			overviewReadAt.value = new Date().toISOString()
		}
	},
	{ immediate: true },
)

const formatDate = (value: string | null | undefined): string => {
	if (!value) {
		return t('admin.serverDetail.states.empty')
	}

	return new Intl.DateTimeFormat(locale.value, {
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(value))
}

const formatJson = (value: unknown): string =>
	JSON.stringify(value ?? null, null, 2)

const sourceState = (source: MysqlSourceSummary | null): string => {
	if (!source) {
		return t('admin.serverDetail.states.notConfigured')
	}

	if (source.lastError) {
		return t('admin.serverDetail.states.error')
	}

	return source.enabled
		? t('admin.serverDetail.states.enabled')
		: t('admin.serverDetail.states.disabled')
}

const latestOnlineText = computed(() => {
	const latestPlayers =
		overview.value?.metrics.latestPlayerSnapshot?.players ?? []
	const latest = overview.value?.metrics.latestStatus

	if (latestPlayers.length > 0) {
		return String(latestPlayers.length)
	}

	if (!latest) {
		return t('admin.serverDetail.states.empty')
	}

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

const openSnapshotDetail = (snapshot: MinecraftServerSnapshotSummary): void => {
	selectedDetail.value = {
		type: t('admin.serverDetail.sections.recentSnapshots'),
		title: snapshot.kind,
		meta: [
			{
				label: t('admin.serverDetail.detail.snapshotId'),
				value: snapshot.id,
			},
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

const inspectorTitle = computed(() =>
	inspectorTarget.value === 'snapshots'
		? t('admin.serverDetail.inspector.snapshotsTitle')
		: t('admin.serverDetail.inspector.bridgeTitle'),
)

const inspectorJson = computed(() => {
	const payload =
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
				}

	return formatJson(payload)
})

const openInspector = (target: 'snapshots' | 'bridge'): void => {
	inspectorTarget.value = target
	inspectorOpen.value = true
}

const refreshOverview = async (): Promise<void> => {
	await refresh()
	overviewReadAt.value = new Date().toISOString()
}

const refreshObservedOverview = async (): Promise<void> => {
	if (!server.value?.portalBridge?.id) {
		await refreshOverview()
		return
	}

	try {
		const result = await $fetch<PortalBridgeInspectResponse>(
			`/api/minecraft/servers/${serverId.value}/portal-bridge/inspect`,
			{
				method: 'POST',
				body: {
					target: 'snapshots',
				},
			},
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

const testAndRefreshInspector = async (): Promise<void> => {
	inspectorRefreshing.value = true

	try {
		const result = await $fetch<PortalBridgeInspectResponse>(
			`/api/minecraft/servers/${serverId.value}/portal-bridge/inspect`,
			{
				method: 'POST',
				body: {
					target: inspectorTarget.value,
				},
			},
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
		notifyError(err, {
			title: t('admin.serverDetail.loadFailed'),
		})
	} finally {
		inspectorRefreshing.value = false
	}
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

const openCommandDetail = (command: PortalBridgeCommandSummary): void => {
	selectedDetail.value = {
		type: t('admin.serverDetail.sections.recentCommands'),
		title: command.action,
		meta: [
			{
				label: 'Command ID',
				value: command.commandId,
			},
			{
				label: t('admin.serverDetail.detail.status'),
				value: command.status,
			},
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

const handleSaved = async (
	savedServer: MinecraftServerSummary,
): Promise<void> => {
	if (savedServer.serverId !== serverId.value) {
		await navigateTo(localePath(`/admin/servers/${savedServer.serverId}`))
		return
	}

	await refreshOverview()
	notifySuccess({
		title: t('admin.notifications.serverSaved'),
	})
}
</script>
