<template>
	<h2
		:id="id"
		class="mt-9 mb-3 text-2xl leading-snug font-semibold text-slate-950 dark:text-slate-50"
	>
		<a v-if="id" :href="`#${id}`">
			<slot />
		</a>
		<slot v-else />
	</h2>
</template>

<script setup lang="ts">
defineProps<{
	id?: string
}>()
</script>
