<template>
	<ServerOverviewDirectoryShell
		:title="t('content.serverOverview.cards.railwayData.title')"
	>
		<ServerOverviewPreviewCard
			:image-src="railwayPreviewImage"
			:image-alt="t('content.serverOverview.cards.railwayData.imageAlt')"
			:headline="t('content.serverOverview.cards.railwayData.headline')"
			:description="t('content.serverOverview.cards.railwayData.description')"
		/>
	</ServerOverviewDirectoryShell>
</template>

<script setup lang="ts">
import railwayPreviewImage from '~/assets/resources/minecraft-gallery/season_7/guangyang_screenshots_4.webp'

const { t } = useI18n()
</script>
