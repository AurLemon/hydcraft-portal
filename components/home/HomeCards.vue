<template>
	<div class="hydstart-home-cards" :class="{ active }">
		<div
			class="hydstart-home-card hydstart-home-card-world helium"
			@click="showCard('card', 'helium')"
		>
			<div class="hydstart-home-card__background">
				<img
					src="~/assets/resources/homepage/image_card_background_helium_1.png"
				/>
			</div>
			<div class="hydstart-home-card__foreground">
				<div class="hydstart-home-card-world__title hydstart-home-card__title">
					Helium<span class="hydstart-home-card-world__status" />
				</div>
				<div class="hydstart-home-card-world__wordmark">6<span>th</span></div>
			</div>
		</div>
		<div
			class="hydstart-home-card hydstart-home-card-world nitrogen"
			@click="showCard('card', 'nitrogen')"
		>
			<div class="hydstart-home-card__background">
				<img
					src="~/assets/resources/homepage/image_card_background_nitrogen_2.png"
				/>
			</div>
			<div class="hydstart-home-card__foreground">
				<div class="hydstart-home-card-world__title hydstart-home-card__title">
					Nitrogen<span class="hydstart-home-card-world__status" />
				</div>
				<div class="hydstart-home-card-world__wordmark">7<span>th</span></div>
			</div>
		</div>
		<div
			class="hydstart-home-card hydstart-home-card-culture culture"
			@click="showCard('content-card', 'culture')"
		>
			<div class="hydstart-home-card__background">
				<img
					src="~/assets/resources/homepage/image_card_background_culture_1.png"
				/>
			</div>
			<div class="hydstart-home-card__foreground">
				<div class="hydstart-home-card__title">Culture</div>
			</div>
		</div>
		<div
			class="hydstart-home-card hydstart-home-card-develop cities"
			@click="showCard('content-card', 'cities')"
		>
			<div class="hydstart-home-card__background">
				<img
					src="~/assets/resources/homepage/image_home_background_240730.webp"
				/>
			</div>
			<div class="hydstart-home-card__foreground">
				<div class="hydstart-home-card__title">Cities</div>
			</div>
		</div>
		<div
			class="hydstart-home-card hydstart-home-card-develop railway"
			@click="showCard('content-card', 'railway')"
		>
			<div class="hydstart-home-card__background">
				<img
					src="~/assets/resources/homepage/image_card_background_railway_1.png"
				/>
			</div>
			<div class="hydstart-home-card__foreground">
				<div class="hydstart-home-card__title">Railway</div>
			</div>
		</div>
		<div
			class="hydstart-home-card hydstart-home-card-culture player"
			@click="loadSkinViewer"
		>
			<div class="hydstart-home-card__background">
				<canvas id="skin-container" />
			</div>
			<div class="hydstart-home-card__foreground">
				<div class="hydstart-home-card__title">Play<span>er</span></div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { SkinViewer } from 'skinview3d'

interface DialogPayload {
	type: 'card' | 'content-card'
	index: string
}
interface ShowCards {
	player: { show: boolean }
}

withDefaults(defineProps<{ active?: boolean; showCards: ShowCards }>(), {
	active: false,
})
const emit = defineEmits<{ dialog: [data: DialogPayload] }>()

const skinViewer = ref<SkinViewer | null>(null)
const skinBaseApi = 'https://minotar.net/skin/'
const skinList = [
	'Aurora_Lemon',
	'Xiao_awa_',
	'Complex_Colors',
	'TochoShizuku',
	'Arknights_Chen_',
	'Dasmord',
	'CN_DaJiChi',
	'larker_package',
	'QiShui233',
]
const skinListCurrentIndex = ref(0)
let skinListTimeoutId: ReturnType<typeof setTimeout> | null = null
const skinListDuration = 8000

const initSkinViewer = () => {
	const canvas = document.getElementById(
		'skin-container',
	) as HTMLCanvasElement | null
	if (!canvas) return
	skinViewer.value = new SkinViewer({
		canvas,
		width: 100,
		height: 170,
		skin: skinBaseApi + skinList[skinListCurrentIndex.value],
	})
	skinViewer.value.fov = 60
	skinViewer.value.zoom = 1
	skinViewer.value.autoRotate = true
}

const clearSkinViewerTimeout = () => {
	if (skinListTimeoutId) clearTimeout(skinListTimeoutId)
	skinListTimeoutId = null
}

const autoChangeSkinViewer = () => {
	skinListTimeoutId = setTimeout(() => {
		skinListCurrentIndex.value =
			(skinListCurrentIndex.value + 1) % skinList.length
		void skinViewer.value?.loadSkin(
			skinBaseApi + skinList[skinListCurrentIndex.value],
		)
		autoChangeSkinViewer()
	}, skinListDuration)
}

const changeSkinViewer = () => {
	clearSkinViewerTimeout()
	skinListCurrentIndex.value =
		(skinListCurrentIndex.value + 1) % skinList.length
	void skinViewer.value?.loadSkin(
		skinBaseApi + skinList[skinListCurrentIndex.value],
	)
	autoChangeSkinViewer()
}

const showCard = (type: DialogPayload['type'], index: string) =>
	emit('dialog', { type, index })
const loadSkinViewer = () => {
	showCard('content-card', 'player')
	changeSkinViewer()
}

onMounted(() => {
	initSkinViewer()
	autoChangeSkinViewer()
})
onBeforeUnmount(() => {
	clearSkinViewerTimeout()
	skinViewer.value?.dispose()
})
</script>

<style scoped>
.hydstart-home-cards {
	display: grid;
	grid-template-rows: repeat(2, 1fr);
	grid-auto-flow: column;
	grid-gap: 10px;
	margin-top: auto;
	height: 170px;
	position: relative;
	z-index: 60;
	transform-origin: bottom center;
	transition: transform 250ms ease;
}
.hydstart-home-cards.active {
	transform: scale(0.8);
}
.hydstart-home-cards.active .hydstart-home-card {
	background-color: var(--background-color-primary--active);
}
.hydstart-home-cards.active .hydstart-home-card:hover {
	width: unset;
}
.hydstart-home-cards .hydstart-home-card {
	border-radius: 16px;
	background-color: var(--color-surface-0);
	outline: 2px solid transparent;
	box-shadow: 0 1px 4px var(--background-dark-0);
	transition: all 250ms ease;
	overflow: hidden;
	position: relative;
	cursor: pointer;
	user-select: none;
}
.hydstart-home-cards .hydstart-home-card .hydstart-home-card__background,
.hydstart-home-cards .hydstart-home-card .hydstart-home-card__foreground {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
}
.hydstart-home-cards .hydstart-home-card .hydstart-home-card__background {
	z-index: 20;
}
.hydstart-home-cards .hydstart-home-card .hydstart-home-card__background img {
	display: block;
	width: 120%;
	height: 100%;
	object-fit: cover;
	filter: brightness(0.85) saturate(0.95);
	transition: all 250ms ease;
	transition-delay: 50ms;
}
.hydstart-home-cards .hydstart-home-card .hydstart-home-card__foreground {
	display: flex;
	justify-content: space-between;
	flex-direction: column;
	padding: 15px;
	background: linear-gradient(
		220deg,
		transparent 50%,
		var(--background-light-2) 110%
	);
	z-index: 30;
}
.hydstart-home-cards .hydstart-home-card .hydstart-home-card__title {
	font-size: 22px;
	font-family: 'Site Wordmark Font';
	transition: all 250ms ease;
	transform: translateX(2px);
}
.hydstart-home-cards .hydstart-home-card:hover {
	border-radius: 24px;
	outline-color: var(--color-primary);
	transform: scale(1.04);
}
.hydstart-home-cards
	.hydstart-home-card:hover
	.hydstart-home-card__background
	img {
	filter: brightness(1) saturate(1.5);
	transform: translateX(-20px) scale(1.03);
	transition-duration: 500ms;
	transition-delay: 80ms;
}
.hydstart-home-cards .hydstart-home-card:hover .hydstart-home-card__title {
	font-weight: 900;
	transform: translateX(0);
}
.hydstart-home-cards .hydstart-home-card:active {
	transform: scale(0.99);
	transition-duration: 80ms;
}
.hydstart-home-cards .hydstart-home-card.hydstart-home-card-world {
	grid-row: 1 / span 2;
	width: 200px;
}
.hydstart-home-cards
	.hydstart-home-card.hydstart-home-card-world
	.hydstart-home-card-world__title {
	display: flex;
	align-items: baseline;
	gap: 6px;
	font-size: 22px;
	font-family: 'Site Wordmark Font';
}
.hydstart-home-cards
	.hydstart-home-card.hydstart-home-card-world
	.hydstart-home-card-world__status {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background-color: var(--home-background-status-unknown);
}
.hydstart-home-cards
	.hydstart-home-card.hydstart-home-card-world
	.hydstart-home-card-world__wordmark {
	color: var(--background-light-4);
	font-size: 54px;
	font-weight: 700;
	font-family: 'MiSans Latin';
	text-shadow: 0 0 4px var(--background-dark-1);
	line-height: 1;
	position: relative;
}
.hydstart-home-cards
	.hydstart-home-card.hydstart-home-card-world
	.hydstart-home-card-world__wordmark
	span {
	font-size: 20px;
}
.hydstart-home-cards .hydstart-home-card.hydstart-home-card-world:hover {
	width: 240px;
}
.hydstart-home-cards .hydstart-home-card.culture,
.hydstart-home-cards .hydstart-home-card.cities {
	width: 150px;
	grid-row: 1;
	grid-column: 3;
}
.hydstart-home-cards
	.hydstart-home-card.culture
	.hydstart-home-card__foreground,
.hydstart-home-cards
	.hydstart-home-card.cities
	.hydstart-home-card__foreground {
	background: linear-gradient(
		290deg,
		transparent 20%,
		var(--background-light-3) 90%
	);
	transition: all 250ms ease;
	transition-delay: 50ms;
}
.hydstart-home-cards
	.hydstart-home-card.culture:hover
	.hydstart-home-card__title,
.hydstart-home-cards
	.hydstart-home-card.cities:hover
	.hydstart-home-card__title {
	transform: translateX(0);
}
.hydstart-home-cards .hydstart-home-card.cities {
	grid-row: 2;
	grid-column: 3;
}
.hydstart-home-cards
	.hydstart-home-card.railway
	.hydstart-home-card__foreground,
.hydstart-home-cards
	.hydstart-home-card.player
	.hydstart-home-card__foreground {
	transition: all 250ms ease;
	transition-delay: 50ms;
}
.hydstart-home-cards .hydstart-home-card.railway {
	width: 140px;
	grid-row: 1 / span 2;
	grid-column: 4;
}
.hydstart-home-cards
	.hydstart-home-card.railway
	.hydstart-home-card__background
	img {
	object-position: left;
}
.hydstart-home-cards .hydstart-home-card.railway:hover {
	width: 180px;
}
.hydstart-home-cards .hydstart-home-card.player {
	width: 100px;
	grid-row: 1 / span 2;
	grid-column: 5;
}
.hydstart-home-cards
	.hydstart-home-card.player
	.hydstart-home-card__foreground {
	background: unset;
}
.hydstart-home-cards .hydstart-home-card.player span {
	display: block;
	color: var(--color-primary);
	font-size: 18px;
}
.hydstart-home-cards .hydstart-home-card.player canvas {
	transform: rotate(-25deg) translate(0, 60px);
	transition: transform 250ms ease;
}
.hydstart-home-cards .hydstart-home-card.player:hover {
	width: 120px;
}
.hydstart-home-cards .hydstart-home-card.player:hover canvas {
	transform: rotate(-25deg) translate(10px, 60px) scale(1.05);
}
</style>
