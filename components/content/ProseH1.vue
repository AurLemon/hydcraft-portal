<template>
	<h1
		:id="id"
		class="mb-5 text-4xl leading-tight font-semibold tracking-tight text-slate-950 dark:text-slate-50"
	>
		<a v-if="id" :href="`#${id}`">
			<slot />
		</a>
		<slot v-else />
	</h1>
</template>

<script setup lang="ts">
defineProps<{
	id?: string
}>()
</script>
