<template>
	<MainContainer :video="true">
		<div class="hydstart-home-wrapper">
			<div class="hydstart-home">
				<div v-show="!showContentCard" class="hydstart-home-main">
					<div class="hydstart-home-text">
						<div class="hydstart-home-text__title">
							……👏你好！这里是<span class="red">氢气</span
							><span class="blue">工艺</span>。
						</div>
						<div class="hydstart-home-text__subtitle">
							我们是个 MC
							服务器社区，我们凭借共同的爱好走到了一起，这有交通爱好者，科技爱好者，独立开发者……
							总之，我们什么都有。❤
						</div>
					</div>
					<div class="hydstart-home-buttons">
						<button class="hydstart-home-button main">
							来都来了，点我看氢气服主写的の小作文
						</button>
						<div class="hydstart-home-subbutton overview">
							<span>🥺我还是想自己看看</span>
						</div>
						<div class="hydstart-home-subbutton join">
							<span>😋只想进服快给群号</span>
						</div>
					</div>
				</div>
				<transition name="fade"
					><div v-show="showContentCard" class="hydstart-home-content-card">
						<ContentCardContainer
							:show="showCards.culture.show"
							@close-card="closeCard('content-card', 'culture')"
							><template #title>Culture</template
							><ContentCardTemplate
								:data="showCards.culture.content" /></ContentCardContainer
						><ContentCardContainer
							:show="showCards.cities.show"
							@close-card="closeCard('content-card', 'cities')"
							><template #title>Cities</template
							><ContentCardTemplate
								:data="showCards.cities.content" /></ContentCardContainer
						><ContentCardContainer
							:show="showCards.railway.show"
							@close-card="closeCard('content-card', 'railway')"
							><template #title>Railway</template
							><ContentCardTemplate
								:data="showCards.railway.content" /></ContentCardContainer
						><ContentCardContainer
							:show="showCards.player.show"
							@close-card="closeCard('content-card', 'player')"
							><template #title>Player</template
							><ContentCardTemplate :data="showCards.player.content"
						/></ContentCardContainer></div
				></transition>
			</div>
			<div class="hydstart-home-info">
				<HomeCards
					:active="showContentCard"
					:show-cards="showCards"
					@dialog="executeDialog"
				/>
				<div class="hydstart-home-belong">
					隶属于<span class="hydstart-home-belong__hydrlab" translate="no"
						><img src="~/assets/images/logo_Hydrlab.png" />Hydrlab Studio</span
					>
				</div>
				<div class="hydstart-home-dialog">
					<CardContainer
						v-show="showCards.world.helium.show"
						@close-card="closeCard('card', 'helium')"
						><template #title
							><div class="hydstart-card-world-header">
								<div class="hydstart-card-world-header__status" />
								<div class="hydstart-card-world-header__title">
									六周目
									<div class="hydstart-card-world-header__codename">Helium</div>
								</div>
							</div></template
						><CardTemplate
							:show-cards="showCards.world.helium"
							:server-status="serverStatus.helium" /></CardContainer
					><CardContainer
						v-show="showCards.world.nitrogen.show"
						@close-card="closeCard('card', 'nitrogen')"
						><template #title
							><div class="hydstart-card-world-header">
								<div class="hydstart-card-world-header__status" />
								<div class="hydstart-card-world-header__title">
									七周目
									<div class="hydstart-card-world-header__codename">
										Nitrogen
									</div>
								</div>
							</div></template
						><CardTemplate
							:show-cards="showCards.world.nitrogen"
							:server-status="serverStatus.nitrogen"
					/></CardContainer>
				</div>
			</div>
		</div>
	</MainContainer>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { ServerStatus } from '~/components/home/CardTemplate.vue'

type DialogType = 'card' | 'content-card'
interface DialogPayload {
	type: DialogType
	index: string
}
interface ContentItem {
	title: string
	description: string
	background: string
	link: string
}
interface ContentShow {
	show: boolean
	content: ContentItem[]
}
interface WorldShow {
	show: boolean
	iframe: boolean
}
interface ShowCards {
	world: { helium: WorldShow; nitrogen: WorldShow }
	culture: ContentShow
	cities: ContentShow
	railway: ContentShow
	player: ContentShow
}

const showContentCard = ref(false)
const content: ContentItem[] = [
	{
		title: 'OMEC',
		description:
			'OMEC（Oxygen Minecraft Entertainment Competition，氧气游戏竞赛）是由 Oxygen 团队负责的游戏竞赛，由氢运会转隶而成。2024年8月举办了第一届 OMEC，即 OMEC 2024。',
		background: 'images/home/image_card_background_culture_1.png',
		link: 'https://wiki.hydcraft.cn/氧气工作室',
	},
	{
		title: 'HCTV',
		description:
			'OMEC（Oxygen Minecraft Entertainment Competition，氧气游戏竞赛）是由 Oxygen 团队负责的游戏竞赛，由氢运会转隶而成。2024年8月举办了第一届 OMEC，即 OMEC 2024。',
		background: 'images/home/image_card_background_culture_1.png',
		link: 'https://wiki.hydcraft.cn/HCTV',
	},
	{
		title: 'HCTV',
		description:
			'OMEC（Oxygen Minecraft Entertainment Competition，氧气游戏竞赛）是由 Oxygen 团队负责的游戏竞赛，由氢运会转隶而成。2024年8月举办了第一届 OMEC，即 OMEC 2024。',
		background: 'images/home/image_card_background_culture_1.png',
		link: 'https://wiki.hydcraft.cn/HCTV',
	},
]
const showCards = reactive<ShowCards>({
	world: {
		helium: { show: false, iframe: false },
		nitrogen: { show: false, iframe: false },
	},
	culture: { show: false, content },
	cities: { show: false, content },
	railway: { show: false, content },
	player: { show: false, content },
})
const serverStatus: Record<'helium' | 'nitrogen', ServerStatus> = {
	helium: {
		created_time: '2022-02-17',
		status: 3,
		online: 0,
		max: 20,
		related_keywords: [
			{ name: '南屿', link: 'https://wiki.hydcraft.cn/南屿都' },
			{ name: '宜兰', link: 'https://wiki.hydcraft.cn/宜兰' },
			{ name: '赫尔海姆', link: 'https://wiki.hydcraft.cn/赫尔海姆' },
			{ name: '北港', link: 'https://wiki.hydcraft.cn/北港' },
		],
		dynmap: 'https://map.helium.hydcraft.cn',
	},
	nitrogen: {
		created_time: '2023-08-07',
		status: 3,
		online: 0,
		max: 20,
		related_keywords: [
			{ name: '新屿', link: 'https://wiki.hydcraft.cn/新屿都' },
			{ name: '沁京', link: 'https://wiki.hydcraft.cn/沁京都' },
			{ name: '欧文', link: 'https://wiki.hydcraft.cn/欧文州' },
			{ name: '蒲田', link: 'https://wiki.hydcraft.cn/蒲田县' },
		],
		dynmap: 'https://map.nitrogen.hydcraft.cn',
	},
}
const resetShows = (
	obj: Record<string, unknown> = showCards as unknown as Record<
		string,
		unknown
	>,
) => {
	Object.keys(obj).forEach((key) => {
		const value = obj[key]
		if (typeof value === 'object' && value !== null)
			resetShows(value as Record<string, unknown>)
		else if (key === 'show' && value === true) obj[key] = false
	})
}
const executeDialog = (data: DialogPayload) =>
	setTimeout(() => {
		resetShows()
		if (data.type === 'card') {
			showContentCard.value = false
			if (data.index === 'helium') showCards.world.helium.show = true
			if (data.index === 'nitrogen') showCards.world.nitrogen.show = true
		} else {
			showContentCard.value = true
			if (data.index in showCards && data.index !== 'world')
				(
					showCards[data.index as keyof Omit<ShowCards, 'world'>] as ContentShow
				).show = true
		}
	}, 120)
const closeCard = (type: DialogType, index: string) => {
	resetShows()
	if (type === 'content-card') showContentCard.value = false
	if (index === 'helium') showCards.world.helium.show = false
	if (index === 'nitrogen') showCards.world.nitrogen.show = false
}
const updateDynmap = (world: 'helium' | 'nitrogen', newVal: boolean) => {
	if (newVal)
		setTimeout(() => {
			showCards.world[world].iframe = true
		}, 500)
	else showCards.world[world].iframe = false
}
watch(
	() => showCards.world.helium.show,
	(val) => updateDynmap('helium', val),
)
watch(
	() => showCards.world.nitrogen.show,
	(val) => updateDynmap('nitrogen', val),
)
</script>

<style scoped>
.hydstart-home-wrapper {
	display: flex;
	flex-direction: column;
	height: 100%;
}
.hydstart-home-wrapper .hydstart-home {
	width: 100%;
	margin: auto;
}
.hydstart-home-wrapper .hydstart-home .hydstart-home-main {
	display: flex;
	flex-direction: column;
	align-items: center;
}
.hydstart-home-wrapper .hydstart-home .hydstart-home-content-card::before {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 35;
	background-color: var(--background-light-1);
	backdrop-filter: blur(48px);
	transition: all 300ms ease;
}
.hydstart-home-wrapper
	.hydstart-home
	.hydstart-home-content-card.fade-enter-active,
.hydstart-home-wrapper
	.hydstart-home
	.hydstart-home-content-card.fade-leave-active {
	transition: all 300ms ease;
}
.hydstart-home-wrapper
	.hydstart-home
	.hydstart-home-content-card.fade-enter-active::before,
.hydstart-home-wrapper
	.hydstart-home
	.hydstart-home-content-card.fade-leave-active::before {
	opacity: 0;
}
.hydstart-home-wrapper .hydstart-home .hydstart-home-content-card.fade-enter,
.hydstart-home-wrapper
	.hydstart-home
	.hydstart-home-content-card.fade-leave-active {
	opacity: 0;
}
.hydstart-home-wrapper .hydstart-home-info {
	margin: 1rem auto 6rem;
}

.hydstart-home-text {
	display: flex;
	align-items: center;
	flex-direction: column;
	gap: 5px;
}
.hydstart-home-text .hydstart-home-text__title {
	text-align: center;
	font-size: 60px;
}
.hydstart-home-text .hydstart-home-text__title span.red,
.hydstart-home-text .hydstart-home-text__title span.blue {
	font-weight: 600;
}
.hydstart-home-text .hydstart-home-text__title span.red {
	color: var(--color-hydcraft-red);
}
.hydstart-home-text .hydstart-home-text__title span.blue {
	color: var(--color-hydcraft-blue);
}
.hydstart-home-text .hydstart-home-text__subtitle {
	color: var(--color-text--subtle);
	font-size: 20px;
	text-align: center;
	max-width: 700px;
}

.hydstart-home-buttons {
	display: flex;
	justify-content: center;
	flex-wrap: wrap;
	row-gap: 8px;
	column-gap: 12px;
	width: 550px;
	margin-top: 2rem;
}
.hydstart-home-buttons .hydstart-home-button {
	color: var(--color-surface-0);
	font-size: 18px;
	background-color: var(--color-primary);
	border: none;
	outline: none;
	border-radius: 16px;
	padding: 6px 20px;
	flex: 1 1 100%;
	cursor: pointer;
	transition: all 150ms ease;
}
.hydstart-home-buttons .hydstart-home-button:hover {
	background-color: var(--color-primary--hover);
}
.hydstart-home-buttons .hydstart-home-button:active {
	background-color: var(--color-primary--active);
	border-radius: 24px;
	transform: scale(0.98);
}
.hydstart-home-buttons .hydstart-home-subbutton {
	color: var(--color-text--subtle);
	font-size: 14px;
	position: relative;
	user-select: none;
	cursor: pointer;
	transition: all 150ms ease;
}
.hydstart-home-buttons .hydstart-home-subbutton:hover::after {
	opacity: 1;
}
.hydstart-home-buttons .hydstart-home-subbutton:active {
	transform: scale(0.98);
}
.hydstart-home-buttons .hydstart-home-subbutton:active::after {
	opacity: 1;
}
.hydstart-home-buttons .hydstart-home-subbutton::after {
	content: '';
	background-color: var(--background-dark-0);
	border-radius: 12px;
	position: absolute;
	z-index: 8;
	top: -4px;
	left: -4px;
	right: -4px;
	bottom: -4px;
	opacity: 0;
	transition: all 150ms ease;
}
.hydstart-home-buttons .hydstart-home-subbutton span {
	position: relative;
	z-index: 10;
}

.hydstart-home-belong {
	color: var(--color-text--subtle);
	display: flex;
	justify-content: center;
	align-items: center;
	font-size: 18px;
	letter-spacing: 0.125rem;
	margin-top: 2rem;
	position: relative;
	z-index: 60;
}
.hydstart-home-belong .hydstart-home-belong__hydrlab {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	color: var(--color-text);
	font-size: 20px;
	font-family: 'Site Wordmark Font';
	text-transform: uppercase;
	letter-spacing: 0;
	margin-left: 10px;
	user-select: none;
}
.hydstart-home-belong .hydstart-home-belong__hydrlab img {
	display: block;
	width: 22px;
	height: 22px;
}

.hydstart-home-dialog .hydstart-card-world-header {
	display: flex;
	align-items: center;
	gap: 10px;
}
.hydstart-home-dialog
	.hydstart-card-world-header
	.hydstart-card-world-header__status {
	width: 14px;
	height: 14px;
	background-color: var(--home-background-status-unknown);
	border-radius: 50%;
}
.hydstart-home-dialog
	.hydstart-card-world-header
	.hydstart-card-world-header__title {
	display: flex;
	align-items: baseline;
	gap: 12px;
	font-size: 28px;
	font-weight: 600;
}
.hydstart-home-dialog
	.hydstart-card-world-header
	.hydstart-card-world-header__codename {
	color: var(--color-text--weaken);
	font-size: 22px;
	font-family: 'Site Wordmark Font';
	font-weight: normal;
}
</style>
