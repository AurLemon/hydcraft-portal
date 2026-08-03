<template>
	<div
		ref="container"
		class="relative w-full"
		:class="isCompact ? 'h-[140px]' : 'h-[65px]'"
	>
		<USkeleton
			v-if="!widgetReady"
			aria-hidden="true"
			class="absolute"
			:class="
				isCompact
					? 'left-1/2 h-[140px] w-[150px] -translate-x-1/2'
					: 'inset-0 h-[65px] w-full'
			"
		/>
		<NuxtTurnstile
			:key="widgetKey"
			ref="widget"
			v-model="token"
			class="relative z-10 block"
			:class="isCompact ? 'mx-auto h-[140px] w-[150px]' : 'h-[65px] w-full'"
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
const container = ref<HTMLDivElement | null>(null)
const widget = ref<TurnstileWidgetRef | null>(null)
const widgetKey = ref(0)
const widgetReady = ref(false)
const isCompact = ref(false)
const token = computed({
	get: () => props.modelValue,
	set: (value: string) => emit('update:modelValue', value),
})

let frameObserver: MutationObserver | undefined
let resizeObserver: ResizeObserver | undefined
let wasHidden = false

const invalidateToken = (): void => {
	emit('update:modelValue', '')
}

const hasFrame = (): boolean =>
	Boolean(container.value?.querySelector('iframe'))

const syncWidgetReady = (): void => {
	widgetReady.value = hasFrame()
}

const remountWidget = (): void => {
	widgetReady.value = false
	widgetKey.value += 1
}

const updateWidgetSize = (width: number): void => {
	const compact = width < 300
	if (isCompact.value === compact) {
		return
	}

	isCompact.value = compact
	remountWidget()
}

const recoverWidget = (): void => {
	if (!hasFrame()) {
		invalidateToken()
		remountWidget()
	}
}

const handleVisibilityChange = (): void => {
	if (document.visibilityState === 'hidden') {
		wasHidden = true
		return
	}

	if (wasHidden) {
		wasHidden = false
		recoverWidget()
	}
}

const handlePageShow = (event: PageTransitionEvent): void => {
	if (event.persisted) {
		recoverWidget()
	}
}

const options = computed<Omit<Partial<Turnstile.RenderParameters>, 'callback'>>(
	() => ({
		action: props.action,
		theme: 'auto',
		size: isCompact.value ? 'compact' : 'flexible',
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

onMounted(() => {
	if (!container.value) {
		return
	}

	frameObserver = new MutationObserver(syncWidgetReady)
	frameObserver.observe(container.value, {
		childList: true,
		subtree: true,
	})

	resizeObserver = new ResizeObserver((entries) => {
		const entry = entries[0]
		if (entry) {
			updateWidgetSize(entry.contentRect.width)
		}
	})
	resizeObserver.observe(container.value)

	syncWidgetReady()
	document.addEventListener('visibilitychange', handleVisibilityChange)
	window.addEventListener('pageshow', handlePageShow)
})

onBeforeUnmount(() => {
	frameObserver?.disconnect()
	resizeObserver?.disconnect()
	document.removeEventListener('visibilitychange', handleVisibilityChange)
	window.removeEventListener('pageshow', handlePageShow)
})

defineExpose<TurnstileWidgetExposed>({
	reset,
})
</script>
