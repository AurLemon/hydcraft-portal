<template>
	<MinecraftSessionHistoryModal
		:open="open"
		:title="modalTitle"
		:recent-sessions-label="
			t('content.serverOverview.cards.bridge.playerDialog.recentSessions')
		"
		:not-available-label="t('content.serverOverview.states.notAvailable')"
		:fetch-sessions="fetchSessions"
		@update:open="emit('update:open', $event)"
	/>
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

const { t } = useI18n()

const modalTitle = computed(
	() => props.player?.username ?? props.player?.uuid ?? '-',
)

const fetchSessions = async (): Promise<{
	sessions: ServerOverviewPlayerPresenceResponse['recentSessions']
}> => {
	if (!props.serverId || !props.player?.uuid) {
		return {
			sessions: [],
		}
	}

	const presence = await $fetch<ServerOverviewPlayerPresenceResponse>(
		`/api/public/server/players/${props.player.uuid}/presence`,
		{
			query: {
				serverId: props.serverId,
			},
		},
	)

	return {
		sessions: presence.recentSessions,
	}
}
</script>
