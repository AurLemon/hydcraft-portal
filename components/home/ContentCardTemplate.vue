<template>
	<div class="hydstart-content-card-container">
		<div v-if="data.length > 0" class="hydstart-content-card-list">
			<div
				v-for="(item, index) in data"
				:key="index"
				class="hydstart-content-card-list__item"
				:class="{ expand: expandCardContent[index] }"
				:data-index="index"
			>
				<div class="hydstart-content-card-list__background">
					<img
						v-if="resolveBackground(item.background)"
						:src="resolveBackground(item.background)"
					/>
				</div>
				<div class="hydstart-content-card-list__foreground">
					<div class="hydstart-content-card-list__wrapper">
						<div class="hydstart-content-card-list__title">
							{{ item.title }}
						</div>
						<div
							class="hydstart-content-card-list__desc"
							@click="expandCard(index)"
						>
							{{ item.description }}
						</div>
						<a :href="item.link" class="hydstart-content-card-list__link"
							>查看详情</a
						>
					</div>
				</div>
			</div>
		</div>
		<div v-else class="hydstart-content-card-list">暂时没东西哦。</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import cultureBg from '~/assets/resources/homepage/image_card_background_culture_1.png'
interface ContentCardData {
	title: string
	description: string
	background: string
	link: string
}
defineProps<{ data: ContentCardData[] }>()
const expandCardContent = ref<Record<number, boolean>>({})
const expandCard = (index: number) => {
	expandCardContent.value[index] = !expandCardContent.value[index]
}
const backgroundMap: Record<string, string> = {
	'resources/homepage/image_card_background_culture_1.png': cultureBg,
}
const resolveBackground = (background: string) =>
	backgroundMap[background] ?? ''
</script>

<style scoped>
.hydstart-content-card-container {
	height: 100%;
}
.hydstart-content-card-container .hydstart-content-card-list {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	grid-auto-flow: column;
	grid-gap: 10px;
	height: 100%;
	padding: 3px;
	overflow-x: auto;
}
.hydstart-content-card-container
	.hydstart-content-card-list
	.hydstart-content-card-list__item {
	width: 230px;
	height: 100%;
	background: var(--background-light-3);
	position: relative;
	overflow: hidden;
	margin: auto;
	border-radius: 16px;
	outline: 1.5px solid transparent;
	cursor: pointer;
	transition: outline 250ms ease;
}
.hydstart-content-card-container
	.hydstart-content-card-list
	.hydstart-content-card-list__item
	.hydstart-content-card-list__background {
	height: 100%;
}
.hydstart-content-card-container
	.hydstart-content-card-list
	.hydstart-content-card-list__item
	.hydstart-content-card-list__background
	img {
	display: block;
	object-fit: cover;
	width: 100%;
	height: 100%;
	transition: filter 500ms ease;
}
.hydstart-content-card-container
	.hydstart-content-card-list
	.hydstart-content-card-list__item
	.hydstart-content-card-list__foreground {
	position: absolute;
	inset: 0;
	padding: 15px;
	background: linear-gradient(
		0deg,
		var(--background-light-4) 5%,
		transparent 80%
	);
	transition: all 500ms ease;
}
.hydstart-content-card-container
	.hydstart-content-card-list
	.hydstart-content-card-list__item
	.hydstart-content-card-list__foreground
	.hydstart-content-card-list__wrapper {
	display: flex;
	flex-direction: column;
	height: 100%;
	position: relative;
}
.hydstart-content-card-container
	.hydstart-content-card-list
	.hydstart-content-card-list__item
	.hydstart-content-card-list__foreground
	.hydstart-content-card-list__title {
	display: flex;
	align-items: flex-end;
	flex: 1;
	font-size: 26px;
	font-weight: bold;
	margin-bottom: 4px;
	transition: flex 500ms ease;
}
.hydstart-content-card-container
	.hydstart-content-card-list
	.hydstart-content-card-list__item
	.hydstart-content-card-list__foreground
	.hydstart-content-card-list__desc {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 4;
	font-size: 14px;
	overflow: hidden;
	text-overflow: ellipsis;
	transition: color 400ms ease;
}
.hydstart-content-card-container
	.hydstart-content-card-list
	.hydstart-content-card-list__item
	.hydstart-content-card-list__foreground
	.hydstart-content-card-list__desc:hover {
	color: var(--color-primary);
}
.hydstart-content-card-container
	.hydstart-content-card-list
	.hydstart-content-card-list__item
	.hydstart-content-card-list__foreground
	.hydstart-content-card-list__link {
	position: absolute;
	right: 0;
	top: 0;
	display: block;
	font-size: 12px;
	text-align: right;
	padding: 6px 10px;
	border-radius: 16px;
	background-color: var(--background-color-primary--hover);
	box-shadow: 0 1px 2px var(--background-dark-0);
	transition: background-color 300ms ease;
}
.hydstart-content-card-container
	.hydstart-content-card-list
	.hydstart-content-card-list__item
	.hydstart-content-card-list__foreground
	.hydstart-content-card-list__link:hover {
	background-color: var(--background-color-primary--active);
}
.hydstart-content-card-container
	.hydstart-content-card-list
	.hydstart-content-card-list__item.expand
	.hydstart-content-card-list__foreground {
	backdrop-filter: blur(16px) saturate(0.75);
}
.hydstart-content-card-container
	.hydstart-content-card-list
	.hydstart-content-card-list__item.expand
	.hydstart-content-card-list__title {
	flex: 0;
}
.hydstart-content-card-container
	.hydstart-content-card-list
	.hydstart-content-card-list__item.expand
	.hydstart-content-card-list__desc {
	-webkit-line-clamp: unset;
	-webkit-box-orient: unset;
	overflow: auto;
}
.hydstart-content-card-container
	.hydstart-content-card-list
	.hydstart-content-card-list__item:hover {
	outline-color: var(--color-primary);
}
</style>
