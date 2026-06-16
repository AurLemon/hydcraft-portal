<template>
	<InfoCard :title="title">
		<InfoGrid :items="items" />
	</InfoCard>
</template>

<script setup lang="ts">
import InfoCard from './InfoCard.vue'
import InfoGrid from './InfoGrid.vue'
import type { ServerDetailMetaItem } from './detail-types'

defineProps<{
	title: string
	items: ServerDetailMetaItem[]
}>()
</script>
