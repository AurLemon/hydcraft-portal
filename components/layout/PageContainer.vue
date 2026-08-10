<template>
	<div class="flex w-full flex-1 flex-col">
		<HomeHeroVideo />
		<main
			id="page-container"
			class="z-10 mx-auto flex w-full flex-1 flex-col"
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
import { resolvePageContainerVariant } from '~/utils/layout/page-presentation'

const route = useRoute()
const pageContainerReady = ref(false)

const resolvePageKey = (route: RouteLocationNormalizedLoaded): string => {
	if (route.meta.pageContainerVariant === 'minecraftAccounts') {
		return normalizeScrollPath(route.path)
	}

	return normalizeScrollPath(route.fullPath)
}

const mainClass = computed(() => {
	const pageContainerVariant = resolvePageContainerVariant(route)

	if (pageContainerVariant === 'immersive') {
		return 'max-w-full p-0'
	}

	if (pageContainerVariant === 'fullBleed') {
		return 'max-w-full px-0 pt-12 pb-16 lg:pt-4'
	}

	if (pageContainerVariant === 'auth') {
		return 'site-shell px-6 pt-6 pb-16 lg:pt-4'
	}

	return 'site-shell px-6 pt-12 pb-16 lg:pt-4'
})

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
		transform 560ms cubic-bezier(0.22, 1, 0.36, 1),
		max-width 520ms cubic-bezier(0.22, 1, 0.36, 1),
		padding-top 520ms cubic-bezier(0.22, 1, 0.36, 1),
		padding-right 520ms cubic-bezier(0.22, 1, 0.36, 1),
		padding-bottom 520ms cubic-bezier(0.22, 1, 0.36, 1),
		padding-left 520ms cubic-bezier(0.22, 1, 0.36, 1);
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
