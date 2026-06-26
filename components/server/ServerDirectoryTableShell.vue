<template>
	<div class="site-shell pb-16">
		<div>
			<div
				class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
			>
				<div>
					<div v-if="$slots.headerPrefix" class="mb-3">
						<slot name="headerPrefix" />
					</div>
					<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
						{{ title }}
					</h1>
					<p
						v-if="description"
						class="mt-2 text-sm text-slate-500 dark:text-slate-400"
					>
						{{ description }}
					</p>
				</div>
			</div>

			<div
				class="mt-8 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
			>
				<div
					v-if="$slots.filters"
					class="grid gap-3 border-b border-slate-200 p-4 dark:border-slate-800 lg:grid-cols-6"
				>
					<slot name="filters" />
				</div>

				<slot />

				<ServerDirectoryPagination
					:page="page"
					:page-size="pageSize"
					:total="total"
					:page-count="pageCount"
					@update:page="emit('update:page', $event)"
					@update:page-size="emit('update:pageSize', $event)"
				/>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
interface ServerDirectoryTableShellProps {
	title: string
	description?: string
	page: number
	pageSize: number
	total: number
	pageCount: number
}

defineProps<ServerDirectoryTableShellProps>()

const emit = defineEmits<{
	'update:page': [page: number]
	'update:pageSize': [pageSize: number]
}>()
</script>
