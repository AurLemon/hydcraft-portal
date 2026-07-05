<template>
	<Transition name="home-hero-video" mode="out-in" appear>
		<div
			v-if="isHeroVideoPage"
			class="home-hero-video pointer-events-none absolute top-0 left-0 right-0 z-0 h-screen min-h-180 overflow-hidden select-none mask-[linear-gradient(to_bottom,#000_0%,#000_40%,rgba(0,0,0,0.98)_52%,rgba(0,0,0,0.9)_58%,rgba(0,0,0,0.76)_64%,rgba(0,0,0,0.56)_70%,rgba(0,0,0,0.34)_77%,rgba(0,0,0,0.14)_84%,transparent_90%)]"
			aria-hidden="true"
		>
			<video
				autoplay
				muted
				loop
				playsinline
				preload="auto"
				:src="backgroundVideo"
				class="h-full w-full object-cover brightness-70"
			/>
		</div>
	</Transition>
</template>

<script setup lang="ts">
import { hasHeroVideoBackground } from '~/utils/layout/hero-video'
import { getSiteMediaUrl } from '~/utils/assets/site-media-url'

const route = useRoute()
const backgroundVideo = getSiteMediaUrl('homepage/promotional_video.webm')

const isHeroVideoPage = computed(() => hasHeroVideoBackground(route))
</script>

<style scoped>
.home-hero-video {
	perspective: 1200px;
	transform-style: preserve-3d;
}

.home-hero-video video {
	transform: rotateX(var(--home-hero-video-rotate-x, 0deg))
		rotateY(var(--home-hero-video-rotate-y, 0deg))
		translate3d(var(--home-hero-video-x, 0), var(--home-hero-video-y, 0), 0)
		scale(1.04);
	transition:
		transform 420ms ease-out,
		filter 300ms ease-out;
	transform-style: preserve-3d;
	will-change: transform;
}
</style>
