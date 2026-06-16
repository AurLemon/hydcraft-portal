<template>
	<InfoCard>
		<div class="flex items-center justify-between gap-3">
			<h2 class="text-base font-semibold text-slate-950 dark:text-white">
				{{ title }}
			</h2>
			<UButton
				v-if="actionLabel"
				size="xs"
				variant="link"
				:icon="actionIcon"
				@click="$emit('action')"
			>
				{{ actionLabel }}
			</UButton>
		</div>
		<div class="mt-4 grid gap-3">
			<button
				v-for="item in items"
				:key="item.key"
				type="button"
				class="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-3 py-2 text-left text-sm transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 dark:bg-slate-900 dark:hover:bg-slate-800"
				@click="$emit('select', item.key)"
			>
				<span
					class="min-w-0 truncate font-medium text-slate-800 dark:text-slate-100"
				>
					{{ item.primary }}
				</span>
				<span
					class="flex shrink-0 items-center gap-2 text-slate-500 dark:text-slate-400"
				>
					<span v-if="item.secondary">{{ item.secondary }}</span>
					<UIcon name="i-lucide-chevron-right" class="size-4" />
				</span>
			</button>
			<div
				v-if="items.length === 0"
				class="flex flex-col items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500 dark:text-slate-400"
			>
				<UIcon :name="emptyIcon" class="size-5" />
				{{ emptyText }}
			</div>
		</div>
	</InfoCard>
</template>

<script setup lang="ts">
import InfoCard from './InfoCard.vue'

interface ListItem {
	key: string
	primary: string
	secondary?: string | null
}

defineProps<{
	title: string
	actionLabel?: string
	actionIcon?: string
	items: ListItem[]
	emptyIcon: string
	emptyText: string
}>()

defineEmits<{
	action: []
	select: [key: string]
}>()
</script>
