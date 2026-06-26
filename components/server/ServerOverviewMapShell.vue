<template>
	<div
		class="relative overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
	>
		<div
			class="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-start justify-between gap-3 p-4"
		>
			<h3
				class="font-arkpixel text-lg leading-none tracking-wide"
				:class="resolvedTitleClass"
			>
				{{ title }}
			</h3>

			<UButton
				class="pointer-events-auto"
				:class="resolvedOpenLabelClass"
				color="neutral"
				variant="link"
				icon="i-lucide-arrow-up-right"
				:to="openTo"
				target="_blank"
				rel="noreferrer"
			>
				{{ openLabel }}
			</UButton>
		</div>

		<div class="relative overflow-hidden bg-slate-900" :class="bodyClass">
			<slot />
		</div>
	</div>
</template>

<script setup lang="ts">
interface Props {
	title: string
	openLabel: string
	openTo: string
	bodyClass?: string
	titleClass?: string
	openLabelClass?: string
}

const props = withDefaults(defineProps<Props>(), {
	bodyClass: 'h-54',
	titleClass: '',
	openLabelClass: '',
})

const defaultOverlayTextClass =
	'text-slate-900 dark:text-white [text-shadow:0_1px_2px_rgba(255,255,255,0.32)] dark:[text-shadow:0_1px_2px_rgba(15,23,42,0.72)]'

const resolvedTitleClass = computed(
	() => props.titleClass.trim() || defaultOverlayTextClass,
)

const resolvedOpenLabelClass = computed(
	() => props.openLabelClass.trim() || defaultOverlayTextClass,
)
</script>
