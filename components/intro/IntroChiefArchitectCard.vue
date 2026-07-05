<template>
	<IntroArchitectCarouselCard
		:title="t('content.intro.staff.chiefArchitect.title')"
		:subtitle="t('content.intro.staff.chiefArchitect.subtitle')"
		:prev-label="t('content.intro.staff.chiefArchitect.prev')"
		:next-label="t('content.intro.staff.chiefArchitect.next')"
		:goto-label="chiefArchitectGotoLabel"
		:members="chiefArchitects"
		title-class="intro-chief-architect-title font-arkpixel text-lg leading-none tracking-wide"
		subtitle-class="text-xs text-white"
	/>
</template>

<script setup lang="ts">
import {
	getMinecraftBodyRendererUrl,
	getMinecraftSkinRendererUrl,
} from '~/utils/minecraft/body-renderer'
import { getSiteMediaUrl } from '~/utils/assets/site-media-url'

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
		imageUrl: getSiteMediaUrl(
			'minecraft-gallery/season_7/owen_screenshots_1.webp',
		),
	},
	{
		key: 'xw',
		id: 'xwTeng',
		imageUrl: getSiteMediaUrl(
			'minecraft-gallery/misc/marclen_screenshots_1.webp',
		),
	},
	{
		key: 'fisheye',
		id: 'FisheyeArtist59',
		imageUrl: getSiteMediaUrl(
			'minecraft-gallery/season_7/gtr_screenshots_1.webp',
		),
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

<style scoped>
:deep(.intro-chief-architect-title) {
	display: inline-block;
	background-image:
		linear-gradient(
			90deg,
			rgb(255 248 222) 0%,
			rgb(248 207 96) 22%,
			rgb(232 170 48) 44%,
			rgb(255 232 148) 62%,
			rgb(214 146 34) 100%
		),
		linear-gradient(
			112deg,
			transparent 0%,
			transparent 40%,
			rgb(255 245 214 / 0.18) 45%,
			rgb(255 250 236 / 0.98) 48%,
			rgb(255 255 255 / 1) 50%,
			rgb(255 246 214 / 0.98) 52%,
			rgb(255 228 140 / 0.7) 55%,
			rgb(246 190 62 / 0.18) 59%,
			transparent 64%,
			transparent 100%
		);
	background-size:
		100% 100%,
		220% 100%;
	background-position:
		0% 50%,
		-155% 50%;
	background-repeat: no-repeat;
	-webkit-background-clip: text;
	background-clip: text;
	color: transparent;
	-webkit-text-fill-color: transparent;
	filter: drop-shadow(0 0 18px rgb(255 235 166 / 0.42))
		drop-shadow(0 0 42px rgb(242 188 68 / 0.34));
	text-shadow:
		0 1px 0 rgb(255 255 244 / 0.92),
		0 0 28px rgb(255 235 154 / 0.38),
		0 0 48px rgb(245 190 62 / 0.36),
		0 0 84px rgb(186 112 22 / 0.28);
	animation: intro-chief-architect-radial-sheen 2s
		cubic-bezier(0.22, 1, 0.36, 1) infinite;
}

@keyframes intro-chief-architect-radial-sheen {
	0% {
		background-position:
			0% 50%,
			-155% 50%;
	}

	12% {
		background-position:
			0% 50%,
			-155% 50%;
	}

	38% {
		background-position:
			0% 50%,
			-24% 50%;
	}

	50% {
		background-position:
			0% 50%,
			18% 50%;
	}

	62% {
		background-position:
			0% 50%,
			92% 50%;
	}

	100% {
		background-position:
			0% 50%,
			138% 50%;
	}
}
</style>
