<template>
	<ClientOnly>
		<IntroParticipationMapClient :assets-base-url="assetsBaseUrl" />
		<template #fallback>
			<div
				class="relative isolate h-104 w-full overflow-hidden rounded-xl bg-slate-900 sm:h-120"
				aria-hidden="true"
			>
				<USkeleton class="h-full w-full rounded-xl" />
			</div>
		</template>
	</ClientOnly>
</template>

<script setup lang="ts">
interface Props {
	assetsBaseUrl?: string | null
}

withDefaults(defineProps<Props>(), {
	assetsBaseUrl: null,
})
</script>
