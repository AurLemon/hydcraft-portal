<template>
	<div :class="gridClass">
		<div
			v-for="item in items"
			:key="item.label"
			class="rounded-md bg-slate-50 p-3 dark:bg-slate-900"
		>
			<p class="text-xs text-slate-500 dark:text-slate-400">
				{{ item.label }}
			</p>
			<p
				class="mt-1 truncate text-sm font-medium text-slate-900 dark:text-slate-50"
			>
				{{ item.value }}
			</p>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { ServerDetailMetaItem } from './detail-types'

interface Props {
	items: ServerDetailMetaItem[]
	columns?: 'one' | 'two' | 'three'
}

const props = withDefaults(defineProps<Props>(), {
	columns: 'two',
})

const gridClass = computed(() => {
	if (props.columns === 'three') {
		return 'mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'
	}

	if (props.columns === 'one') {
		return 'mt-4 grid grid-cols-1 gap-3'
	}

	return 'mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2'
})
</script>
