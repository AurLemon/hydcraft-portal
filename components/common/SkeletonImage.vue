<template>
	<div v-bind="$attrs" class="relative">
		<USkeleton
			v-if="showSkeleton && renderSkeleton"
			class="absolute inset-0 transition-opacity duration-300"
			:class="[skeletonClass, skeletonVisible ? 'opacity-100' : 'opacity-0']"
			aria-hidden="true"
		/>
		<img
			ref="imageRef"
			:src="src"
			:alt="alt"
			:class="[
				'transition-opacity duration-300',
				imageClass,
				imageVisible ? 'opacity-100' : 'opacity-0',
			]"
			:loading="loading"
			:decoding="decoding"
			:referrerpolicy="referrerpolicy"
			@load="markImageReady"
			@error="markImageReady"
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

interface SkeletonImageProps {
	src: string
	alt: string
	imageClass?: string
	skeletonClass?: string
	showSkeleton?: boolean
	revealDelayMs?: number
	loading?: 'eager' | 'lazy'
	decoding?: 'async' | 'auto' | 'sync'
	referrerpolicy?: ImageReferrerPolicy
}

defineOptions({
	inheritAttrs: false,
})

const props = withDefaults(defineProps<SkeletonImageProps>(), {
	imageClass: '',
	skeletonClass: '',
	showSkeleton: true,
	revealDelayMs: 0,
	loading: 'lazy',
	decoding: 'async',
	referrerpolicy: undefined,
})

const emit = defineEmits<{
	ready: []
}>()

const imageRef = ref<HTMLImageElement | null>(null)
const renderSkeleton = ref(props.showSkeleton)
const skeletonVisible = ref(props.showSkeleton)
const imageVisible = ref(false)
let revealFrame = 0
let skeletonCleanupTimer: ReturnType<typeof setTimeout> | null = null
let revealDelayTimer: ReturnType<typeof setTimeout> | null = null
let decodeSequence = 0

const clearSkeletonCleanupTimer = (): void => {
	if (skeletonCleanupTimer !== null) {
		clearTimeout(skeletonCleanupTimer)
		skeletonCleanupTimer = null
	}
}

const clearRevealDelayTimer = (): void => {
	if (revealDelayTimer !== null) {
		clearTimeout(revealDelayTimer)
		revealDelayTimer = null
	}
}

const resetVisibility = (): void => {
	decodeSequence += 1
	cancelAnimationFrame(revealFrame)
	clearSkeletonCleanupTimer()
	clearRevealDelayTimer()
	renderSkeleton.value = props.showSkeleton
	skeletonVisible.value = props.showSkeleton
	imageVisible.value = false
}

const applyRevealState = (): void => {
	cancelAnimationFrame(revealFrame)
	clearSkeletonCleanupTimer()

	if (props.showSkeleton) {
		skeletonVisible.value = false
		skeletonCleanupTimer = setTimeout(() => {
			renderSkeleton.value = false
			skeletonCleanupTimer = null
		}, 300)
	}

	revealFrame = requestAnimationFrame(() => {
		imageVisible.value = true
		emit('ready')
	})
}

const revealImage = (): void => {
	clearRevealDelayTimer()

	if (props.revealDelayMs > 0) {
		revealDelayTimer = setTimeout(() => {
			revealDelayTimer = null
			applyRevealState()
		}, props.revealDelayMs)
		return
	}

	applyRevealState()
}

const waitForImageDecode = async (): Promise<void> => {
	const image = imageRef.value

	if (!image || typeof image.decode !== 'function') {
		return
	}

	try {
		await image.decode()
	} catch {
		// Decode can be interrupted for cached or replaced images.
	}
}

const revealWhenDecoded = async (): Promise<void> => {
	const sequence = ++decodeSequence

	await waitForImageDecode()

	if (sequence !== decodeSequence) {
		return
	}

	revealImage()
}

const markImageReady = (): void => {
	void revealWhenDecoded()
}

const syncCachedImageState = async (): Promise<void> => {
	await nextTick()

	if (imageRef.value?.complete) {
		void revealWhenDecoded()
	}
}

watch(
	() => props.src,
	() => {
		resetVisibility()
		void syncCachedImageState()
	},
)

onMounted(() => {
	void syncCachedImageState()
})

onBeforeUnmount(() => {
	decodeSequence += 1
	cancelAnimationFrame(revealFrame)
	clearSkeletonCleanupTimer()
	clearRevealDelayTimer()
})
</script>
