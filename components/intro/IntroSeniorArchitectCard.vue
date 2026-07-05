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
import { getSiteMediaUrl } from '~/utils/assets/site-media-url'

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
		imageUrl: getSiteMediaUrl(
			'minecraft-gallery/season_7/jianghu_screenshots_1.webp',
		),
	},
	{
		key: 'qishui',
		id: 'QiShui233',
		imageUrl: getSiteMediaUrl(
			'minecraft-gallery/season_7/qinjing_screenshots_1.webp',
		),
	},
	{
		key: 'qixuan',
		id: 'qixuanjun233',
		imageUrl: getSiteMediaUrl(
			'minecraft-gallery/season_7/guangyang_screenshots_6.webp',
		),
	},
	{
		key: 'xxlm',
		id: 'xxlm233',
		imageUrl: getSiteMediaUrl(
			"minecraft-gallery/season_7/bei'an_screenshots_5.webp",
		),
	},
	{
		key: 'dotkk',
		id: 'Dotkk',
		imageUrl: getSiteMediaUrl(
			'minecraft-gallery/season_7/guangyang_screenshots_2.webp',
		),
	},
	{
		key: 'chuxia',
		id: 'Chuxia_SF',
		imageUrl: getSiteMediaUrl(
			'minecraft-gallery/season_7/jiuxiang_screenshots_1.webp',
		),
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
