<template>
	<div class="flex w-full flex-1 flex-col">
		<HomeHeroVideo />
		<main
			id="page-container"
			class="site-shell z-10 mx-auto flex w-full flex-1 flex-col px-6 pb-16"
			:class="mainClass"
		>
			<NuxtPage :page-key="resolvePageKey" />
		</main>
	</div>
</template>

<script setup lang="ts">
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { normalizeScrollPath } from '~/utils/scroll'

const route = useRoute()

const resolvePageKey = (route: RouteLocationNormalizedLoaded): string =>
	normalizeScrollPath(route.fullPath)

const mainClass = computed(() =>
	route.meta.pageContainerVariant === 'auth' ? 'pt-6' : 'pt-12',
)
</script>
