<template>
	<div class="site-shell flex flex-col items-center">
		<MarkdownPage>
			<template #header="{ doc }">
				<div class="mb-6 w-full">
					<div class="mb-6 w-full">
						<SkeletonImage
							:src="charterCover"
							alt="Charter cover"
							class="w-full overflow-hidden rounded-2xl h-54 lg:h-80 select-none"
							image-class="block h-full w-full object-cover transition-opacity duration-200"
						/>
					</div>
					<div
						class="mx-auto flex w-full max-w-3xl flex-col items-center gap-2"
					>
						<div
							class="text-4xl text-center font-arkpixel tracking-wider uppercase text-slate-950 dark:text-slate-50"
						>
							{{ t('content.charter.title') }}
						</div>
						<ContentReadingStats :doc="doc" />
					</div>
				</div>
			</template>
			<template #footer="{ doc }">
				<ContentUpdatedAt :doc="doc" />
			</template>
		</MarkdownPage>
	</div>
</template>

<script setup lang="ts">
import charterCover from '~/assets/resources/pages/server_charter_cover.webp'
</script>
