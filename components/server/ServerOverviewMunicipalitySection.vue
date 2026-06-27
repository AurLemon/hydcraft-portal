<template>
	<ServerOverviewDirectoryShell
		:title="t('content.serverOverview.cards.municipality.title')"
	>
		<ServerOverviewPreviewCard
			:image-src="municipalityPreviewImage"
			:image-alt="t('content.serverOverview.cards.municipality.imageAlt')"
			:headline="t('content.serverOverview.cards.municipality.headline')"
			:description="t('content.serverOverview.cards.municipality.description')"
		/>
	</ServerOverviewDirectoryShell>
</template>

<script setup lang="ts">
import municipalityPreviewImage from '~/assets/resources/minecraft-gallery/season_7/guangyang_screenshots_1.webp'

const { t } = useI18n()
</script>
