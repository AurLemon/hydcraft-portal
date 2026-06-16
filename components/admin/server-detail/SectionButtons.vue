<template>
	<div class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
		<UButton
			v-for="action in actions"
			:key="action.label"
			:icon="action.icon"
			:color="action.color"
			@click="action.onClick"
		>
			{{ action.label }}
		</UButton>
	</div>
</template>

<script setup lang="ts">
interface SectionAction {
	label: string
	icon: string
	color: 'primary' | 'neutral'
	onClick: () => void
}

defineProps<{ actions: SectionAction[] }>()
</script>
