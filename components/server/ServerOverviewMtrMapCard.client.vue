<template>
	<ServerOverviewMapShell
		:title="t('content.serverOverview.cards.mtr.title')"
		:open-label="t('content.serverOverview.actions.openMap')"
		open-to="https://rail.nitrogen.hydcraft.cn"
		body-class="h-42"
	>
		<div class="relative h-full w-full overflow-hidden bg-slate-900">
			<iframe
				src="https://rail.nitrogen.hydcraft.cn"
				class="h-full w-full border-0 transition-opacity duration-300"
				:class="
					iframeState === 'loaded'
						? 'opacity-100'
						: iframeState === 'error'
							? 'pointer-events-none opacity-0'
							: 'opacity-0'
				"
				referrerpolicy="no-referrer"
				@load="handleLoad"
				@error="handleError"
			/>

			<div
				v-if="iframeState === 'loaded'"
				class="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-linear-to-b from-white/42 via-white/16 to-transparent backdrop-blur-[20px] dark:from-slate-950/72 dark:via-slate-950/34 dark:to-transparent mask-[linear-gradient(to_bottom,black_0%,rgba(0,0,0,0.94)_22%,rgba(0,0,0,0.68)_46%,rgba(0,0,0,0.28)_72%,transparent_100%)] sm:h-32"
			/>

			<USkeleton
				v-if="iframeState === 'loading'"
				class="absolute inset-0 h-full w-full rounded-none"
			/>

			<div
				v-if="iframeState === 'error'"
				class="absolute inset-0 flex items-center justify-center bg-white p-8 text-center text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400"
			>
				{{ t('content.serverOverview.states.iframeLoadFailed') }}
			</div>
		</div>
	</ServerOverviewMapShell>
</template>

<script setup lang="ts">
type IframeState = 'loading' | 'loaded' | 'error'

const { t } = useI18n()
const iframeState = ref<IframeState>('loading')

const handleLoad = () => {
	iframeState.value = 'loaded'
}

const handleError = () => {
	iframeState.value = 'error'
}
</script>
