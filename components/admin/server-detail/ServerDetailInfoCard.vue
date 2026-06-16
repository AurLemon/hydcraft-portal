<template>
	<InfoCard :title="title">
		<template v-if="actions?.length" #actions>
			<UButton
				v-for="action in actions"
				:key="action.label"
				size="xs"
				variant="link"
				:icon="action.icon"
				@click="action.onClick"
			>
				{{ action.label }}
			</UButton>
		</template>
		<InfoGrid :items="items" />
		<p
			v-if="errorText"
			class="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-400/10 dark:text-rose-300"
		>
			{{ errorText }}
		</p>
	</InfoCard>
</template>

<script setup lang="ts">
import InfoCard from './InfoCard.vue'
import InfoGrid from './InfoGrid.vue'
import type { ServerDetailMetaItem } from './detail-types'

interface InfoCardAction {
	label: string
	icon: string
	onClick: () => void
}

defineProps<{
	title: string
	items: ServerDetailMetaItem[]
	errorText?: string | null
	actions?: InfoCardAction[]
}>()
</script>
