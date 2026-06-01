<template>
	<UModal
		:open="open"
		fullscreen
		:close="false"
		:ui="{
			overlay: 'bg-white/78 backdrop-blur-md dark:bg-slate-950/86',
			content: 'bg-transparent shadow-none ring-0',
			body: 'p-0',
		}"
		@update:open="handleOpenChange"
	>
		<template #content="{ close }">
			<div
				v-if="image"
				class="relative flex min-h-dvh items-center justify-center p-3 sm:p-6"
				@click="close"
			>
				<button
					type="button"
					class="absolute top-3 right-3 z-10 flex h-11 w-11 items-center justify-center text-slate-500 transition-colors duration-200 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400 dark:text-slate-400 dark:hover:text-slate-50"
					aria-label="Close image preview"
					@click.stop="close"
				>
					<UIcon name="i-lucide-x" class="text-2xl" />
				</button>

				<figure
					class="flex w-full max-w-[min(96vw,88rem)] flex-col items-center"
					@click.stop
				>
					<div class="flex w-full items-center justify-center">
						<SkeletonImage
							:src="image.src"
							:alt="image.alt"
							class="max-h-[calc(100dvh-6rem)] w-full"
							image-class="mx-auto block max-h-[calc(100dvh-6rem)] w-auto max-w-full object-contain select-none"
							loading="eager"
						/>
					</div>

					<figcaption
						v-if="image.caption"
						class="mt-4 max-w-3xl px-3 text-center text-sm leading-6 text-slate-600 dark:text-slate-300"
					>
						{{ image.caption }}
					</figcaption>
				</figure>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import type { NormalizedContentImageItem } from './utils/content-image'

interface ContentImageLightboxProps {
	open: boolean
	image: NormalizedContentImageItem | null
}

const props = defineProps<ContentImageLightboxProps>()

const emit = defineEmits<{
	'update:open': [value: boolean]
}>()

const handleOpenChange = (value: boolean): void => {
	emit('update:open', value)
}
</script>
