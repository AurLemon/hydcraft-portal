<template>
	<div ref="wrapperRef" v-bind="$attrs" class="relative">
		<SkeletonImage
			:src="src"
			:alt="alt"
			:image-class="imageClass"
			:show-skeleton="false"
			:loading="loading"
			:decoding="decoding"
			:referrerpolicy="referrerpolicy"
			class="h-full w-full"
			@ready="handleImageReady"
		/>
	</div>
</template>

<script setup lang="ts">
type ImageReferrerPolicy =
	| ''
	| 'no-referrer'
	| 'no-referrer-when-downgrade'
	| 'origin'
	| 'origin-when-cross-origin'
	| 'same-origin'
	| 'strict-origin'
	| 'strict-origin-when-cross-origin'
	| 'unsafe-url'

interface DeferredSkeletonImageProps {
	src: string
	alt: string
	imageClass?: string
	skeletonClass?: string
	loading?: 'eager' | 'lazy'
	decoding?: 'async' | 'auto' | 'sync'
	referrerpolicy?: ImageReferrerPolicy
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
	referrerpolicy: undefined,
	root: null,
	rootMargin: '0px',
})

const emit = defineEmits<{
	ready: [payload: { width: number; height: number }]
}>()

const wrapperRef = ref<HTMLElement | null>(null)

const handleImageReady = (): void => {
	const imageElement = wrapperRef.value?.querySelector('img')
	const width = imageElement?.naturalWidth ?? 0
	const height = imageElement?.naturalHeight ?? 0

	if (width > 0 && height > 0) {
		emit('ready', { width, height })
	}
}
</script>
