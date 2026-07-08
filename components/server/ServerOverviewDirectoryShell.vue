<template>
	<section class="flex flex-col gap-2">
		<div class="flex items-center justify-between gap-3">
			<div class="mx-1 flex items-center gap-2">
				<h2 class="text-2xl text-slate-950 dark:text-white">
					{{ title }}
				</h2>
				<UBadge
					v-if="typeof count === 'number'"
					color="neutral"
					variant="soft"
					size="sm"
				>
					{{ count }}
				</UBadge>
				<slot name="titleSuffix" />
			</div>

			<UButton
				v-if="actionLabel && to"
				color="neutral"
				variant="link"
				icon="i-lucide-arrow-right"
				:to="to"
			>
				{{ actionLabel }}
			</UButton>
		</div>

		<slot />
	</section>
</template>

<script setup lang="ts">
interface Props {
	title: string
	actionLabel?: string
	to?: string
	count?: number
}

defineProps<Props>()
</script>
