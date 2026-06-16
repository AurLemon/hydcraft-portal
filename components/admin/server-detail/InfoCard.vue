<template>
	<div
		class="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
	>
		<div
			v-if="title || $slots.actions"
			class="flex items-center justify-between gap-3"
		>
			<h2
				v-if="title"
				class="text-base font-semibold text-slate-950 dark:text-white"
			>
				{{ title }}
			</h2>
			<div v-if="$slots.actions" class="flex shrink-0 items-center gap-2">
				<slot name="actions" />
			</div>
		</div>
		<slot />
	</div>
</template>

<script setup lang="ts">
defineProps<{ title?: string }>()
</script>
