<template>
	<nav
		v-if="scenes.length > 1 && active"
		class="pointer-events-auto absolute top-24 left-1/2 z-[200] -translate-x-1/2 sm:top-28"
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
	durationMs?: number
}

const props = withDefaults(defineProps<HomeSceneSwitcherProps>(), {
	durationMs: 15_000,
})

const emit = defineEmits<{
	'update:modelValue': [index: number]
}>()

const { t } = useI18n()
const elapsedMs = ref(0)
const documentVisible = ref(true)
let animationFrame: number | null = null
let lastTimestamp: number | null = null

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

const selectScene = (index: number): void => {
	if (index < 0 || index >= props.scenes.length) return
	elapsedMs.value = 0
	lastTimestamp = null
	emit('update:modelValue', index)
}

const advanceScene = (): void => {
	if (props.scenes.length <= 1) return
	selectScene((props.modelValue + 1) % props.scenes.length)
}

const tick = (timestamp: number): void => {
	if (!props.active || !documentVisible.value || props.scenes.length <= 1) {
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
	() => [props.active, props.scenes.length] as const,
	() => {
		if (props.active) {
			startClock()
			return
		}
		stopClock()
	},
)

watch(
	() => props.modelValue,
	() => {
		elapsedMs.value = 0
		lastTimestamp = null
	},
)

onMounted(() => {
	documentVisible.value = document.visibilityState === 'visible'
	document.addEventListener('visibilitychange', handleVisibilityChange)
	startClock()
})

onBeforeUnmount(() => {
	stopClock()
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
