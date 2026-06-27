<template>
	<ServerOverviewDirectoryShell
		:title="t('content.serverOverview.cards.company.title')"
	>
		<ServerOverviewPreviewCard
			:image-src="companyPreviewImage"
			:image-alt="t('content.serverOverview.cards.company.imageAlt')"
			:headline="t('content.serverOverview.cards.company.headline')"
			:description="t('content.serverOverview.cards.company.description')"
		/>
	</ServerOverviewDirectoryShell>
</template>

<script setup lang="ts">
import companyPreviewImage from '~/assets/resources/placeholder/company_placeholder.webp'

const { t } = useI18n()
</script>
