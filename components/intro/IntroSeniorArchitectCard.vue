<template>
	<IntroArchitectCarouselCard
		:title="t('content.intro.staff.seniorArchitect.title')"
		:subtitle="t('content.intro.staff.seniorArchitect.subtitle')"
		:prev-label="t('content.intro.staff.seniorArchitect.prev')"
		:next-label="t('content.intro.staff.seniorArchitect.next')"
		:goto-label="seniorArchitectGotoLabel"
		:members="seniorArchitects"
	/>
</template>

<script setup lang="ts">
import {
	getMinecraftBodyRendererUrl,
	getMinecraftSkinRendererUrl,
} from '~/utils/minecraft/body-renderer'
import seniorArchitectAfeImage from '~/assets/resources/minecraft-gallery/season_7/jianghu_screenshots_1.webp'
import seniorArchitectChuxiaImage from '~/assets/resources/minecraft-gallery/season_7/jiuxiang_screenshots_1.webp'
import seniorArchitectDotkkImage from '~/assets/resources/minecraft-gallery/season_7/guangyang_screenshots_2.webp'
import seniorArchitectQishuiImage from '~/assets/resources/minecraft-gallery/season_7/qinjing_screenshots_1.webp'
import seniorArchitectQixuanImage from '~/assets/resources/minecraft-gallery/season_7/guangyang_screenshots_4.webp'
import seniorArchitectXxlmImage from "~/assets/resources/minecraft-gallery/season_7/bei'an_screenshots_1.webp"

interface SeniorArchitectDefinition {
	key: 'afe' | 'qishui' | 'qixuan' | 'xxlm' | 'dotkk' | 'chuxia'
	id: string
	imageUrl: string
}

interface SeniorArchitectDisplayItem extends SeniorArchitectDefinition {
	nickname: string
	motto: string
	intro: string
	bodyUrl: string
	skinUrl: string
}

const seniorArchitectDefinitions: SeniorArchitectDefinition[] = [
	{
		key: 'afe',
		id: 'Nina_Naganohara',
		imageUrl: seniorArchitectAfeImage,
	},
	{
		key: 'qishui',
		id: 'QiShui233',
		imageUrl: seniorArchitectQishuiImage,
	},
	{
		key: 'qixuan',
		id: 'qixuanjun233',
		imageUrl: seniorArchitectQixuanImage,
	},
	{
		key: 'xxlm',
		id: 'xxlm233',
		imageUrl: seniorArchitectXxlmImage,
	},
	{
		key: 'dotkk',
		id: 'Dotkk',
		imageUrl: seniorArchitectDotkkImage,
	},
	{
		key: 'chuxia',
		id: 'Chuxia_SF',
		imageUrl: seniorArchitectChuxiaImage,
	},
]

const { t } = useI18n()

const seniorArchitects = computed<SeniorArchitectDisplayItem[]>(() =>
	seniorArchitectDefinitions.map((member) => ({
		...member,
		nickname: t(
			`content.intro.staff.seniorArchitect.members.${member.key}.nickname`,
		),
		motto: t(`content.intro.staff.seniorArchitect.members.${member.key}.motto`),
		intro: t(`content.intro.staff.seniorArchitect.members.${member.key}.intro`),
		bodyUrl: getMinecraftBodyRendererUrl(member.id),
		skinUrl: getMinecraftSkinRendererUrl(member.id),
	})),
)

const seniorArchitectGotoLabel = (index: number) =>
	t('content.intro.staff.seniorArchitect.goto', { index })
</script>
