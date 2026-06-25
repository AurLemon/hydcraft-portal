<template>
	<IntroArchitectCarouselCard
		:title="t('content.intro.staff.chiefArchitect.title')"
		:subtitle="t('content.intro.staff.chiefArchitect.subtitle')"
		:prev-label="t('content.intro.staff.chiefArchitect.prev')"
		:next-label="t('content.intro.staff.chiefArchitect.next')"
		:goto-label="chiefArchitectGotoLabel"
		:members="chiefArchitects"
		title-class="font-arkpixel text-lg leading-none tracking-wide text-[#fff4c8] [text-shadow:0_0_12px_rgba(255,224,120,0.42),0_1px_0_rgba(255,250,220,0.52),0_2px_18px_rgba(232,170,44,0.34)] filter-[drop-shadow(0_0_10px_rgba(255,226,132,0.24))]"
		subtitle-class="text-xs text-white"
	/>
</template>

<script setup lang="ts">
import {
	getMinecraftBodyRendererUrl,
	getMinecraftSkinRendererUrl,
} from '~/utils/minecraft/body-renderer'
import chiefArchitectCatImage from '~/assets/resources/minecraft-gallery/season_7/owen_screenshots_1.webp'
import chiefArchitectFisheyeImage from '~/assets/resources/minecraft-gallery/season_7/gtr_screenshots_1.webp'
import chiefArchitectXwImage from '~/assets/resources/minecraft-gallery/misc/marclen_screenshots_1.webp'

interface ChiefArchitectDefinition {
	key: 'cat' | 'xw' | 'fisheye'
	id: string
	imageUrl: string
}

interface ChiefArchitectDisplayItem extends ChiefArchitectDefinition {
	nickname: string
	motto: string
	intro: string
	bodyUrl: string
	skinUrl: string
}

const chiefArchitectDefinitions: ChiefArchitectDefinition[] = [
	{
		key: 'cat',
		id: 'CatPillager',
		imageUrl: chiefArchitectCatImage,
	},
	{
		key: 'xw',
		id: 'xwTeng',
		imageUrl: chiefArchitectXwImage,
	},
	{
		key: 'fisheye',
		id: 'FisheyeArtist59',
		imageUrl: chiefArchitectFisheyeImage,
	},
]

const { t } = useI18n()

const chiefArchitects = computed<ChiefArchitectDisplayItem[]>(() =>
	chiefArchitectDefinitions.map((member) => ({
		...member,
		nickname: t(
			`content.intro.staff.chiefArchitect.members.${member.key}.nickname`,
		),
		motto: t(`content.intro.staff.chiefArchitect.members.${member.key}.motto`),
		intro: t(`content.intro.staff.chiefArchitect.members.${member.key}.intro`),
		bodyUrl: getMinecraftBodyRendererUrl(member.id),
		skinUrl: getMinecraftSkinRendererUrl(member.id),
	})),
)

const chiefArchitectGotoLabel = (index: number) =>
	t('content.intro.staff.chiefArchitect.goto', { index })
</script>
