<template>
	<div class="flex items-center justify-between gap-4 text-sm">
		<span class="text-slate-500 dark:text-slate-400">{{ label }}</span>
		<span class="min-w-0 truncate text-slate-800 dark:text-slate-100">
			{{ value }}
		</span>
	</div>
</template>

<script setup lang="ts">
interface ProfileInfoRowProps {
	label: string
	value: string
}

defineProps<ProfileInfoRowProps>()
</script>
