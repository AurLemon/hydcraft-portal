<template>
	<div class="hydstart-main-container">
		<div class="hydstart-main-container__background">
			<img v-if="background" :src="background" alt="" />
			<video
				v-if="video"
				:src="backgroundVideo"
				autoplay
				muted
				loop
				playsinline
			/>
		</div>
		<div class="hydstart-main-container__foreground">
			<slot />
		</div>
	</div>
</template>

<script setup lang="ts">
import backgroundVideo from '~/assets/images/video_background_240726.webm'

withDefaults(
	defineProps<{
		background?: string
		video?: boolean
	}>(),
	{
		background: undefined,
		video: false,
	},
)
</script>

<style scoped>
.hydstart-main-container {
	height: 100%;
}

.hydstart-main-container__background {
	display: flex;
	justify-content: center;
	align-items: flex-end;
	width: 100%;
	height: 100%;
	position: relative;
	user-select: none;
}
.hydstart-main-container__background img {
	display: block;
	width: 100%;
	height: 75%;
	min-height: 600px;
	max-height: 720px;
	position: relative;
	z-index: 10;
	filter: opacity(1) grayscale(0) contrast(0) brightness(0) invert(1);
	object-fit: cover;
	object-position: top;
	transition: filter 3000ms ease;
}
.hydstart-main-container__background video {
	width: 100%;
	height: 100%;
	object-fit: cover;
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 8;
	filter: opacity(0.25) brightness(1.05) saturate(2);
	transition: all 150ms ease;
}

.hydstart-main-container__foreground {
	display: flex;
	flex-direction: column;
	align-items: center;
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 10;
	padding: 60px 6.5rem 0 6.5rem;
	overflow: hidden;
}
</style>
