<template>
	<InfoCard :title="title">
		<div class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
			<div
				v-for="task in tasks"
				:key="task.source"
				class="rounded-md bg-slate-50 p-3 dark:bg-slate-900"
			>
				<div class="flex items-center justify-between gap-2">
					<p
						class="truncate text-sm font-medium text-slate-900 dark:text-slate-50"
					>
						{{ task.label }}
					</p>
					<UIcon :name="task.icon" :class="task.iconClass" />
				</div>
				<p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
					{{ task.statusText }}
				</p>
				<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
					{{ task.lastText }}
				</p>
			</div>
		</div>
	</InfoCard>
</template>

<script setup lang="ts">
import InfoCard from './InfoCard.vue'
import type { ServerDetailSyncTaskRow } from './detail-types'

defineProps<{
	title: string
	tasks: ServerDetailSyncTaskRow[]
}>()
</script>
