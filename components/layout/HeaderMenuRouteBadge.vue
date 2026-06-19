<template>
	<span
		class="inline-flex h-5 shrink-0 items-center overflow-hidden transition-[width,margin-right,opacity] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
		:class="
			expanded && hasBadgeContent
				? 'w-5 mr-0 opacity-100'
				: 'w-0 -mr-1.5 opacity-0'
		"
	>
		<span
			class="relative flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-slate-500/18 text-[10px] font-semibold text-current ring-1 ring-white/10"
		>
			<USkeleton
				v-if="showSkeleton"
				class="absolute inset-0 h-full w-full rounded-full"
			/>
			<img
				v-if="hasImageSource"
				ref="imageRef"
				:src="src ?? undefined"
				:alt="alt"
				class="h-full w-full object-cover transition-opacity duration-200"
				:class="[showImage ? 'opacity-100' : 'opacity-0', playerImageClass]"
				decoding="async"
				loading="eager"
				@load="markImageReady"
				@error="markImageFailed"
			/>
			<span
				v-if="showFallback"
				class="leading-none transition-opacity duration-200"
				:class="showFallback ? 'opacity-100' : 'opacity-0'"
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

const fallbackText = computed(() => props.fallbackText?.trim() || '?')
const hasImageSource = computed(() => Boolean(props.src?.trim()))
const hasBadgeContent = computed(
	() => hasImageSource.value || Boolean(fallbackText.value),
)
const showSkeleton = computed(
	() => hasImageSource.value && !imageReady.value && !imageFailed.value,
)
const showImage = computed(
	() => hasImageSource.value && imageReady.value && !imageFailed.value,
)
const showFallback = computed(() => !hasImageSource.value || imageFailed.value)
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
