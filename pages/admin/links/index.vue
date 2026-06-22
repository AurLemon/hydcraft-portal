<template>
	<div class="-mt-2">
		<div
			class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
		>
			<div class="grid gap-3">
				<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
					{{ t('admin.links.title') }}
				</h1>
				<div
					class="inline-flex w-fit rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900"
				>
					<button
						v-for="tab in tabs"
						:key="tab.value"
						type="button"
						class="rounded-md px-3 py-1.5 text-sm transition-colors"
						:class="
							activeTab === tab.value
								? 'bg-primary text-white'
								: 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
						"
						@click="activeTab = tab.value"
					>
						{{ tab.label }}
					</button>
				</div>
			</div>
			<div class="flex flex-wrap gap-2">
				<UButton icon="i-lucide-plus" size="lg" @click="openCreate">
					{{ t('admin.links.actions.create') }}
				</UButton>
				<UButton
					icon="i-lucide-inbox"
					size="lg"
					color="neutral"
					:variant="activeTab === 'applications' ? 'solid' : 'soft'"
					@click="activeTab = 'applications'"
				>
					{{ t('admin.links.actions.viewApplications') }}
				</UButton>
			</div>
		</div>

		<section
			class="mt-8 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
		>
			<div
				v-if="activeTab === 'links'"
				class="grid gap-3 border-b border-slate-200 p-4 dark:border-slate-800 lg:grid-cols-4"
			>
				<UInput
					v-model="linkFilters.search"
					icon="i-lucide-search"
					:placeholder="t('admin.links.filters.searchLinks')"
				/>
				<USelect
					v-model="linkFilters.category"
					:items="categoryFilterItems"
					:placeholder="t('admin.links.fields.category')"
				/>
				<USelect
					v-model="linkFilters.enabled"
					:items="enabledFilterItems"
					:placeholder="t('admin.links.fields.enabled')"
				/>
				<UButton
					type="button"
					color="neutral"
					variant="soft"
					icon="i-lucide-rotate-ccw"
					@click="resetLinkFilters"
				>
					{{ t('admin.actions.reset') }}
				</UButton>
			</div>

			<div
				v-else
				class="grid gap-3 border-b border-slate-200 p-4 dark:border-slate-800 lg:grid-cols-4"
			>
				<UInput
					v-model="applicationFilters.search"
					icon="i-lucide-search"
					:placeholder="t('admin.links.filters.searchApplications')"
				/>
				<USelect
					v-model="applicationFilters.category"
					:items="categoryFilterItems"
					:placeholder="t('admin.links.fields.category')"
				/>
				<USelect
					v-model="applicationFilters.status"
					:items="applicationStatusFilterItems"
					:placeholder="t('admin.links.fields.applicationStatus')"
				/>
				<UButton
					type="button"
					color="neutral"
					variant="soft"
					icon="i-lucide-rotate-ccw"
					@click="resetApplicationFilters"
				>
					{{ t('admin.actions.reset') }}
				</UButton>
			</div>

			<div v-if="activeTab === 'links'">
				<UTable
					:data="links"
					:columns="linkColumns"
					:loading="linksPending"
					class="min-h-72"
				>
					<template #link-cell="{ row }">
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
							<div class="min-w-0">
								<p class="truncate font-medium text-slate-900 dark:text-white">
									{{ row.original.name }}
								</p>
								<p class="truncate text-xs text-slate-500">
									{{ row.original.url }}
								</p>
							</div>
						</button>
					</template>
					<template #category-cell="{ row }">
						<UBadge color="neutral" variant="subtle">
							{{ t(`content.links.categories.${row.original.category}`) }}
						</UBadge>
					</template>
					<template #status-cell="{ row }">
						<UBadge
							:color="row.original.enabled ? 'success' : 'neutral'"
							variant="subtle"
						>
							{{
								row.original.enabled
									? t('admin.links.states.enabled')
									: t('admin.links.states.disabled')
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

				<AdminTablePagination
					:page="linkPage"
					:page-size="linkPageSize"
					:total="linkMeta.total"
					:page-count="linkMeta.pageCount"
					@update:page="linkPage = $event"
					@update:page-size="setLinkPageSize"
				/>
			</div>

			<div v-else>
				<UTable
					:data="applications"
					:columns="applicationColumns"
					:loading="applicationsPending"
					class="min-h-72"
				>
					<template #application-cell="{ row }">
						<button
							type="button"
							class="flex min-w-0 items-center gap-3 text-left"
							@click="openApplication(row.original)"
						>
							<UAvatar
								:src="row.original.avatarUrl || undefined"
								:alt="row.original.name || ''"
								class="rounded-lg"
								:ui="avatarUi"
							/>
							<div class="min-w-0">
								<p class="truncate font-medium text-slate-900 dark:text-white">
									{{
										row.original.name || t('admin.links.empty.applicationName')
									}}
								</p>
								<p class="truncate text-xs text-slate-500">
									{{ row.original.url || row.original.id }}
								</p>
							</div>
						</button>
					</template>
					<template #category-cell="{ row }">
						<UBadge
							v-if="row.original.category"
							color="neutral"
							variant="subtle"
						>
							{{ t(`content.links.categories.${row.original.category}`) }}
						</UBadge>
						<span v-else class="text-sm text-slate-400">—</span>
					</template>
					<template #applicant-cell="{ row }">
						<div
							v-if="row.original.applicant"
							class="flex min-w-0 items-center gap-2"
						>
							<UAvatar
								:src="row.original.applicant.avatarUrl || undefined"
								:alt="
									row.original.applicant.displayName ||
									row.original.applicant.username
								"
								size="xs"
								class="rounded-lg"
								:ui="avatarUi"
							/>
							<div class="min-w-0">
								<p class="truncate text-sm text-slate-900 dark:text-white">
									{{
										row.original.applicant.displayName ||
										row.original.applicant.username
									}}
								</p>
								<p class="truncate text-xs text-slate-500">
									@{{ row.original.applicant.username }}
								</p>
							</div>
						</div>
						<span v-else class="text-sm text-slate-400">—</span>
					</template>
					<template #status-cell="{ row }">
						<UBadge
							:color="applicationStatusColorMap[row.original.status]"
							variant="subtle"
						>
							{{ t(`admin.links.applicationStatuses.${row.original.status}`) }}
						</UBadge>
					</template>
					<template #submittedAt-cell="{ row }">
						{{ formatDate(row.original.submittedAt) }}
					</template>
					<template #actions-cell="{ row }">
						<UButton
							type="button"
							size="xs"
							color="neutral"
							variant="ghost"
							icon="i-lucide-eye"
							@click="openApplication(row.original)"
						/>
					</template>
				</UTable>

				<AdminTablePagination
					:page="applicationPage"
					:page-size="applicationPageSize"
					:total="applicationMeta.total"
					:page-count="applicationMeta.pageCount"
					@update:page="applicationPage = $event"
					@update:page-size="setApplicationPageSize"
				/>
			</div>
		</section>

		<AdminFriendLinkModal
			v-model:open="modalOpen"
			:link="editingLink"
			@saved="handleLinkSaved"
			@deleted="handleLinkDeleted"
		/>

		<UModal v-model:open="applicationOpen" :ui="{ content: 'max-w-2xl' }">
			<template #content>
				<div v-if="selectedApplication" class="grid gap-5 p-5 sm:p-6">
					<div class="flex items-start justify-between gap-4">
						<div class="grid gap-1">
							<h2 class="text-2xl font-semibold text-slate-950 dark:text-white">
								{{
									selectedApplication.name ||
									t('admin.links.empty.applicationName')
								}}
							</h2>
							<p class="text-sm text-slate-500">
								{{ selectedApplication.url || selectedApplication.id }}
							</p>
						</div>
						<UButton
							type="button"
							color="neutral"
							variant="ghost"
							icon="i-lucide-x"
							@click="applicationOpen = false"
						/>
					</div>

					<div
						class="grid gap-4"
						:class="
							selectedApplicationAvatarVisible ? 'sm:grid-cols-[auto,1fr]' : ''
						"
					>
						<UAvatar
							v-if="selectedApplicationAvatarVisible"
							:src="selectedApplication.avatarUrl || undefined"
							:alt="selectedApplicationAvatarAlt"
							size="3xl"
							class="h-22 w-22 shrink-0 rounded-lg"
							:ui="avatarUi"
						/>
						<div class="grid gap-3">
							<div class="flex flex-wrap gap-2">
								<UBadge
									v-if="selectedApplication.category"
									color="neutral"
									variant="subtle"
								>
									{{
										t(
											`content.links.categories.${selectedApplication.category}`,
										)
									}}
								</UBadge>
								<UBadge
									:color="applicationStatusColorMap[selectedApplication.status]"
									variant="subtle"
								>
									{{
										t(
											`admin.links.applicationStatuses.${selectedApplication.status}`,
										)
									}}
								</UBadge>
							</div>
							<p class="text-sm text-slate-500">
								{{
									selectedApplication.summary || t('admin.links.empty.summary')
								}}
							</p>
							<div
								v-if="selectedApplication.applicant"
								class="text-sm text-slate-500"
							>
								{{ t('admin.links.fields.applicant') }}:
								<span class="text-slate-900 dark:text-white">
									{{
										selectedApplication.applicant.displayName ||
										selectedApplication.applicant.username
									}}
								</span>
							</div>
							<div class="text-sm text-slate-500">
								{{ t('admin.links.fields.submittedAt') }}:
								<span class="text-slate-900 dark:text-white">
									{{ formatDate(selectedApplication.submittedAt) }}
								</span>
							</div>
						</div>
					</div>

					<div class="grid gap-2">
						<h3 class="font-medium text-slate-950 dark:text-white">
							{{ t('admin.links.fields.applicantStatement') }}
						</h3>
						<p
							class="rounded-xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300"
						>
							{{
								selectedApplication.applicantStatement ||
								t('admin.links.empty.statement')
							}}
						</p>
					</div>

					<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
						<UButton
							type="button"
							color="neutral"
							variant="ghost"
							@click="applicationOpen = false"
						>
							{{ t('common.cancel') }}
						</UButton>
						<UButton
							v-if="selectedApplication.status === 'PENDING_REVIEW'"
							type="button"
							color="error"
							variant="soft"
							icon="i-lucide-x-circle"
							:loading="reviewing === 'reject'"
							@click="reviewApplication('reject')"
						>
							{{ t('admin.links.actions.reject') }}
						</UButton>
						<UButton
							v-if="selectedApplication.status === 'PENDING_REVIEW'"
							type="button"
							icon="i-lucide-check"
							:loading="reviewing === 'approve'"
							@click="reviewApplication('approve')"
						>
							{{ t('admin.links.actions.approve') }}
						</UButton>
					</div>
				</div>
			</template>
		</UModal>
	</div>
</template>

<script setup lang="ts">
import AdminTablePagination from '~/components/admin/AdminTablePagination.vue'
import type {
	AdminFriendLinkApplicationsResponse,
	AdminFriendLinksResponse,
	FriendLinkApplicationStatus,
	FriendLinkApplicationSummary,
	FriendLinkCategory,
	FriendLinkSummary,
} from '~/utils/friend-links'
import {
	friendLinkCategoryValues,
	friendLinkApplicationStatusValues,
} from '~/utils/friend-links'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'admin-auth',
})

const { d, t } = useI18n()
const { notifyError, notifySuccess } = useAdminToast()
const ALL_FILTER_VALUE = '__all__'
const avatarUi = {
	root: 'rounded-lg overflow-hidden',
	fallback: 'rounded-lg',
}
const activeTab = ref<'links' | 'applications'>('links')
const modalOpen = ref(false)
const applicationOpen = ref(false)
const editingLink = ref<FriendLinkSummary | null>(null)
const selectedApplication = ref<FriendLinkApplicationSummary | null>(null)
const reviewing = ref<'approve' | 'reject' | null>(null)
const linkPage = ref(1)
const linkPageSize = ref(20)
const applicationPage = ref(1)
const applicationPageSize = ref(20)

const linkFilters = reactive({
	search: '',
	category: ALL_FILTER_VALUE,
	enabled: ALL_FILTER_VALUE,
})
const applicationFilters = reactive({
	search: '',
	category: ALL_FILTER_VALUE,
	status: 'PENDING_REVIEW',
})

const getFilterQueryValue = (value: string): string | undefined =>
	value === ALL_FILTER_VALUE ? undefined : value

const linkQuery = computed(() => ({
	page: linkPage.value,
	pageSize: linkPageSize.value,
	search: linkFilters.search || undefined,
	category: getFilterQueryValue(linkFilters.category),
	enabled: getFilterQueryValue(linkFilters.enabled),
}))
const applicationQuery = computed(() => ({
	page: applicationPage.value,
	pageSize: applicationPageSize.value,
	search: applicationFilters.search || undefined,
	category: getFilterQueryValue(applicationFilters.category),
	status: getFilterQueryValue(applicationFilters.status),
}))

const {
	data: linksData,
	pending: linksPending,
	refresh: refreshLinks,
} = await useFetch<AdminFriendLinksResponse>('/api/admin/links', {
	query: linkQuery,
})
const {
	data: applicationsData,
	pending: applicationsPending,
	refresh: refreshApplications,
} = await useFetch<AdminFriendLinkApplicationsResponse>(
	'/api/admin/links/applications',
	{
		query: applicationQuery,
	},
)

const tabs = computed<
	Array<{ value: 'links' | 'applications'; label: string }>
>(() => [
	{ value: 'links', label: t('admin.links.tabs.links') },
	{ value: 'applications', label: t('admin.links.tabs.applications') },
])
const categoryFilterItems = computed(() => [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	...friendLinkCategoryValues.map((category) => ({
		label: t(`content.links.categories.${category}`),
		value: category,
	})),
])
const enabledFilterItems = computed(() => [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	{ label: t('admin.links.states.enabled'), value: 'true' },
	{ label: t('admin.links.states.disabled'), value: 'false' },
])
const applicationStatusFilterItems = computed(() => [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	...friendLinkApplicationStatusValues.map((status) => ({
		label: t(`admin.links.applicationStatuses.${status}`),
		value: status,
	})),
])
const links = computed(() => linksData.value?.items ?? [])
const linkMeta = computed(() => ({
	total: linksData.value?.total ?? 0,
	pageCount: linksData.value?.pageCount ?? 1,
}))
const applications = computed(() => applicationsData.value?.items ?? [])
const applicationMeta = computed(() => ({
	total: applicationsData.value?.total ?? 0,
	pageCount: applicationsData.value?.pageCount ?? 1,
}))
const linkColumns = [
	{ accessorKey: 'link', header: t('admin.links.fields.link') },
	{ accessorKey: 'category', header: t('admin.links.fields.category') },
	{ accessorKey: 'status', header: t('admin.links.fields.enabled') },
	{ accessorKey: 'actions', header: t('admin.actions.edit') },
]
const applicationColumns = [
	{ accessorKey: 'application', header: t('admin.links.fields.application') },
	{ accessorKey: 'category', header: t('admin.links.fields.category') },
	{ accessorKey: 'applicant', header: t('admin.links.fields.applicant') },
	{
		accessorKey: 'submittedAt',
		header: t('admin.links.fields.submittedAt'),
	},
	{
		accessorKey: 'status',
		header: t('admin.links.fields.applicationStatus'),
	},
	{ accessorKey: 'actions', header: t('admin.actions.edit') },
]
const applicationStatusColorMap: Record<
	FriendLinkApplicationStatus,
	'primary' | 'success' | 'warning' | 'error' | 'neutral'
> = {
	DRAFT: 'neutral',
	PENDING_REVIEW: 'warning',
	APPROVED: 'success',
	REJECTED: 'error',
	EXPIRED: 'neutral',
}
const selectedApplicationAvatarName = computed(
	() => selectedApplication.value?.name?.trim() || '',
)
const selectedApplicationAvatarVisible = computed(() =>
	Boolean(
		selectedApplication.value?.avatarUrl || selectedApplicationAvatarName.value,
	),
)
const selectedApplicationAvatarAlt = computed(
	() => selectedApplicationAvatarName.value || undefined,
)

const formatDate = (value: string | null): string =>
	value ? d(new Date(value), 'short') : t('admin.links.empty.unknownDate')

watch(
	() => activeTab.value,
	() => {
		if (activeTab.value === 'links') {
			linkPage.value = 1
			return
		}

		applicationPage.value = 1
	},
)

const resetLinkFilters = (): void => {
	linkFilters.search = ''
	linkFilters.category = ALL_FILTER_VALUE
	linkFilters.enabled = ALL_FILTER_VALUE
	linkPage.value = 1
}

const resetApplicationFilters = (): void => {
	applicationFilters.search = ''
	applicationFilters.category = ALL_FILTER_VALUE
	applicationFilters.status = 'PENDING_REVIEW'
	applicationPage.value = 1
}

const setLinkPageSize = (value: number): void => {
	linkPageSize.value = value
	linkPage.value = 1
}

const setApplicationPageSize = (value: number): void => {
	applicationPageSize.value = value
	applicationPage.value = 1
}

const openCreate = (): void => {
	activeTab.value = 'links'
	editingLink.value = null
	modalOpen.value = true
}

const openEdit = (link: FriendLinkSummary): void => {
	activeTab.value = 'links'
	editingLink.value = link
	modalOpen.value = true
}

const openApplication = (application: FriendLinkApplicationSummary): void => {
	activeTab.value = 'applications'
	selectedApplication.value = application
	applicationOpen.value = true
}

const handleLinkSaved = async (): Promise<void> => {
	await refreshLinks()
}

const handleLinkDeleted = async (): Promise<void> => {
	await refreshLinks()
}

const reviewApplication = async (
	action: 'approve' | 'reject',
): Promise<void> => {
	if (!selectedApplication.value) {
		return
	}

	reviewing.value = action

	try {
		const updated = await $fetch<FriendLinkApplicationSummary>(
			`/api/admin/links/applications/${selectedApplication.value.id}/${action}`,
			{
				method: 'POST',
			},
		)
		selectedApplication.value = updated
		await Promise.all([refreshApplications(), refreshLinks()])
		notifySuccess({
			title: t(
				action === 'approve'
					? 'admin.links.notifications.approved'
					: 'admin.links.notifications.rejected',
			),
		})
		if (action === 'approve') {
			activeTab.value = 'links'
			applicationOpen.value = false
		}
	} catch (error) {
		notifyError(error, {
			title: t('admin.links.notifications.reviewFailed'),
		})
	} finally {
		reviewing.value = null
	}
}
</script>
