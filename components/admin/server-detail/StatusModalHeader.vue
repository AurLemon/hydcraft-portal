<template>
	<div
		class="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800"
	>
		<div class="min-w-0">
			<p class="text-xs font-medium text-slate-500 dark:text-slate-400">
				{{ t('admin.serverDetail.status.eyebrow') }}
			</p>
			<h2
				class="mt-1 truncate text-xl font-semibold text-slate-950 dark:text-white"
			>
				{{ title }}
			</h2>
		</div>
		<div class="flex shrink-0 items-center gap-2">
			<UButton
				size="sm"
				icon="i-lucide-refresh-cw"
				:loading="loading"
				@click="$emit('refresh')"
			>
				{{ t('admin.serverDetail.actions.testRefresh') }}
			</UButton>
			<UButton
				icon="i-lucide-x"
				color="neutral"
				variant="ghost"
				:aria-label="t('admin.serverDetail.actions.close')"
				@click="$emit('close')"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
defineProps<{
	title: string
	loading: boolean
}>()
defineEmits<{
	refresh: []
	close: []
}>()

const { t } = useI18n()
</script>
