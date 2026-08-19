<template>
	<nav
		v-if="scenes.length > 1"
		class="absolute top-24 left-1/2 z-[200] -translate-x-1/2 transition-[opacity,transform] duration-300 ease-out sm:top-28"
		:class="
			active
				? 'pointer-events-auto opacity-100'
				: 'pointer-events-none -translate-y-2 opacity-0'
		"
		:aria-label="t('home.immersive.sceneSwitcher.label')"
	>
		<div class="flex h-12 items-center gap-1.5 sm:gap-2">
			<button
				v-for="(scene, index) in scenes"
				:key="scene.id"
				type="button"
				class="group relative flex h-6 cursor-pointer items-center overflow-hidden rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-sky-300"
				:class="index === modelValue ? 'w-8 sm:w-12' : 'w-3.5 sm:w-5'"
				:aria-label="
					t('home.immersive.sceneSwitcher.select', {
						name: scene.label,
					})
				"
				:aria-current="index === modelValue ? 'true' : undefined"
				@click="selectScene(index)"
			>
				<span
					class="absolute inset-y-0 my-auto h-1.5 w-full rounded-full bg-white/35 transition-colors group-hover:bg-white/60"
				/>
				<span
					v-if="index === modelValue"
					class="absolute inset-y-0 left-0 my-auto h-1.5 w-full overflow-hidden rounded-full"
				>
					<span
						class="block h-full w-full rounded-full bg-white will-change-transform"
						:class="
							progressResetting
								? 'transition-transform duration-300 ease-out'
								: 'transition-none'
						"
						:style="{
							transform: `translateX(${(progress - 1) * 100}%)`,
						}"
					/>
				</span>
			</button>
		</div>
	</nav>
</template>

<script setup lang="ts">
export interface HomeSceneSwitcherItem {
	id: string
	label: string
}

interface HomeSceneSwitcherProps {
	modelValue: number
	scenes: readonly HomeSceneSwitcherItem[]
	active: boolean
	counting?: boolean
	durationMs?: number
}

const props = withDefaults(defineProps<HomeSceneSwitcherProps>(), {
	counting: true,
	durationMs: 15_000,
})

const emit = defineEmits<{
	'update:modelValue': [index: number]
}>()

const { t } = useI18n()
const elapsedMs = ref(0)
const documentVisible = ref(true)
const progressResetting = ref(false)
let animationFrame: number | null = null
let lastTimestamp: number | null = null
let progressResetFrame: number | null = null
let progressResetTimer: ReturnType<typeof setTimeout> | null = null

const progress = computed(() =>
	Math.min(Math.max(elapsedMs.value / props.durationMs, 0), 1),
)

const stopClock = (): void => {
	if (animationFrame !== null) {
		cancelAnimationFrame(animationFrame)
		animationFrame = null
	}
	lastTimestamp = null
}

const resetProgress = (force = false): void => {
	if (!force && elapsedMs.value <= 0) return
	if (progressResetFrame !== null) cancelAnimationFrame(progressResetFrame)
	if (progressResetTimer) clearTimeout(progressResetTimer)

	stopClock()
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		elapsedMs.value = 0
		progressResetting.value = false
		startClock()
		return
	}
	progressResetting.value = true
	progressResetFrame = requestAnimationFrame(() => {
		progressResetFrame = null
		elapsedMs.value = 0
		progressResetTimer = setTimeout(() => {
			progressResetting.value = false
			progressResetTimer = null
			startClock()
		}, 300)
	})
}

const selectScene = (index: number): void => {
	if (index < 0 || index >= props.scenes.length) return
	if (index === props.modelValue) resetProgress(true)
	emit('update:modelValue', index)
}

const advanceScene = (): void => {
	if (!props.active || props.scenes.length <= 1) return
	selectScene((props.modelValue + 1) % props.scenes.length)
}

const tick = (timestamp: number): void => {
	if (
		!props.active ||
		!props.counting ||
		!documentVisible.value ||
		props.scenes.length <= 1
	) {
		stopClock()
		return
	}

	if (lastTimestamp !== null) {
		elapsedMs.value += timestamp - lastTimestamp
	}
	lastTimestamp = timestamp

	if (elapsedMs.value >= props.durationMs) {
		advanceScene()
	}

	animationFrame = requestAnimationFrame(tick)
}

const startClock = (): void => {
	if (
		animationFrame !== null ||
		!props.active ||
		!props.counting ||
		!documentVisible.value ||
		props.scenes.length <= 1
	) {
		return
	}

	animationFrame = requestAnimationFrame(tick)
}

const handleVisibilityChange = (): void => {
	documentVisible.value = document.visibilityState === 'visible'
	if (documentVisible.value) {
		startClock()
		return
	}
	stopClock()
}

watch(
	() => [props.active, props.counting, props.scenes.length] as const,
	() => {
		if (props.active) {
			startClock()
			return
		}
		resetProgress()
		stopClock()
	},
)

watch(
	() => props.modelValue,
	() => {
		resetProgress()
	},
)

onMounted(() => {
	documentVisible.value = document.visibilityState === 'visible'
	document.addEventListener('visibilitychange', handleVisibilityChange)
	startClock()
})

onBeforeUnmount(() => {
	stopClock()
	if (progressResetFrame !== null) cancelAnimationFrame(progressResetFrame)
	if (progressResetTimer) clearTimeout(progressResetTimer)
	document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped>
@media (prefers-reduced-motion: reduce) {
	button,
	span {
		transition: none;
	}
}
</style>
