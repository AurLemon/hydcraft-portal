<template>
	<section>
		<div class="mb-6 flex justify-center">
			<h2
				class="text-center font-arkpixel text-3xl leading-tight tracking-wider text-slate-950 dark:text-slate-50 sm:text-4xl"
			>
				{{ title }}
			</h2>
		</div>

		<div
			class="relative mask-[linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.45)_3%,black_8%,black_92%,rgba(0,0,0,0.45)_97%,transparent_100%)]"
		>
			<div class="grid gap-4">
				<UMarquee
					v-for="(row, rowIndex) in imageRows"
					:key="`intro-marquee-row-${rowIndex}`"
					pause-on-hover
					:reverse="rowIndex % 2 === 1"
					:repeat="2"
					:overlay="false"
					:ui="{
						root:
							(rowDurations[rowIndex] ?? '[--duration:44s]') +
							' [--gap:--spacing(10)]',
					}"
				>
					<figure v-for="image in row" :key="image.src" class="m-0">
						<button
							type="button"
							class="group block cursor-zoom-in overflow-hidden rounded-xl bg-white/80 shadow-[0_12px_32px_rgba(15,23,42,0.14)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400 dark:bg-slate-900/80"
							:aria-label="`Open image preview: ${image.alt}`"
							@click="openPreview(image)"
						>
							<SkeletonImage
								:src="image.src"
								:alt="image.alt"
								:reveal-delay-ms="90"
								class="h-44 w-[19rem] sm:h-52 sm:w-[24rem]"
								image-class="block h-full w-full object-cover"
								skeleton-class="rounded-none"
							/>
						</button>
					</figure>
				</UMarquee>
			</div>
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

interface IntroMarqueeProps {
	title: string
	images: NormalizedContentImageItem[]
}

const props = defineProps<IntroMarqueeProps>()

const rowDurations = [
	'[--duration:46s]',
	'[--duration:52s]',
	'[--duration:49s]',
]

const imageRows = computed<NormalizedContentImageItem[][]>(() => {
	const rows: NormalizedContentImageItem[][] = [[], [], []]

	props.images.forEach((image, index) => {
		rows[index % rows.length]?.push(image)
	})

	return rows.filter((row) => row.length > 0)
})

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
