<template>
	<ServerOverviewMapShell
		:title="t('content.serverOverview.cards.satellite.title')"
		:open-label="t('content.serverOverview.actions.openMap')"
		open-to="https://map.oxygen.hydcraft.cn"
		body-class="h-42"
		title-class="text-white [text-shadow:0_1px_2px_rgba(15,23,42,0.72)]"
		open-label-class="text-white [text-shadow:0_1px_2px_rgba(15,23,42,0.72)]"
	>
		<div class="relative h-full w-full overflow-hidden bg-slate-900">
			<BlueMapViewport
				:assets-base-url="assetsBaseUrl ?? ''"
				:initial-distance="1500"
				mode="perspective"
				compact
			/>

			<div
				class="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-linear-to-b from-white/42 via-white/16 to-transparent backdrop-blur-[20px] dark:from-slate-950/72 dark:via-slate-950/34 dark:to-transparent mask-[linear-gradient(to_bottom,black_0%,rgba(0,0,0,0.94)_22%,rgba(0,0,0,0.68)_46%,rgba(0,0,0,0.28)_72%,transparent_100%)] sm:h-32"
			/>
		</div>
	</ServerOverviewMapShell>
</template>

<script setup lang="ts">
interface Props {
	assetsBaseUrl?: string | null
}

const props = withDefaults(defineProps<Props>(), {
	assetsBaseUrl: null,
})
const { t } = useI18n()
const assetsBaseUrl = computed(() => props.assetsBaseUrl?.trim() || null)
</script>
