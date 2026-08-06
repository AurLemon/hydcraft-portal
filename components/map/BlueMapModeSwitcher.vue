<template>
	<div
		class="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-slate-950/75 p-1 text-xs text-white shadow-lg backdrop-blur"
		role="group"
		:aria-label="t('minecraftAccounts.map.viewMode')"
	>
		<button
			v-for="item in items"
			:key="item.value"
			type="button"
			:disabled="!capabilities[item.value] || item.value === modelValue"
			:aria-pressed="item.value === modelValue"
			:aria-label="item.label"
			:class="[
				'rounded-md px-2.5 py-1.5 transition-colors',
				item.value === modelValue
					? 'bg-white text-slate-950'
					: capabilities[item.value]
						? 'text-white/75 hover:bg-white/10 hover:text-white'
						: 'cursor-not-allowed text-white/30',
			]"
			@click="emit('update:modelValue', item.value)"
		>
			{{ item.label }}
		</button>
	</div>
</template>

<script setup lang="ts">
import type { BlueMapCapabilities, BlueMapViewMode } from '~/utils/map'

interface Props {
	modelValue: BlueMapViewMode
	capabilities: BlueMapCapabilities
}

defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: BlueMapViewMode] }>()
const { t } = useI18n()

const items = computed<Array<{ value: BlueMapViewMode; label: string }>>(() => [
	{ value: 'flat', label: t('minecraftAccounts.map.flat') },
	{ value: 'perspective', label: t('minecraftAccounts.map.perspective') },
	{ value: 'freeFlight', label: t('minecraftAccounts.map.freeFlight') },
])
</script>
