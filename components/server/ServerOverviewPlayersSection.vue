<template>
	<ServerOverviewDirectoryShell
		:title="t('content.serverOverview.cards.players.title')"
		:action-label="t('content.serverOverview.cards.players.action')"
		:to="localePath('/server/players')"
		:count="totalCount ?? players.length"
	>
		<div v-if="players.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
			<ServerOverviewPlayerCard
				v-for="player in players"
				:key="player.mcid"
				:player="player"
			/>
		</div>

		<div
			v-else
			class="rounded-xl bg-white p-8 text-center text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400"
		>
			{{ t('content.serverOverview.states.emptyPlayers') }}
		</div>
	</ServerOverviewDirectoryShell>
</template>

<script setup lang="ts">
import type { ServerOverviewRecommendedPlayer } from '~/utils/server/overview'

interface Props {
	players: ServerOverviewRecommendedPlayer[]
	totalCount?: number
}

defineProps<Props>()

const { t } = useI18n()
const localePath = useLocalePath()
</script>
