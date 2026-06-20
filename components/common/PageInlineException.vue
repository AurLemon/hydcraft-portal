<template>
	<section class="w-full">
		<div
			class="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center"
		>
			<UIcon :name="icon" class="size-16 text-slate-400 dark:text-slate-500" />
			<p class="mt-6 text-lg font-medium text-slate-700 dark:text-slate-200">
				{{ title }}
			</p>
			<div v-if="$slots.default" class="mt-4 flex flex-col items-center gap-5">
				<slot />
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
defineProps<{
	icon: string
	title: string
}>()
</script>
