<template>
	<UApp>
		<div id="app">
			<PageHeader />
			<main>
				<NuxtPage />
			</main>
			<PageFooter :show-main="true" />
		</div>
	</UApp>
</template>

<script setup lang="ts">
import PageFooter from '~/layouts/PageFooter.vue'
import PageHeader from '~/layouts/PageHeader.vue'
</script>

<style>
#app {
	height: 100vh;
}

main {
	height: 100%;
}
</style>
