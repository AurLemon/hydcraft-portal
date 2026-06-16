<template>
	<div class="rounded-md bg-slate-50 p-3 dark:bg-slate-900">
		<p class="text-xs text-slate-500 dark:text-slate-400">
			{{ label }}
		</p>
		<p
			class="mt-1 truncate text-sm font-medium text-slate-900 dark:text-slate-50"
		>
			{{ value }}
		</p>
	</div>
</template>

<script setup lang="ts">
defineProps<{
	label: string
	value: string
}>()
</script>
