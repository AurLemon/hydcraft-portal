<template>
	<div class="flex w-full flex-1 flex-col">
		<HomeHeroVideo />
		<main
			id="page-container"
			class="site-shell z-10 mx-auto flex w-full flex-1 flex-col px-6 pt-12 pb-16"
		>
			<NuxtPage :page-key="resolvePageKey" />
		</main>
	</div>
</template>

<script setup lang="ts">
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { normalizeScrollPath } from '~/utils/scroll'

const resolvePageKey = (route: RouteLocationNormalizedLoaded): string =>
	normalizeScrollPath(route.fullPath)
</script>
