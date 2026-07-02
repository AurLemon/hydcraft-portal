<template>
	<a
		href="https://aurlemon.top"
		target="_blank"
		rel="noopener noreferrer"
		class="my-8 block rounded-2xl border border-slate-200 bg-white px-5 py-5 text-center transition-colors duration-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900/80"
	>
		<div class="flex flex-col items-center gap-3">
			<BrandingAurLemon />
			<div
				class="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-slate-600 dark:text-slate-300"
			>
				<span>{{ t('content.intro.staff.owner.roleLine') }}</span>
				<span class="text-slate-300 dark:text-slate-600">/</span>
				<span class="inline-flex items-center gap-2">
					<img
						:src="ownerHeadUrl"
						alt="Aurora_Lemon Minecraft avatar"
						class="timeline-owner-head"
					/>
					<span class="font-medium text-slate-900 dark:text-slate-100">
						{{ t('content.intro.staff.owner.aliasLine') }}
					</span>
					<span class="text-slate-700 dark:text-slate-300"> Aurora_Lemon </span>
					<span class="text-slate-300 dark:text-slate-600">/</span>
					<span>{{ t('content.intro.staff.owner.appointedLine') }}</span>
				</span>
			</div>
		</div>
	</a>
</template>

<script setup lang="ts">
import BrandingAurLemon from '~/components/branding/AurLemon.vue'
import { getMinecraftHeadRendererUrl } from '~/utils/minecraft/body-renderer'

const { t } = useI18n()
const ownerHeadUrl = getMinecraftHeadRendererUrl('Aurora_Lemon')
</script>

<style scoped>
.timeline-owner-head {
	display: block;
	width: 0.875rem !important;
	height: 0.875rem !important;
	max-width: none;
	flex: none;
	border-radius: 4px;
	object-fit: cover;
}
</style>
