<template>
	<div ref="wrapperRef" v-bind="$attrs" class="relative">
		<USkeleton v-if="!isVisible" class="absolute inset-0" />
		<SkeletonImage
			v-else
			:src="src"
			:alt="alt"
			:image-class="imageClass"
			:skeleton-class="skeletonClass"
			:loading="loading"
			:decoding="decoding"
			class="h-full w-full"
		/>
	</div>
</template>

<script setup lang="ts">
interface DeferredSkeletonImageProps {
	src: string
	alt: string
	imageClass?: string
	skeletonClass?: string
	loading?: 'eager' | 'lazy'
	decoding?: 'async' | 'auto' | 'sync'
	root?: HTMLElement | null
	rootMargin?: string
}

defineOptions({
	inheritAttrs: false,
})

const props = withDefaults(defineProps<DeferredSkeletonImageProps>(), {
	imageClass: '',
	skeletonClass: '',
	loading: 'lazy',
	decoding: 'async',
	root: null,
	rootMargin: '0px',
})

const wrapperRef = ref<HTMLElement | null>(null)
const isVisible = ref(false)

let observer: IntersectionObserver | null = null

const stopObserving = (): void => {
	observer?.disconnect()
	observer = null
}

const markVisible = (): void => {
	isVisible.value = true
	stopObserving()
}

const startObserving = (): void => {
	stopObserving()

	if (!wrapperRef.value || typeof IntersectionObserver === 'undefined') {
		markVisible()
		return
	}

	observer = new IntersectionObserver(
		(entries) => {
			if (entries.some((entry) => entry.isIntersecting)) {
				markVisible()
			}
		},
		{
			root: props.root,
			rootMargin: props.rootMargin,
			threshold: 0.01,
		},
	)

	observer.observe(wrapperRef.value)
}

watch(
	() => [props.src, props.root] as const,
	() => {
		isVisible.value = false
		void nextTick(startObserving)
	},
)

onMounted(() => {
	startObserving()
})

onBeforeUnmount(() => {
	stopObserving()
})
</script>
