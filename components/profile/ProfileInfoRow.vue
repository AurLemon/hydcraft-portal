<template>
	<div
		class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4 text-sm"
	>
		<span class="text-slate-500 dark:text-slate-400">{{ label }}</span>
		<a
			v-if="href"
			:href="href"
			target="_blank"
			rel="noopener noreferrer"
			class="flex min-w-0 items-center justify-end gap-2 transition-colors hover:text-slate-950 dark:hover:text-white"
		>
			<span
				class="min-w-0 truncate text-right text-slate-800 dark:text-slate-100"
			>
				{{ value }}
			</span>
			<UIcon
				name="i-lucide-external-link"
				class="size-3.5 shrink-0 text-slate-400"
			/>
		</a>
		<span
			v-else
			class="min-w-0 truncate text-right text-slate-800 dark:text-slate-100"
		>
			{{ value }}
		</span>
	</div>
</template>

<script setup lang="ts">
interface ProfileInfoRowProps {
	label: string
	value: string
	href?: string
}

defineProps<ProfileInfoRowProps>()
</script>
