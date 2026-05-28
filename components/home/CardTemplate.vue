<template>
	<div class="hydstart-card-world-container">
		<div class="hydstart-card-world-overview-wrapper">
			<div
				class="hydstart-card-world-overview hydstart-card-world-overview--status"
			>
				<div class="hydstart-card-world-label">运行状态</div>
				<div class="hydstart-card-world-value">
					{{ serverStatus.status === 3 ? '正常' : '异常' }}
				</div>
			</div>
			<div
				class="hydstart-card-world-overview hydstart-card-world-overview--online"
			>
				<div class="hydstart-card-world-label">
					在线人数<span class="material-icons-outlined">info</span>
				</div>
				<div class="hydstart-card-world-value">
					{{ serverStatus.online
					}}<span class="weaken"> / {{ serverStatus.max }}</span>
				</div>
			</div>
			<div
				class="hydstart-card-world-overview hydstart-card-world-overview--days"
			>
				<div class="hydstart-card-world-label">
					运行天数<span class="material-icons-outlined">info</span>
				</div>
				<div class="hydstart-card-world-value">
					{{ daysAgo(serverStatus.created_time) }}
				</div>
			</div>
			<div
				class="hydstart-card-world-overview hydstart-card-world-overview--related"
			>
				<div class="hydstart-card-world-label">相关话题</div>
				<div class="hydstart-card-world-value">
					<a
						v-for="item in serverStatus.related_keywords"
						:key="item.name"
						class="weaken"
						target="_blank"
						:href="item.link"
						>{{ item.name }}</a
					><span v-if="serverStatus.related_keywords == null">无</span>
				</div>
			</div>
		</div>
		<div class="hydstart-card-world-map">
			<div class="hydstart-card-world-label">卫星地图</div>
			<iframe
				v-if="showCards.iframe"
				:src="serverStatus.dynmap"
				frameborder="0"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
export interface ServerStatus {
	created_time: string
	status: number
	online: number
	max: number
	related_keywords: { name: string; link: string }[] | null
	dynmap: string
}
defineProps<{ showCards: { iframe: boolean }; serverStatus: ServerStatus }>()
const daysAgo = (dateString: string) => dayjs().diff(dayjs(dateString), 'day')
</script>

<style scoped>
.hydstart-card-world-container {
	height: 100%;
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
}
.hydstart-card-world-container .hydstart-card-world-overview-wrapper {
	display: flex;
	gap: 3rem;
	flex-wrap: wrap;
}
.hydstart-card-world-container
	.hydstart-card-world-overview-wrapper
	.hydstart-card-world-overview {
	display: flex;
	flex-direction: column;
	gap: 4px;
}
.hydstart-card-world-container
	.hydstart-card-world-overview-wrapper
	.hydstart-card-world-overview.hydstart-card-world-overview--related {
	flex: 1;
}
.hydstart-card-world-container
	.hydstart-card-world-overview-wrapper
	.hydstart-card-world-overview.hydstart-card-world-overview--related
	.hydstart-card-world-value {
	height: 100%;
	display: flex;
	align-items: center;
	row-gap: 9px;
	column-gap: 12px;
	flex-wrap: wrap;
}
.hydstart-card-world-container
	.hydstart-card-world-overview-wrapper
	.hydstart-card-world-overview.hydstart-card-world-overview--related
	.hydstart-card-world-value
	a {
	color: var(--color-text);
	transition: opacity 250ms ease;
}
.hydstart-card-world-container
	.hydstart-card-world-overview-wrapper
	.hydstart-card-world-overview.hydstart-card-world-overview--related
	.hydstart-card-world-value
	a:hover {
	opacity: 0.6;
}
.hydstart-card-world-container
	.hydstart-card-world-overview-wrapper
	.hydstart-card-world-overview.hydstart-card-world-overview--related
	.hydstart-card-world-value
	a::before {
	content: '#';
}
.hydstart-card-world-container .hydstart-card-world-map {
	display: flex;
	flex-direction: column;
	height: 100%;
}
.hydstart-card-world-container .hydstart-card-world-label {
	display: flex;
	align-items: center;
	gap: 2px;
	color: var(--color-text--subtle);
	font-size: 16px;
	padding: 2px 4px;
}
.hydstart-card-world-container
	.hydstart-card-world-label
	.material-icons-outlined {
	display: block;
	font-size: 16px;
}
.hydstart-card-world-container .hydstart-card-world-value {
	font-size: 54px;
	line-height: 1;
}
.hydstart-card-world-container .hydstart-card-world-value .weaken {
	font-size: 28px;
}
.hydstart-card-world-container iframe {
	width: 100%;
	height: 100%;
	min-height: 300px;
	margin-top: 4px;
	border-radius: 12px;
	background-color: var(--color-surface-3);
	user-select: none;
}
</style>
