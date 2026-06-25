<template>
	<div ref="wrapperRef" v-bind="$attrs" class="relative">
		<USkeleton
			class="absolute inset-0 transition-opacity duration-300"
			:class="[skeletonClass, imageReady ? 'opacity-0' : 'opacity-100']"
			aria-hidden="true"
		/>
		<SkeletonImage
			v-if="isVisible"
			:src="src"
			:alt="alt"
			:image-class="imageClass"
			:show-skeleton="false"
			:loading="loading"
			:decoding="decoding"
			class="h-full w-full"
			@ready="handleImageReady"
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
const imageReady = ref(false)

let observer: IntersectionObserver | null = null

const stopObserving = (): void => {
	observer?.disconnect()
	observer = null
}

const handleImageReady = (): void => {
	imageReady.value = true
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
		imageReady.value = false
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
