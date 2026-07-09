<template>
	<button
		type="button"
		class="group grid h-full min-h-64 w-full cursor-pointer gap-4 rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm shadow-transparent transition duration-200 hover:bg-slate-50 hover:shadow-md hover:shadow-slate-200/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 dark:hover:shadow-black/10"
		@click="$emit('open')"
	>
		<div>
			<div class="flex items-start justify-between gap-4">
				<div class="min-w-0">
					<p
						class="text-xs font-semibold tracking-[0.16em] text-sky-600 uppercase dark:text-sky-300"
					>
						{{ server.shortCode }}
					</p>
					<h2
						class="mt-2 truncate text-xl font-semibold text-slate-950 dark:text-white"
					>
						{{ displayName }}
					</h2>
				</div>
				<UBadge
					:color="server.enabled ? 'success' : 'neutral'"
					variant="subtle"
					class="shrink-0"
				>
					{{
						server.enabled
							? t('admin.serverDetail.states.enabled')
							: t('admin.serverDetail.states.disabled')
					}}
				</UBadge>
			</div>

			<div class="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
				<div class="rounded-md bg-slate-50 p-3 dark:bg-slate-900/70">
					<p class="text-xs text-slate-500 dark:text-slate-400">MC 地址</p>
					<p
						class="mt-1 truncate font-medium text-slate-900 dark:text-slate-50"
					>
						{{
							server.dataSourceMode === 'IMPORTED'
								? ''
								: `${server.host}:${server.port}`
						}}
					</p>
				</div>
				<div class="rounded-md bg-slate-50 p-3 dark:bg-slate-900/70">
					<p class="text-xs text-slate-500 dark:text-slate-400">Bridge</p>
					<p
						class="mt-1 truncate font-medium text-slate-900 dark:text-slate-50"
					>
						{{
							server.dataSourceMode === 'IMPORTED'
								? ''
								: (server.portalBridge?.lastConnectionState ?? '未配置')
						}}
					</p>
				</div>
			</div>
		</div>
	</button>
</template>

<script setup lang="ts">
import type { MinecraftServerSummary } from './types'
import { resolveMinecraftServerLocalizedName } from '~/utils/minecraft/server-name'

interface AdminServerCardProps {
	server: MinecraftServerSummary
}

const { locale, t } = useI18n()

const props = defineProps<AdminServerCardProps>()
const displayName = computed(() =>
	resolveMinecraftServerLocalizedName(props.server, locale.value),
)

defineEmits<{
	open: []
}>()
</script>
