<template>
	<div class="site-shell mx-auto -mt-2 px-6 pb-16">
		<section class="max-w-2xl">
			<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
				{{ t('connections.title') }}
			</h1>

			<UAlert
				class="mt-6"
				color="neutral"
				icon="i-lucide-plug"
				:title="t('connections.empty.title')"
				:description="t('connections.empty.description')"
			/>
		</section>
	</div>
</template>

<script setup lang="ts">
definePageMeta({
	headerVariant: 'solid',
	middleware: 'portal-auth',
})
</script>
