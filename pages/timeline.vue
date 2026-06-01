<template>
	<div class="site-shell flex flex-col items-center">
		<MarkdownPage>
			<template #header="{ doc }">
				<div class="-mt-12 mb-6 flex flex-col items-center gap-2">
					<SkeletonImage
						:src="timelineCover"
						alt="Timeline cover"
						class="mb-6 aspect-video w-full max-w-4xl overflow-hidden rounded-2xl h-64 select-none"
						image-class="block h-full w-full object-cover transition-opacity duration-200"
					/>
					<div
						class="text-4xl text-center font-arkpixel tracking-wider uppercase text-slate-950 dark:text-slate-50"
					>
						{{ t('pages.timeline.title') }}
					</div>
					<ContentReadingStats :doc="doc" />
				</div>
			</template>
			<template #footer="{ doc }">
				<ContentUpdatedAt :doc="doc" />
			</template>
		</MarkdownPage>
	</div>
</template>

<script setup lang="ts">
import timelineCover from '~/assets/resources/pages/timeline_cover.webp'
</script>
