<template>
	<div class="group block">
		<button
			type="button"
			class="block w-full cursor-pointer text-left"
			:aria-label="
				t('content.serverOverview.cards.seasonEightTerrain.openPreview')
			"
			@click="lightboxOpen = true"
		>
			<section
				class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 sm:p-7"
			>
				<div
					class="absolute inset-0 bg-cover bg-center transition duration-300 group-hover:scale-[1.02] group-hover:brightness-90 dark:group-hover:brightness-75"
					:style="backgroundStyle"
				/>
				<div
					class="pointer-events-none absolute inset-0 bg-linear-to-r from-white/72 via-white/10 to-transparent dark:from-slate-950 dark:via-slate-950/24 dark:to-transparent"
				/>
				<div
					class="pointer-events-none absolute inset-0 bg-linear-to-l from-white/72 via-white/8 to-transparent dark:from-slate-950/92 dark:via-slate-950/18 dark:to-transparent"
				/>
				<div
					class="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-white/62 to-transparent dark:from-slate-950/86"
				/>

				<div class="relative flex min-h-40 flex-col justify-between gap-10">
					<div
						class="flex size-16 shrink-0 items-center justify-center text-5xl"
					>
						<span aria-hidden="true">🥵</span>
					</div>

					<div class="max-w-3xl">
						<h2
							class="font-arkpixel text-2xl leading-8 text-slate-900 dark:text-slate-50 lg:text-3xl lg:leading-10"
						>
							{{ t('content.serverOverview.cards.seasonEightTerrain.title') }}
						</h2>
						<p
							class="mt-3 text-base leading-7 text-slate-700 dark:text-slate-200 lg:text-lg"
						>
							{{
								t('content.serverOverview.cards.seasonEightTerrain.subtitle')
							}}
						</p>
					</div>
				</div>
			</section>
		</button>
	</div>

	<ContentImageLightbox
		:open="lightboxOpen"
		:image="previewImage"
		@update:open="lightboxOpen = $event"
	/>
</template>

<script setup lang="ts">
import type { NormalizedContentImageItem } from '~/components/content/utils/content-image'
import terrainAdvanceImage from '~/assets/resources/minecraft-gallery/season_8/terrain_advance_screenshots.webp'
import terrainMapImage from '~/assets/resources/minecraft-gallery/season_8/terrain_map_202606.webp'
import { getStableAssetUrl } from '~/utils/assets/stable-asset-url'

const { t } = useI18n()
const lightboxOpen = ref(false)

const backgroundStyle = {
	backgroundImage: `url('${getStableAssetUrl(terrainAdvanceImage)}')`,
}

const previewImage = computed<NormalizedContentImageItem>(() => ({
	src: getStableAssetUrl(terrainMapImage),
	alt: t('content.serverOverview.cards.seasonEightTerrain.previewAlt'),
	caption: t('content.serverOverview.cards.seasonEightTerrain.previewCaption'),
	width: '1254',
	height: '1254',
	aspectRatio: 1,
}))
</script>
