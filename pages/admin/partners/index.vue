<template>
	<div>
		<div
			class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
		>
			<div>
				<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
					{{ t('admin.partners.title') }}
				</h1>
			</div>
			<div class="flex flex-wrap gap-2">
				<UButton
					icon="i-lucide-plus"
					size="lg"
					@click="openCreate('COMMUNITY')"
				>
					{{ t('admin.partners.createCommunity') }}
				</UButton>
				<UButton
					icon="i-lucide-plus"
					size="lg"
					color="neutral"
					variant="soft"
					@click="openCreate('SUPPORT_ACKNOWLEDGEMENTS')"
				>
					{{ t('admin.partners.createSupport') }}
				</UButton>
			</div>
		</div>

		<section
			class="mt-8 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
		>
			<div
				class="grid gap-3 border-b border-slate-200 p-4 dark:border-slate-800 lg:grid-cols-4"
			>
				<UInput
					v-model="filters.search"
					icon="i-lucide-search"
					class="w-full"
					:placeholder="t('admin.partners.filters.search')"
				/>
				<USelect
					v-model="filters.section"
					:items="filterSectionItems"
					class="w-full"
					:placeholder="t('admin.partners.fields.section')"
				/>
				<USelect
					v-model="filters.kind"
					:items="filterKindItems"
					class="w-full"
					:placeholder="t('admin.partners.fields.kind')"
				/>
				<div class="flex gap-2">
					<USelect
						v-model="filters.enabled"
						:items="enabledItems"
						class="w-full"
						:placeholder="t('admin.partners.fields.enabled')"
					/>
					<UButton
						type="button"
						color="neutral"
						variant="soft"
						icon="i-lucide-rotate-ccw"
						@click="resetFilters"
					/>
				</div>
			</div>

			<div v-if="isFiltering" class="p-4">
				<UTable :data="filteredItems" :columns="columns" :loading="pending">
					<template #partner-cell="{ row }">
						<button
							type="button"
							class="flex min-w-0 items-center gap-3 text-left"
							@click="openEdit(row.original)"
						>
							<UAvatar
								:src="row.original.avatarUrl || undefined"
								:alt="row.original.name"
								class="rounded-lg"
								:ui="avatarUi"
							/>
							<span
								class="min-w-0 truncate font-medium text-slate-900 dark:text-white"
							>
								{{ row.original.name }}
							</span>
						</button>
					</template>
					<template #section-cell="{ row }">
						<UBadge color="neutral" variant="subtle">
							{{ t(`admin.partners.partnerSections.${row.original.section}`) }}
						</UBadge>
					</template>
					<template #kind-cell="{ row }">
						<UBadge v-if="row.original.kind" color="neutral" variant="subtle">
							{{ t(`admin.partners.kinds.${row.original.kind}`) }}
						</UBadge>
						<span v-else class="text-slate-400">—</span>
					</template>
					<template #status-cell="{ row }">
						<UBadge
							:color="row.original.enabled ? 'success' : 'neutral'"
							variant="subtle"
						>
							{{
								row.original.enabled
									? t('admin.partners.states.enabled')
									: t('admin.partners.states.disabled')
							}}
						</UBadge>
					</template>
					<template #actions-cell="{ row }">
						<UButton
							type="button"
							size="xs"
							color="neutral"
							variant="ghost"
							icon="i-lucide-pencil"
							@click="openEdit(row.original)"
						/>
					</template>
				</UTable>
			</div>

			<div v-else class="grid gap-6 p-4">
				<PartnerReorderTable
					v-if="
						filters.section === ALL_FILTER_VALUE ||
						filters.section === 'COMMUNITY'
					"
					section="COMMUNITY"
					:items="communityList"
					@reorder="onReorder('COMMUNITY', $event)"
					@edit="openEdit"
				/>
				<PartnerReorderTable
					v-if="
						filters.section === ALL_FILTER_VALUE ||
						filters.section === 'SUPPORT_ACKNOWLEDGEMENTS'
					"
					section="SUPPORT_ACKNOWLEDGEMENTS"
					:items="supportList"
					@reorder="onReorder('SUPPORT_ACKNOWLEDGEMENTS', $event)"
					@edit="openEdit"
				/>
			</div>
		</section>

		<PartnerAdminModal
			v-model:open="modalOpen"
			:mode="modalMode"
			:section="modalSection"
			:partner="modalPartner"
			@saved="handleSaved"
			@deleted="handleDeleted"
		/>
	</div>
</template>

<script setup lang="ts">
import type { PartnerSection, PartnerSummary } from '~/utils/partners'
import { partnerKindValues, partnerSectionValues } from '~/utils/partners'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'admin-auth',
})

const { t } = useI18n()
const { notifyError, notifySuccess } = useAdminToast()
const ALL_FILTER_VALUE = '__all__'
const avatarUi = {
	root: 'rounded-lg overflow-hidden',
	fallback: 'rounded-lg',
}

const filters = reactive({
	search: '',
	section: ALL_FILTER_VALUE,
	kind: ALL_FILTER_VALUE,
	enabled: ALL_FILTER_VALUE,
})

const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const modalSection = ref<PartnerSection>('COMMUNITY')
const modalPartner = ref<PartnerSummary | null>(null)
const reordering = ref(false)

const query = computed(() => ({
	search: filters.search || undefined,
	section: filters.section === ALL_FILTER_VALUE ? undefined : filters.section,
	kind: filters.kind === ALL_FILTER_VALUE ? undefined : filters.kind,
	enabled: filters.enabled === ALL_FILTER_VALUE ? undefined : filters.enabled,
}))
const { data, pending, error, refresh } = await useFetch<{
	items: PartnerSummary[]
}>('/api/admin/partners', { query })

const allItems = computed(() => data.value?.items ?? [])
const communityList = computed(() =>
	allItems.value.filter((item) => item.section === 'COMMUNITY'),
)
const supportList = computed(() =>
	allItems.value.filter((item) => item.section === 'SUPPORT_ACKNOWLEDGEMENTS'),
)

const isFiltering = computed(
	() =>
		!!filters.search ||
		filters.kind !== ALL_FILTER_VALUE ||
		filters.enabled !== ALL_FILTER_VALUE,
)

const filteredItems = computed(() => {
	let items = allItems.value

	if (filters.section !== ALL_FILTER_VALUE) {
		items = items.filter((item) => item.section === filters.section)
	}

	if (filters.kind !== ALL_FILTER_VALUE) {
		items = items.filter((item) => item.kind === filters.kind)
	}

	if (filters.enabled !== ALL_FILTER_VALUE) {
		const enabled = filters.enabled === 'true'
		items = items.filter((item) => item.enabled === enabled)
	}

	if (filters.search) {
		const keyword = filters.search.toLowerCase()
		items = items.filter(
			(item) =>
				item.name.toLowerCase().includes(keyword) ||
				(item.summary ?? '').toLowerCase().includes(keyword),
		)
	}

	return items
})

const sectionItems = computed(() =>
	partnerSectionValues.map((section) => ({
		label: t(`admin.partners.partnerSections.${section}`),
		value: section,
	})),
)
const filterSectionItems = computed(() => [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	...sectionItems.value,
])
const filterKindItems = computed(() => [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	...partnerKindValues.map((kind) => ({
		label: t(`admin.partners.kinds.${kind}`),
		value: kind,
	})),
])
const enabledItems = computed(() => [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	{ label: t('admin.partners.states.enabled'), value: 'true' },
	{ label: t('admin.partners.states.disabled'), value: 'false' },
])
const columns = [
	{ accessorKey: 'partner', header: t('admin.partners.fields.partner') },
	{ accessorKey: 'section', header: t('admin.partners.fields.section') },
	{ accessorKey: 'kind', header: t('admin.partners.fields.kind') },
	{ accessorKey: 'status', header: t('admin.partners.fields.enabled') },
	{ id: 'actions', header: '' },
]

watch(error, (value) => value && notifyError(value), { immediate: true })

const resetFilters = (): void => {
	filters.search = ''
	filters.section = ALL_FILTER_VALUE
	filters.kind = ALL_FILTER_VALUE
	filters.enabled = ALL_FILTER_VALUE
}

const openCreate = (section: PartnerSection): void => {
	modalMode.value = 'create'
	modalSection.value = section
	modalPartner.value = null
	modalOpen.value = true
}

const openEdit = (partner: PartnerSummary): void => {
	modalMode.value = 'edit'
	modalSection.value = partner.section
	modalPartner.value = partner
	modalOpen.value = true
}

const handleSaved = async (): Promise<void> => {
	await refresh()
}

const handleDeleted = async (): Promise<void> => {
	await refresh()
}

const onReorder = async (
	section: PartnerSection,
	orderedIds: string[],
): Promise<void> => {
	if (reordering.value) {
		return
	}

	reordering.value = true

	try {
		const reorderUrl: string = '/api/admin/partners/reorder'
		await $fetch(reorderUrl, {
			method: 'POST',
			body: { section, orderedIds },
		})
		notifySuccess({ title: t('admin.partners.notifications.reordered') })
		await refresh()
	} catch (error) {
		notifyError(error, {
			title: t('admin.partners.notifications.reorderFailed'),
		})
		await refresh()
	} finally {
		reordering.value = false
	}
}
</script>
