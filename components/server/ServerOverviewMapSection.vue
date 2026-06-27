<template>
	<ServerOverviewDirectoryShell
		:title="t('content.serverOverview.cards.map.title')"
	>
		<ServerOverviewPreviewCard
			:image-src="mapPreviewImage"
			:image-alt="t('content.serverOverview.cards.map.imageAlt')"
			:headline="t('content.serverOverview.cards.map.headline')"
			:description="t('content.serverOverview.cards.map.description')"
		/>
	</ServerOverviewDirectoryShell>
</template>

<script setup lang="ts">
import mapPreviewImage from '~/assets/resources/placeholder/map_placeholder.webp'

const { t } = useI18n()
</script>
