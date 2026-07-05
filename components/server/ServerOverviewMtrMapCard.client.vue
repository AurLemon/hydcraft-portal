<template>
	<ServerOverviewMapShell
		:title="t('content.serverOverview.cards.mtr.title')"
		:open-label="t('content.serverOverview.actions.openMap')"
		open-to="https://rail.nitrogen.hydcraft.cn"
		body-class="h-42"
	>
		<div class="relative h-full w-full overflow-hidden bg-slate-900">
			<SkeletonImage
				:src="mapPlaceholderSrc"
				:alt="t('content.serverOverview.cards.mtr.title')"
				class="h-full w-full"
				image-class="block h-full w-full object-cover"
				skeleton-class="rounded-none"
			/>
			<div
				class="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-linear-to-b from-white/42 via-white/16 to-transparent backdrop-blur-[20px] dark:from-slate-950/72 dark:via-slate-950/34 dark:to-transparent mask-[linear-gradient(to_bottom,black_0%,rgba(0,0,0,0.94)_22%,rgba(0,0,0,0.68)_46%,rgba(0,0,0,0.28)_72%,transparent_100%)] sm:h-32"
			/>
		</div>
	</ServerOverviewMapShell>
</template>

<script setup lang="ts">
import mapPlaceholder from '~/assets/resources/placeholder/mtr_rail_map.webp'
import { getStableAssetUrl } from '~/utils/assets/stable-asset-url'

const { t } = useI18n()
const mapPlaceholderSrc = getStableAssetUrl(mapPlaceholder)
</script>
