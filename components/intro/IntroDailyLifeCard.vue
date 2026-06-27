<template>
	<section>
		<div class="mb-6 flex justify-center">
			<h2
				class="text-center font-arkpixel text-3xl leading-tight tracking-wider text-slate-950 dark:text-slate-50 sm:text-4xl"
			>
				{{ title }}
			</h2>
		</div>

		<div class="grid gap-4 md:grid-cols-2 lg:gap-6">
			<figure
				v-for="(item, index) in items"
				:key="`${item.image.src}-${index}`"
				class="group relative m-0 min-h-72 overflow-hidden rounded-xl bg-white/80 dark:bg-slate-700/80 lg:min-h-90"
			>
				<SkeletonImage
					:src="item.image.src"
					:alt="item.image.alt"
					:reveal-delay-ms="90"
					class="w-full h-full"
					image-class="block h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
					skeleton-class="rounded-none"
				/>

				<div class="pointer-events-none absolute inset-x-0 bottom-0 h-32">
					<div
						class="absolute inset-0 bg-slate-white/35 dark:bg-slate-950/35 backdrop-blur-md mask-[linear-gradient(180deg,transparent_0%,black_38%,black_100%)]"
					/>
					<div
						class="absolute inset-0 bg-linear-to-t from-slate-white/88 dark:from-slate-950/88 via-slate-white/48 dark:via-slate-950/48 to-transparent"
					/>
				</div>

				<UButton
					type="button"
					color="neutral"
					variant="link"
					icon="i-lucide-expand"
					:aria-label="`Open image preview: ${item.image.alt}`"
					:ui="{
						base: 'absolute top-4 right-4 z-10 min-h-0 p-0 text-white! transition-all duration-300 ease-out hover:text-white! focus:text-white! active:text-white!',
						leadingIcon: 'size-5 transition-opacity duration-300 ease-out',
					}"
					class="opacity-100 drop-shadow-[0_2px_10px_rgba(15,23,42,0.38)] hover:opacity-85 focus:opacity-85 active:opacity-80"
					@click="openPreview(item.image)"
				/>

				<div
					class="pointer-events-auto absolute inset-x-0 bottom-0 flex select-text flex-col gap-1 px-4 py-4 text-left sm:px-5 [text-shadow:0_1px_2px_rgba(15,23,42,0.5)]"
				>
					<span
						class="font-arkpixel text-2xl leading-tight tracking-wide text-white"
					>
						{{ item.title }}
					</span>
					<span class="leading-6 text-white">
						{{ item.subtitle }}
					</span>
				</div>
			</figure>
		</div>

		<ContentImageLightbox
			:open="lightboxOpen"
			:image="activeImage"
			@update:open="handleLightboxOpenChange"
		/>
	</section>
</template>

<script setup lang="ts">
import type { NormalizedContentImageItem } from '~/components/content/utils/content-image'

interface IntroDailyLifeItem {
	image: NormalizedContentImageItem
	title: string
	subtitle: string
}

interface IntroDailyLifeCardProps {
	title: string
	items: IntroDailyLifeItem[]
}

defineProps<IntroDailyLifeCardProps>()

const activeImage = ref<NormalizedContentImageItem | null>(null)

const lightboxOpen = computed<boolean>(() => activeImage.value !== null)

const openPreview = (image: NormalizedContentImageItem): void => {
	activeImage.value = image
}

const handleLightboxOpenChange = (open: boolean): void => {
	if (!open) {
		activeImage.value = null
	}
}
</script>
