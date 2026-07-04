<template>
	<UModal
		:open="open"
		:ui="{ content: 'max-w-2xl', body: 'p-0' }"
		@update:open="emit('update:open', $event)"
	>
		<template #content>
			<div class="grid max-h-[85dvh] min-h-0 gap-5 overflow-y-auto p-5 sm:p-6">
				<h2 class="text-xl font-semibold text-slate-950 dark:text-white">
					{{ modalTitle }}
				</h2>

				<template v-if="loading">
					<div class="space-y-3">
						<div
							v-for="item in 5"
							:key="item"
							class="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
						/>
					</div>
				</template>

				<template v-else-if="loadError">
					<div
						class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
					>
						{{
							t('content.serverOverview.cards.bridge.playerDialog.loadFailed')
						}}
					</div>
				</template>

				<template v-else-if="presence">
					<div
						v-if="presence.recentSessions.length === 0"
						class="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
					>
						{{
							t(
								'content.serverOverview.cards.bridge.playerDialog.emptySessions',
							)
						}}
					</div>

					<div v-else class="space-y-3">
						<div
							v-for="(session, index) in presence.recentSessions"
							:key="`${session.openedAt}:${session.closedAt ?? 'open'}`"
							class="rounded-xl border bg-white px-4 py-3 dark:bg-slate-950"
							:class="
								session.closedAt
									? 'border-slate-200 dark:border-slate-800'
									: 'border-emerald-200/80 bg-linear-to-br from-emerald-50/75 via-white to-white dark:border-emerald-900/70 dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-950'
							"
						>
							<div class="mb-2 flex items-center justify-between gap-3">
								<div class="text-sm font-medium text-slate-950 dark:text-white">
									{{
										t(
											'content.serverOverview.cards.bridge.playerDialog.sessionLabel',
											{ index: index + 1 },
										)
									}}
								</div>
								<div class="text-xs text-slate-500 dark:text-slate-400">
									{{
										session.closedAt
											? formatSessionDuration(session)
											: t(
													'content.serverOverview.cards.bridge.playerDialog.stillOnline',
												)
									}}
								</div>
							</div>

							<div class="grid gap-2 text-sm sm:grid-cols-2">
								<div>
									<div class="text-xs text-slate-500 dark:text-slate-400">
										{{
											t(
												'content.serverOverview.cards.bridge.playerDialog.sessionOpenedAt',
											)
										}}
									</div>
									<div class="mt-1 text-slate-700 dark:text-slate-200">
										{{ formatDate(session.openedAt) }}
									</div>
								</div>

								<div>
									<div class="text-xs text-slate-500 dark:text-slate-400">
										{{
											t(
												'content.serverOverview.cards.bridge.playerDialog.sessionClosedAt',
											)
										}}
									</div>
									<div class="mt-1 text-slate-700 dark:text-slate-200">
										{{
											session.closedAt
												? formatDate(session.closedAt)
												: t(
														'content.serverOverview.cards.bridge.playerDialog.stillOnline',
													)
										}}
									</div>
								</div>
							</div>
						</div>
					</div>
				</template>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import type {
	ServerOverviewObservedPlayer,
	ServerOverviewPlayerPresenceResponse,
} from '~/utils/server/overview'

interface Props {
	open: boolean
	serverId: string | null
	player: ServerOverviewObservedPlayer | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
	'update:open': [value: boolean]
}>()

const { t, locale } = useI18n()

const loading = ref(false)
const loadError = ref(false)
const presence = ref<ServerOverviewPlayerPresenceResponse | null>(null)

const modalTitle = computed(
	() => props.player?.username ?? props.player?.uuid ?? '-',
)

const fetchPresence = async (): Promise<void> => {
	if (!props.open || !props.serverId || !props.player?.uuid) {
		return
	}

	loading.value = true
	loadError.value = false

	try {
		presence.value = await $fetch<ServerOverviewPlayerPresenceResponse>(
			`/api/public/server/players/${props.player.uuid}/presence`,
			{
				query: {
					serverId: props.serverId,
				},
			},
		)
	} catch {
		presence.value = null
		loadError.value = true
	} finally {
		loading.value = false
	}
}

watch(
	() => [props.open, props.serverId, props.player?.uuid] as const,
	() => {
		if (!props.open) {
			return
		}

		void fetchPresence()
	},
	{ immediate: true },
)

const formatDate = (value: string | null): string => {
	if (!value) {
		return t('content.serverOverview.states.notAvailable')
	}

	return new Intl.DateTimeFormat(locale.value, {
		dateStyle: 'short',
		timeStyle: 'short',
	}).format(new Date(value))
}

const formatSessionDuration = (
	session: ServerOverviewPlayerPresenceResponse['recentSessions'][number],
): string => {
	const openedAt = new Date(session.openedAt).getTime()
	const closedAt = session.closedAt
		? new Date(session.closedAt).getTime()
		: Date.now()

	if (
		Number.isNaN(openedAt) ||
		Number.isNaN(closedAt) ||
		closedAt <= openedAt
	) {
		return t(
			'content.serverOverview.cards.bridge.playerDialog.duration.lessThanMinute',
		)
	}

	const totalSeconds = Math.round((closedAt - openedAt) / 1000)

	if (totalSeconds < 60) {
		return t(
			'content.serverOverview.cards.bridge.playerDialog.duration.lessThanMinute',
		)
	}

	const daySeconds = 24 * 60 * 60
	const hourSeconds = 60 * 60
	const minuteSeconds = 60
	const days = Math.floor(totalSeconds / daySeconds)
	const hours = Math.floor((totalSeconds % daySeconds) / hourSeconds)
	const minutes = Math.floor((totalSeconds % hourSeconds) / minuteSeconds)
	const parts: string[] = []

	if (days > 0) {
		parts.push(
			t('content.serverOverview.cards.bridge.playerDialog.duration.days', {
				count: days,
			}),
		)
	}

	if (hours > 0) {
		parts.push(
			t('content.serverOverview.cards.bridge.playerDialog.duration.hours', {
				count: hours,
			}),
		)
	}

	if (minutes > 0) {
		parts.push(
			t('content.serverOverview.cards.bridge.playerDialog.duration.minutes', {
				count: minutes,
			}),
		)
	}

	return parts.join(' ')
}
</script>
