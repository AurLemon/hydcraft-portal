<template>
	<div
		class="grid min-w-0 gap-1 text-sm md:grid-cols-[fit-content(60%)_minmax(0,1fr)] md:items-start"
	>
		<span
			class="min-w-0 max-w-full wrap-break-word hyphens-auto text-slate-500 dark:text-slate-400"
		>
			{{ label }}
		</span>
		<a
			v-if="href"
			:href="href"
			target="_blank"
			rel="noopener noreferrer"
			class="flex min-w-0 max-w-full items-start md:justify-end gap-2 transition-colors hover:text-slate-950 dark:hover:text-white"
		>
			<span
				class="min-w-0 max-w-full break-all md:text-right text-slate-800 dark:text-slate-100"
			>
				{{ value }}
			</span>
			<UIcon
				name="i-lucide-external-link"
				class="mt-0.5 size-3.5 shrink-0 text-slate-400"
			/>
		</a>
		<span
			v-else
			class="min-w-0 max-w-full break-all md:text-right text-slate-800 dark:text-slate-100"
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
