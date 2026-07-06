<template>
	<UModal v-model:open="open" :ui="{ content: 'max-w-2xl' }">
		<template #content>
			<div class="p-5">
				<div class="flex items-start justify-between gap-4">
					<div class="min-w-0">
						<p
							v-if="eyebrow"
							class="truncate text-xs font-medium text-slate-500 dark:text-slate-400"
						>
							{{ eyebrow }}
						</p>
						<h2
							class="mt-1 truncate text-xl font-semibold text-slate-950 dark:text-white"
						>
							{{ title ?? t('admin.valueModal.title') }}
						</h2>
					</div>
					<UButton
						icon="i-lucide-x"
						color="neutral"
						variant="ghost"
						:aria-label="t('admin.actions.cancel')"
						@click="open = false"
					/>
				</div>

				<div class="mt-4 flex gap-2">
					<UButton
						size="xs"
						:color="viewMode === 'parsed' ? 'primary' : 'neutral'"
						:variant="viewMode === 'parsed' ? 'solid' : 'soft'"
						@click="viewMode = 'parsed'"
					>
						{{ t('admin.valueModal.parsed') }}
					</UButton>
					<UButton
						size="xs"
						:color="viewMode === 'raw' ? 'primary' : 'neutral'"
						:variant="viewMode === 'raw' ? 'solid' : 'soft'"
						@click="viewMode = 'raw'"
					>
						{{ t('admin.valueModal.raw') }}
					</UButton>
				</div>

				<div
					class="mt-4 max-h-[60vh] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800"
				>
					<ul
						v-if="viewMode === 'parsed' && rows.length"
						class="divide-y divide-slate-100 dark:divide-slate-800"
					>
						<li
							v-for="row in rows"
							:key="row.key"
							class="flex gap-3 px-4 py-2 text-xs"
						>
							<span
								v-if="row.key"
								class="shrink-0 text-slate-500 dark:text-slate-400"
							>
								{{ row.key }}
							</span>
							<span class="min-w-0 break-all text-slate-900 dark:text-white">
								{{ row.value }}
							</span>
						</li>
					</ul>
					<p
						v-else-if="viewMode === 'parsed'"
						class="p-4 text-sm text-slate-500 dark:text-slate-400"
					>
						{{ t('admin.valueModal.empty') }}
					</p>
					<pre
						v-else
						class="overflow-auto p-4 text-xs text-slate-900 dark:text-white"
						>{{ rawText }}</pre
					>
				</div>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
	value: unknown
	title?: string
	eyebrow?: string
}>()

const open = defineModel<boolean>('open', { default: false })
const viewMode = ref<'parsed' | 'raw'>('parsed')

const formatLeaf = (value: unknown): string => {
	if (value === null) {
		return 'null'
	}

	if (value === undefined) {
		return 'undefined'
	}

	if (typeof value === 'object') {
		return JSON.stringify(value)
	}

	return String(value)
}

const rows = computed(() => {
	const value = props.value

	if (Array.isArray(value)) {
		return value.map((item, index) => ({
			key: String(index),
			value: formatLeaf(item),
		}))
	}

	if (value !== null && typeof value === 'object') {
		return Object.entries(value as Record<string, unknown>).map(
			([key, item]) => ({ key, value: formatLeaf(item) }),
		)
	}

	if (value === null || value === undefined || value === '') {
		return []
	}

	return [{ key: '', value: formatLeaf(value) }]
})

const rawText = computed(() => {
	const value = props.value

	return value === undefined ? '' : JSON.stringify(value, null, 2)
})

watch(open, (next) => {
	if (next) {
		viewMode.value = 'parsed'
	}
})
</script>
