<template>
	<div class="flex w-full flex-1 flex-col">
		<HomeHeroVideo />
		<main
			id="page-container"
			class="site-shell z-10 mx-auto flex w-full flex-1 flex-col lg:pt-4 px-6 pb-16"
			:class="[
				mainClass,
				'page-container-shell',
				{
					'page-container-shell--ready': pageContainerReady,
				},
			]"
		>
			<NuxtPage :page-key="resolvePageKey" />
		</main>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { normalizeScrollPath } from '~/utils/scroll'

const route = useRoute()
const pageContainerReady = ref(false)

const resolvePageKey = (route: RouteLocationNormalizedLoaded): string =>
	normalizeScrollPath(route.fullPath)

const mainClass = computed(() =>
	route.meta.pageContainerVariant === 'auth' ? 'pt-6' : 'pt-12',
)

onMounted(() => {
	const revealContainer = () => {
		pageContainerReady.value = true
	}

	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		revealContainer()
		return
	}

	requestAnimationFrame(() => {
		requestAnimationFrame(revealContainer)
	})
})
</script>

<style scoped>
.page-container-shell {
	opacity: 0;
	transform: translate3d(0, 18px, 0);
	transition:
		opacity 560ms cubic-bezier(0.22, 1, 0.36, 1),
		transform 560ms cubic-bezier(0.22, 1, 0.36, 1);
}

.page-container-shell--ready {
	opacity: 1;
	transform: none;
}

@media (prefers-reduced-motion: reduce) {
	.page-container-shell,
	.page-container-shell--ready {
		opacity: 1;
		transform: none;
		transition: none;
	}
}
</style>
