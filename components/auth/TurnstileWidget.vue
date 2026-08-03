<template>
	<div class="relative h-[65px] w-full">
		<USkeleton aria-hidden="true" class="absolute inset-0 h-[65px] w-full" />
		<NuxtTurnstile
			ref="widget"
			v-model="token"
			class="relative z-10 h-[65px] w-full"
			:options="options"
		/>
	</div>
</template>

<script setup lang="ts">
import type { TurnstileAction } from '~/utils/security/turnstile-actions'

interface TurnstileWidgetProps {
	modelValue?: string
	action: TurnstileAction
}

interface TurnstileWidgetExposed {
	reset: () => void
}

interface TurnstileWidgetRef {
	reset: () => void
}

const props = withDefaults(defineProps<TurnstileWidgetProps>(), {
	modelValue: '',
})
const emit = defineEmits<{
	'update:modelValue': [value: string]
}>()
const widget = ref<TurnstileWidgetRef | null>(null)
const token = computed({
	get: () => props.modelValue,
	set: (value: string) => emit('update:modelValue', value),
})
const invalidateToken = (): void => {
	emit('update:modelValue', '')
}
const options = computed<Omit<Partial<Turnstile.RenderParameters>, 'callback'>>(
	() => ({
		action: props.action,
		theme: 'auto',
		size: 'flexible',
		retry: 'auto',
		'refresh-expired': 'auto',
		'refresh-timeout': 'auto',
		'error-callback': invalidateToken,
		'expired-callback': invalidateToken,
		'timeout-callback': invalidateToken,
	}),
)

const reset = (): void => {
	invalidateToken()
	widget.value?.reset()
}

defineExpose<TurnstileWidgetExposed>({
	reset,
})
</script>
