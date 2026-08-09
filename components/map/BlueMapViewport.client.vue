<template>
	<div class="relative h-full w-full overflow-hidden bg-slate-950">
		<div ref="containerRef" class="h-full w-full" />

		<div
			v-if="showModeSwitcher && hasCapabilities"
			class="absolute inset-x-0 top-3 z-10 flex justify-center px-4"
		>
			<BlueMapModeSwitcher
				:model-value="currentMode"
				:capabilities="capabilities"
				@update:model-value="handleModeChange"
			/>
		</div>

		<div
			v-if="status === 'loading'"
			class="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70"
		>
			<USkeleton class="h-full w-full rounded-none" />
		</div>

		<div
			v-else-if="status === 'unavailable' || status === 'error'"
			class="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/85 p-6 text-center"
		>
			<div class="max-w-sm space-y-2 text-sm text-white/80">
				<p class="font-medium text-white">{{ statusTitle }}</p>
				<p class="text-white/60">{{ errorMessage }}</p>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
	createBlueMapController,
	type BlueMapCapabilities,
	type BlueMapErrorEventPayload,
	type BlueMapFocus,
	type BlueMapPlayerMarker,
	type BlueMapViewChangedEventPayload,
	type BlueMapViewMode,
} from '~/utils/map'

interface Props {
	assetsBaseUrl?: string | null
	mode?: BlueMapViewMode
	appendCacheBust?: boolean
	initialDistance?: number | null
	focus?: BlueMapFocus | null
	player?: BlueMapPlayerMarker | null
	followKey?: string | null
	compact?: boolean
	showModeSwitcher?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	assetsBaseUrl: null,
	mode: 'perspective',
	appendCacheBust: false,
	initialDistance: null,
	focus: null,
	player: null,
	followKey: null,
	compact: false,
	showModeSwitcher: false,
})

const { t } = useI18n()

const emit = defineEmits<{
	ready: [{ capabilities: BlueMapCapabilities }]
	modeChange: [mode: BlueMapViewMode]
	focusChange: [focus: BlueMapFocus]
	viewChange: [view: BlueMapViewChangedEventPayload]
	error: [payload: BlueMapErrorEventPayload]
}>()

const containerRef = ref<HTMLElement | null>(null)
const currentMode = ref<BlueMapViewMode>(props.mode)
const capabilities = ref<BlueMapCapabilities>({
	flat: false,
	perspective: false,
	freeFlight: false,
})
const status = ref<'idle' | 'loading' | 'ready' | 'unavailable' | 'error'>(
	'idle',
)
const errorMessage = ref('')
const controller = createBlueMapController()
let unbindReady: (() => void) | null = null
let unbindError: (() => void) | null = null
let unbindViewChanged: (() => void) | null = null
const userInterruptedFollow = ref(false)

const hasCapabilities = computed(() =>
	Object.values(capabilities.value).some(Boolean),
)
const statusTitle = computed(() =>
	status.value === 'unavailable'
		? t('minecraftAccounts.map.providerUnavailable')
		: t('minecraftAccounts.map.viewerLoadFailed'),
)

const clearListeners = () => {
	unbindReady?.()
	unbindReady = null
	unbindError?.()
	unbindError = null
	unbindViewChanged?.()
	unbindViewChanged = null
}

const mountMap = async () => {
	await nextTick()
	const container = containerRef.value
	if (!container) return

	clearListeners()
	controller.destroy()
	capabilities.value = { flat: false, perspective: false, freeFlight: false }
	if (!props.assetsBaseUrl) {
		status.value = 'unavailable'
		errorMessage.value = t('minecraftAccounts.map.providerUnavailable')
		return
	}

	status.value = 'loading'
	errorMessage.value = ''
	unbindReady = controller.on('ready', (payload) => {
		capabilities.value = payload.capabilities
		status.value = 'ready'
		emit('ready', { capabilities: payload.capabilities })
	})
	unbindError = controller.on('error', (payload) => {
		status.value = 'error'
		errorMessage.value = t('minecraftAccounts.map.viewerLoadFailed')
		emit('error', payload)
	})
	unbindViewChanged = controller.on('viewChanged', (payload) => {
		emit('viewChange', payload)
	})

	try {
		await controller.mount({
			container,
			assets: { assetsBaseUrl: props.assetsBaseUrl },
			mode: currentMode.value,
			appendCacheBust: props.appendCacheBust,
			initialDistance: props.initialDistance ?? undefined,
			focus: props.focus ?? undefined,
			player: props.player,
		})
	} catch {
		// The controller has already emitted a typed error payload for the UI.
	}
}

const handleModeChange = async (mode: BlueMapViewMode) => {
	if (mode === currentMode.value) return
	try {
		await controller.setMode(mode)
		currentMode.value = mode
		emit('modeChange', mode)
	} catch {
		// Keep the previous mode when the optional upstream runtime is unavailable.
	}
}

const alignNorth = () => {
	void controller.alignNorth()
}

const resetView = () => {
	void controller.resetView()
}

const focusCurrentPosition = () => {
	if (!props.focus) return
	userInterruptedFollow.value = false
	void controller.focus({
		...props.focus,
		zoom: Math.max(props.focus.zoom ?? 0, 1),
	})
}

defineExpose({
	alignNorth,
	focusCurrentPosition,
	resetView,
})

const interruptFollow = () => {
	userInterruptedFollow.value = true
	controller.cancelFocus()
}

const hasSameFocus = (left: BlueMapFocus | null, right: BlueMapFocus | null) =>
	left?.x === right?.x && left?.z === right?.z && left?.zoom === right?.zoom

watch(
	() => props.mode,
	(mode) => {
		if (mode !== currentMode.value) void handleModeChange(mode)
	},
)

watch(
	() => props.followKey,
	() => {
		userInterruptedFollow.value = false
		if (props.focus) void controller.focus(props.focus)
	},
)

watch(
	() => props.focus,
	(focus, previousFocus) => {
		if (
			!focus ||
			userInterruptedFollow.value ||
			hasSameFocus(focus, previousFocus)
		) {
			return
		}
		void controller.focus(focus)
	},
	{ deep: true },
)

watch(
	() => props.player,
	(player) => controller.setPresence(player),
	{ deep: true },
)

watch(
	() => props.assetsBaseUrl,
	() => void mountMap(),
)

onMounted(() => void mountMap())

onMounted(() => {
	const container = containerRef.value
	if (!container) return
	container.addEventListener('pointerdown', interruptFollow, { passive: true })
	container.addEventListener('touchstart', interruptFollow, { passive: true })
	container.addEventListener('wheel', interruptFollow, { passive: true })
	container.addEventListener('keydown', interruptFollow)
})

onBeforeUnmount(() => {
	const container = containerRef.value
	container?.removeEventListener('pointerdown', interruptFollow)
	container?.removeEventListener('touchstart', interruptFollow)
	container?.removeEventListener('wheel', interruptFollow)
	container?.removeEventListener('keydown', interruptFollow)
	clearListeners()
	controller.destroy()
})
</script>
