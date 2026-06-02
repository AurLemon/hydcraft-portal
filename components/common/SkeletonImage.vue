<template>
	<div v-bind="$attrs" class="relative">
		<USkeleton
			v-if="!imageReady"
			class="absolute inset-0"
			:class="skeletonClass"
		/>
		<img
			ref="imageRef"
			:src="src"
			:alt="alt"
			:class="[
				'transition-opacity duration-200',
				imageClass,
				imageReady ? 'opacity-100' : 'opacity-0',
			]"
			:loading="loading"
			:decoding="decoding"
			@load="markImageReady"
			@error="markImageReady"
		/>
	</div>
</template>

<script setup lang="ts">
interface SkeletonImageProps {
	src: string
	alt: string
	imageClass?: string
	skeletonClass?: string
	loading?: 'eager' | 'lazy'
	decoding?: 'async' | 'auto' | 'sync'
}

defineOptions({
	inheritAttrs: false,
})

const props = withDefaults(defineProps<SkeletonImageProps>(), {
	imageClass: '',
	skeletonClass: '',
	loading: 'lazy',
	decoding: 'async',
})

const imageReady = ref(false)
const imageRef = ref<HTMLImageElement | null>(null)

const markImageReady = (): void => {
	imageReady.value = true
}

const syncCachedImageState = async (): Promise<void> => {
	await nextTick()

	if (imageRef.value?.complete) {
		imageReady.value = true
	}
}

watch(
	() => props.src,
	() => {
		imageReady.value = false
		void syncCachedImageState()
	},
)

onMounted(() => {
	void syncCachedImageState()
})
</script>
