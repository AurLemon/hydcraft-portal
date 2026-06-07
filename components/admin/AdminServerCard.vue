<template>
	<button
		type="button"
		class="group flex h-full min-h-64 w-full flex-col justify-between rounded-lg border border-slate-200/80 bg-white/82 p-5 text-left shadow-sm transition duration-200 hover:border-sky-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400 dark:border-slate-800/80 dark:bg-slate-950/74 dark:hover:border-sky-500/70"
		@click="$emit('configure')"
	>
		<div>
			<div class="flex items-start justify-between gap-4">
				<div class="min-w-0">
					<p
						class="text-xs font-semibold tracking-[0.16em] text-sky-600 uppercase dark:text-sky-300"
					>
						{{ server.code }}
					</p>
					<h2
						class="mt-2 truncate text-xl font-semibold text-slate-950 dark:text-white"
					>
						{{ server.name }}
					</h2>
				</div>
				<span
					class="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium"
					:class="
						server.enabled
							? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'
							: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
					"
				>
					{{ server.enabled ? 'Enabled' : 'Disabled' }}
				</span>
			</div>

			<p
				class="mt-4 line-clamp-2 min-h-12 text-sm leading-6 text-slate-600 dark:text-slate-300"
			>
				{{ server.description || '未填写服务器描述' }}
			</p>

			<div class="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
				<div class="rounded-md bg-slate-50 p-3 dark:bg-slate-900/70">
					<p class="text-xs text-slate-500 dark:text-slate-400">MC 地址</p>
					<p
						class="mt-1 truncate font-medium text-slate-900 dark:text-slate-50"
					>
						{{ server.host }}:{{ server.port }}
					</p>
				</div>
				<div class="rounded-md bg-slate-50 p-3 dark:bg-slate-900/70">
					<p class="text-xs text-slate-500 dark:text-slate-400">Bridge</p>
					<p
						class="mt-1 truncate font-medium text-slate-900 dark:text-slate-50"
					>
						{{ server.portalBridge?.lastConnectionState ?? '未配置' }}
					</p>
				</div>
			</div>
		</div>
	</button>
</template>

<script setup lang="ts">
import type { MinecraftServerSummary } from './types'

interface AdminServerCardProps {
	server: MinecraftServerSummary
}

defineProps<AdminServerCardProps>()

defineEmits<{
	configure: []
}>()
</script>
