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
			v-if="isMobileViewport"
			class="relative mask-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.45)_3%,black_10%,black_90%,rgba(0,0,0,0.45)_97%,transparent_100%)]"
		>
			<div class="grid h-[18rem] grid-cols-3 gap-1.5">
				<UMarquee
					v-for="(column, columnIndex) in mobileImageColumns"
					:key="`intro-marquee-column-${columnIndex}`"
					orientation="vertical"
					pause-on-hover
					:reverse="columnIndex % 2 === 1"
					:repeat="2"
					:overlay="false"
					:ui="{
						root:
							(mobileColumnDurations[columnIndex] ?? '[--duration:32s]') +
							' [--gap:--spacing(3)] h-full',
					}"
				>
					<figure v-for="image in column" :key="image.src" class="m-0 w-full">
						<button
							type="button"
							class="group block w-full cursor-zoom-in overflow-hidden rounded-lg bg-white/80 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-sky-400 dark:bg-slate-900/80"
							:aria-label="`Open image preview: ${image.alt}`"
							@click="openPreview(image)"
						>
							<SkeletonImage
								:src="image.src"
								:alt="image.alt"
								:reveal-delay-ms="90"
								class="h-16 w-full sm:h-20"
								image-class="block h-full w-full object-cover"
								skeleton-class="rounded-none"
							/>
						</button>
					</figure>
				</UMarquee>
			</div>
		</div>

		<div
			v-else
			class="relative mask-[linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.45)_3%,black_8%,black_92%,rgba(0,0,0,0.45)_97%,transparent_100%)]"
		>
			<div class="grid gap-4">
				<UMarquee
					v-for="(row, rowIndex) in desktopImageRows"
					:key="`intro-marquee-row-${rowIndex}`"
					pause-on-hover
					:reverse="rowIndex % 2 === 1"
					:repeat="2"
					:overlay="false"
					:ui="{
						root:
							(desktopRowDurations[rowIndex] ?? '[--duration:44s]') +
							' [--gap:--spacing(10)]',
					}"
				>
					<figure v-for="image in row" :key="image.src" class="m-0">
						<button
							type="button"
							class="group block cursor-zoom-in overflow-hidden rounded-xl bg-white/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400 dark:bg-slate-900/80"
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

const desktopRowDurations = [
	'[--duration:46s]',
	'[--duration:52s]',
	'[--duration:49s]',
]

const mobileColumnDurations = [
	'[--duration:30s]',
	'[--duration:34s]',
	'[--duration:31s]',
]

const MOBILE_VIEWPORT_MEDIA_QUERY = '(max-width: 639px)'

const buildImageBuckets = (count: number): NormalizedContentImageItem[][] => {
	const buckets = Array.from(
		{ length: count },
		() => [] as NormalizedContentImageItem[],
	)

	props.images.forEach((image, index) => {
		buckets[index % count]?.push(image)
	})

	return buckets.filter((bucket) => bucket.length > 0)
}

const desktopImageRows = computed<NormalizedContentImageItem[][]>(() =>
	buildImageBuckets(3),
)

const mobileImageColumns = computed<NormalizedContentImageItem[][]>(() =>
	buildImageBuckets(3),
)

const isMobileViewport = ref(false)
let mobileViewportMediaQuery: MediaQueryList | null = null

const syncMobileViewportState = (): void => {
	isMobileViewport.value = mobileViewportMediaQuery?.matches ?? false
}

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

onMounted(() => {
	if (!import.meta.client) {
		return
	}

	mobileViewportMediaQuery = window.matchMedia(MOBILE_VIEWPORT_MEDIA_QUERY)
	syncMobileViewportState()
	mobileViewportMediaQuery.addEventListener('change', syncMobileViewportState)
})

onBeforeUnmount(() => {
	mobileViewportMediaQuery?.removeEventListener(
		'change',
		syncMobileViewportState,
	)
	mobileViewportMediaQuery = null
})
</script>
