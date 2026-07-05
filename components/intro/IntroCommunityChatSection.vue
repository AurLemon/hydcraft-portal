<template>
	<section class="flex flex-col gap-6">
		<div class="flex justify-center">
			<h2
				class="text-center font-arkpixel text-3xl leading-tight tracking-wider text-slate-950 dark:text-slate-50 sm:text-4xl"
			>
				{{ title }}
			</h2>
		</div>

		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3 lg:gap-6">
			<IntroCommunityChatCard
				v-for="(card, index) in cards"
				:key="`intro-community-chat-${index}`"
				:card="card"
			/>
		</div>
	</section>
</template>

<script setup lang="ts">
import type {
	IntroCommunityChatCardData,
	IntroCommunityChatRoleTone,
} from '~/components/intro/community-chat'
import { getIntroStaffMemberIdentity } from '~/utils/intro/staff-members'

interface IntroCommunityChatMessageDefinition {
	memberId: string
	roleTone?: IntroCommunityChatRoleTone
}

interface IntroCommunityChatSceneDefinition {
	key: string
	messages: IntroCommunityChatMessageDefinition[]
}

const { t } = useI18n()

const title = computed(() => t('content.intro.communityChat.title'))

const sceneDefinitions: IntroCommunityChatSceneDefinition[] = [
	{
		key: 'performance',
		messages: [
			{ memberId: 'xwTeng', roleTone: 'help' },
			{ memberId: 'Aurora_Lemon', roleTone: 'admin' },
			{ memberId: 'xwTeng', roleTone: 'help' },
			{ memberId: 'CatPillager', roleTone: 'info' },
		],
	},
	{
		key: 'housing',
		messages: [
			{ memberId: 'Dotkk', roleTone: 'info' },
			{ memberId: 'Dotkk', roleTone: 'info' },
			{ memberId: 'LanYue_CN', roleTone: 'warning' },
			{ memberId: 'ColaFrog', roleTone: 'warning' },
			{ memberId: 'QiShui233', roleTone: 'warning' },
		],
	},
	{
		key: 'subgroup',
		messages: [
			{ memberId: 'Umi_Sonodaaa', roleTone: 'help' },
			{ memberId: 'LanYue_CN', roleTone: 'info' },
			{ memberId: 'TochoShizuku', roleTone: 'warning' },
			{ memberId: 'xwTeng', roleTone: 'warning' },
			{ memberId: 'Aurora_Lemon', roleTone: 'admin' },
		],
	},
	{
		key: 'airport',
		messages: [
			{ memberId: 'qixuanjun233', roleTone: 'info' },
			{ memberId: 'Dotkk', roleTone: 'info' },
			{ memberId: 'CatPillager', roleTone: 'help' },
			{ memberId: 'FisheyeArtist59', roleTone: 'warning' },
			{ memberId: 'larker_package', roleTone: 'warning' },
		],
	},
	{
		key: 'pullUp',
		messages: [
			{ memberId: 'ColaFrog', roleTone: 'help' },
			{ memberId: 'LanYue_CN', roleTone: 'warning' },
			{ memberId: 'FisheyeArtist59', roleTone: 'admin' },
		],
	},
	{
		key: 'college',
		messages: [
			{ memberId: 'Aurora_Lemon', roleTone: 'info' },
			{ memberId: 'CatPillager', roleTone: 'help' },
			{ memberId: 'qixuanjun233', roleTone: 'warning' },
			{ memberId: 'Aurora_Lemon', roleTone: 'admin' },
		],
	},
	{
		key: 'exam',
		messages: [
			{ memberId: 'Mobike', roleTone: 'help' },
			{ memberId: 'Aurora_Lemon', roleTone: 'admin' },
			{ memberId: 'LanYue_CN', roleTone: 'warning' },
			{ memberId: 'Mobike', roleTone: 'info' },
			{ memberId: 'Aurora_Lemon', roleTone: 'admin' },
		],
	},
]

const pickRandomSceneIndexes = (
	sceneCount: number,
	displayCount: number,
): number[] => {
	const indexes = Array.from({ length: sceneCount }, (_, index) => index)

	for (let index = indexes.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(Math.random() * (index + 1))
		const currentIndex = indexes[index]!
		indexes[index] = indexes[randomIndex]!
		indexes[randomIndex] = currentIndex
	}

	return indexes.slice(0, Math.min(displayCount, sceneCount))
}

const selectedSceneIndexes = useState<number[]>(
	'intro-community-chat-scene-indexes',
	() => pickRandomSceneIndexes(sceneDefinitions.length, 3),
)

const cards = computed<IntroCommunityChatCardData[]>(() =>
	selectedSceneIndexes.value
		.map((sceneIndex) => sceneDefinitions[sceneIndex])
		.filter((scene): scene is IntroCommunityChatSceneDefinition =>
			Boolean(scene),
		)
		.map((scene) => ({
			messages: scene.messages.map((message, messageIndex) => {
				const member = getIntroStaffMemberIdentity(message.memberId)

				return {
					memberId: member.id,
					displayName: `${member.nickname}：`,
					roleTone: message.roleTone,
					text: t(
						`content.intro.communityChat.cards.${scene.key}.messages.${messageIndex}`,
					),
				}
			}),
		})),
)
</script>
