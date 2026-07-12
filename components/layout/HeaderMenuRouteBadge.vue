<template>
	<span
		class="inline-flex h-6 shrink-0 items-center overflow-hidden transition-[width,margin-right,opacity] duration-360 ease-[cubic-bezier(0.22,1,0.36,1)] -translate-y-0.5"
		:class="
			expanded && hasBadgeContent
				? 'w-6 mr-0 opacity-100'
				: 'w-0 -mr-1.5 opacity-0'
		"
	>
		<span
			class="relative flex h-6 w-6 items-center justify-center overflow-hidden text-[10px] font-semibold text-current"
			:class="[badgeShapeClass, badgeFrameClass]"
		>
			<USkeleton
				v-show="showSkeleton"
				class="absolute inset-0 h-full w-full"
				:class="badgeShapeClass"
			/>
			<img
				v-show="hasImageSource"
				ref="imageRef"
				:src="src ?? undefined"
				:alt="alt"
				class="h-full w-full object-cover transition-opacity duration-200"
				:class="[
					showImage ? 'opacity-100' : 'pointer-events-none opacity-0',
					playerImageClass,
				]"
				decoding="async"
				loading="eager"
				@load="markImageReady"
				@error="markImageFailed"
			/>
			<span
				class="absolute inset-0 flex items-center justify-center leading-none transition-opacity duration-200 bg-slate-500/18"
				:class="showFallback ? 'opacity-100' : 'pointer-events-none opacity-0'"
			>
				{{ fallbackText }}
			</span>
		</span>
	</span>
</template>

<script setup lang="ts">
const props = defineProps<{
	src?: string | null
	alt: string
	fallbackText?: string | null
	badgeType?: 'minecraft-player' | 'user-profile' | null
}>()

const imageRef = ref<HTMLImageElement | null>(null)
const expanded = ref(false)
const imageReady = ref(false)
const imageFailed = ref(false)

const fallbackText = computed(() => props.fallbackText?.trim() || '')
const hasFallbackText = computed(() => Boolean(fallbackText.value))
const hasImageSource = computed(() => Boolean(props.src?.trim()))
const hasBadgeContent = computed(
	() => hasImageSource.value || hasFallbackText.value,
)
const showSkeleton = computed(
	() => hasImageSource.value && !imageReady.value && !imageFailed.value,
)
const showImage = computed(
	() => hasImageSource.value && imageReady.value && !imageFailed.value,
)
const showFallback = computed(
	() => hasFallbackText.value && (!hasImageSource.value || imageFailed.value),
)
const badgeShapeClass = computed(() =>
	props.badgeType === 'minecraft-player' ? '' : 'rounded-full',
)
const badgeFrameClass = computed(() =>
	props.badgeType === 'user-profile' ? 'border border-white/10' : '',
)
const playerImageClass = computed(() =>
	props.badgeType === 'minecraft-player' ? 'drop-shadow' : '',
)

const syncExpandedState = async (): Promise<void> => {
	expanded.value = false
	await nextTick()
	expanded.value = hasBadgeContent.value
}

const markImageReady = (): void => {
	imageReady.value = true
	imageFailed.value = false
}

const markImageFailed = (): void => {
	imageReady.value = false
	imageFailed.value = true
}

const syncCachedImageState = async (): Promise<void> => {
	await nextTick()

	if (!hasImageSource.value) {
		return
	}

	if (imageRef.value?.complete) {
		if (imageRef.value.naturalWidth > 0) {
			markImageReady()
			return
		}

		markImageFailed()
	}
}

watch(
	() => [props.src, props.fallbackText],
	() => {
		imageReady.value = false
		imageFailed.value = false
		void syncExpandedState()
		void syncCachedImageState()
	},
)

onMounted(() => {
	void syncExpandedState()
	void syncCachedImageState()
})
</script>
