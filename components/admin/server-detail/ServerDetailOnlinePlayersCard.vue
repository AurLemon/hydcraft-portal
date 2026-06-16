<template>
	<InfoCard :title="title">
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
					:class="serverEnabled ? 'bg-emerald-500' : 'bg-slate-400'"
				/>
				{{ stateText }}
			</div>
		</div>
		<AdminServerPlayersChart
			class="mt-4"
			:points="points"
			:label="chartLabel"
			:empty-text="emptyText"
			:locale="locale"
		/>
	</InfoCard>
</template>

<script setup lang="ts">
import InfoCard from './InfoCard.vue'
import type { MinecraftServerPlayerHistoryPoint } from '~/components/admin/types'

interface Props {
	title: string
	latestOnlineText: string
	latestStatusAt: string
	serverEnabled: boolean
	stateText: string
	points: MinecraftServerPlayerHistoryPoint[]
	chartLabel: string
	emptyText: string
	locale: string
}

defineProps<Props>()
</script>
