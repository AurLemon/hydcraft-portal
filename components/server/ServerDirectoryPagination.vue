<template>
	<div
		class="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-800 md:flex-row md:items-center md:justify-between"
	>
		<div class="text-slate-500 dark:text-slate-400">
			{{
				t('content.serverOverview.directories.pagination.summary', {
					page,
					pageCount,
					total,
				})
			}}
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<UButton
				type="button"
				color="neutral"
				variant="ghost"
				size="xs"
				icon="i-lucide-chevrons-left"
				:disabled="page <= 1"
				:aria-label="t('content.serverOverview.directories.pagination.first')"
				@click="goToPage(1)"
			/>
			<UButton
				type="button"
				color="neutral"
				variant="ghost"
				size="xs"
				icon="i-lucide-chevron-left"
				:disabled="page <= 1"
				:aria-label="
					t('content.serverOverview.directories.pagination.previous')
				"
				@click="goToPage(page - 1)"
			/>
			<UInput
				v-model.number="pageInput"
				type="number"
				size="xs"
				class="w-20"
				:min="1"
				:max="pageCount"
				@keyup.enter="goToPage(pageInput)"
				@blur="goToPage(pageInput)"
			/>
			<UButton
				type="button"
				color="neutral"
				variant="ghost"
				size="xs"
				icon="i-lucide-chevron-right"
				:disabled="page >= pageCount"
				:aria-label="t('content.serverOverview.directories.pagination.next')"
				@click="goToPage(page + 1)"
			/>
			<UButton
				type="button"
				color="neutral"
				variant="ghost"
				size="xs"
				icon="i-lucide-chevrons-right"
				:disabled="page >= pageCount"
				:aria-label="t('content.serverOverview.directories.pagination.last')"
				@click="goToPage(pageCount)"
			/>
			<USelect
				:model-value="pageSize"
				size="xs"
				class="w-24"
				:items="pageSizeItems"
				@update:model-value="emit('update:pageSize', Number($event))"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
interface ServerDirectoryPaginationProps {
	page: number
	pageSize: number
	total: number
	pageCount: number
}

const props = defineProps<ServerDirectoryPaginationProps>()
const emit = defineEmits<{
	'update:page': [page: number]
	'update:pageSize': [pageSize: number]
}>()

const { t } = useI18n()
const pageInput = ref(props.page)
const pageSizeItems = computed(() => [
	{
		label: t('content.serverOverview.directories.pagination.pageSize', {
			size: 10,
		}),
		value: 10,
	},
	{
		label: t('content.serverOverview.directories.pagination.pageSize', {
			size: 20,
		}),
		value: 20,
	},
	{
		label: t('content.serverOverview.directories.pagination.pageSize', {
			size: 50,
		}),
		value: 50,
	},
	{
		label: t('content.serverOverview.directories.pagination.pageSize', {
			size: 100,
		}),
		value: 100,
	},
])

watch(
	() => props.page,
	(value) => {
		pageInput.value = value
	},
)

const goToPage = (value: number): void => {
	const nextPage = Math.min(Math.max(Number(value) || 1, 1), props.pageCount)
	emit('update:page', nextPage)
}
</script>
