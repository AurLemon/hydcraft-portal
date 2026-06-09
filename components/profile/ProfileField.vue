<template>
	<label
		:class="[
			fieldClass ?? 'grid gap-2 md:grid-cols-[180px_1fr] md:items-start',
		]"
	>
		<span
			:class="[
				'pt-1.5 text-[15px] text-slate-700 dark:text-slate-200',
				labelClass,
			]"
		>
			{{ label }}
			<span v-if="required" class="text-primary">*</span>
		</span>
		<span :class="controlWrapperClass ?? 'min-w-0 w-full'">
			<slot />
		</span>
	</label>
</template>

<script setup lang="ts">
interface ProfileFieldProps {
	label: string
	required?: boolean
	fieldClass?: string
	labelClass?: string
	controlWrapperClass?: string
}

defineProps<ProfileFieldProps>()
</script>
