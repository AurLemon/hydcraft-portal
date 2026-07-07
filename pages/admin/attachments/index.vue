<template>
	<div>
		<div
			class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
		>
			<div>
				<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
					{{ t('admin.attachments.title') }}
				</h1>
			</div>
		</div>

		<div
			class="mt-8 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
		>
			<div
				class="grid gap-3 border-b border-slate-200 p-4 dark:border-slate-800 md:grid-cols-2 xl:grid-cols-8"
			>
				<UInput
					v-model="filters.search"
					icon="i-lucide-search"
					:placeholder="t('admin.attachments.filters.search')"
				/>
				<USelect
					v-model="filters.app"
					:items="appItems"
					:placeholder="t('admin.attachments.filters.app')"
				/>
				<USelect
					v-model="filters.category"
					:items="categoryItems"
					:placeholder="t('admin.attachments.filters.category')"
				/>
				<USelect
					v-model="filters.purpose"
					:items="purposeItems"
					:placeholder="t('admin.attachments.filters.purpose')"
				/>
				<USelect
					v-model="filters.status"
					:items="statusItems"
					:placeholder="t('admin.attachments.filters.status')"
				/>
				<USelect
					v-model="filters.visibility"
					:items="visibilityItems"
					:placeholder="t('admin.attachments.filters.visibility')"
				/>
				<USelect
					v-model="filters.sortField"
					:items="sortFieldItems"
					:placeholder="t('admin.sort.field')"
				/>
				<USelect
					v-model="filters.sortDirection"
					:items="sortDirectionItems"
					:placeholder="t('admin.sort.direction')"
				/>
				<UButton
					type="button"
					color="neutral"
					variant="soft"
					icon="i-lucide-rotate-ccw"
					@click="resetFilters"
				>
					{{ t('admin.actions.reset') }}
				</UButton>
			</div>

			<UTable
				:data="attachments"
				:columns="columns"
				:loading="pending"
				class="min-h-72"
			>
				<template #id-cell="{ row }">
					<button
						type="button"
						class="text-xs text-primary hover:underline"
						@click="openAttachment(row.original)"
					>
						{{ row.original.id }}
					</button>
				</template>
				<template #purpose-cell="{ row }">
					<div class="grid gap-1">
						<span class="font-medium text-slate-800 dark:text-slate-100">
							{{ row.original.purpose }}
						</span>
						<span class="text-xs text-slate-500">
							{{ row.original.category || '-' }}
						</span>
					</div>
				</template>
				<template #status-cell="{ row }">
					<UBadge :color="statusColor(row.original.status)" variant="subtle">
						{{ row.original.status }}
					</UBadge>
				</template>
				<template #owner-cell="{ row }">
					<div class="text-xs text-slate-500">
						{{ row.original.ownerType }} / {{ row.original.ownerId || '-' }}
					</div>
				</template>
				<template #createdAt-cell="{ row }">
					{{ formatDate(row.original.createdAt) }}
				</template>
				<template #actions-cell="{ row }">
					<div class="flex justify-end gap-2">
						<UButton
							type="button"
							size="xs"
							color="neutral"
							variant="ghost"
							icon="i-lucide-eye"
							@click="openAttachment(row.original)"
						/>
						<UButton
							type="button"
							size="xs"
							color="error"
							variant="ghost"
							icon="i-lucide-trash-2"
							:disabled="row.original.status === 'DELETED'"
							@click="deleteAttachment(row.original)"
						/>
					</div>
				</template>
			</UTable>

			<AdminTablePagination
				:page="page"
				:page-size="pageSize"
				:total="pageMeta.total"
				:page-count="pageMeta.pageCount"
				@update:page="page = $event"
				@update:page-size="setPageSize"
			/>
		</div>

		<UModal
			:open="modalOpen"
			:ui="{ content: 'max-w-4xl', body: 'p-0' }"
			@update:open="modalOpen = $event"
		>
			<template #content>
				<div
					v-if="selectedAttachment"
					class="max-h-[86dvh] overflow-y-auto p-5 sm:p-6"
				>
					<div class="flex items-start justify-between gap-4">
						<div>
							<h2 class="text-2xl font-semibold text-slate-950 dark:text-white">
								{{ t('admin.attachments.modal.title') }}
							</h2>
							<p class="mt-1 text-xs text-slate-500">
								{{ selectedAttachment.id }}
							</p>
						</div>
						<UButton
							type="button"
							color="neutral"
							variant="ghost"
							icon="i-lucide-x"
							@click="modalOpen = false"
						/>
					</div>

					<div class="mt-6 grid gap-4 md:grid-cols-2">
						<div
							class="grid gap-1 rounded-lg border border-slate-200 p-3 dark:border-slate-800 [&>span]:text-xs [&>span]:text-slate-500 [&>strong]:text-sm [&>strong]:text-slate-950 dark:[&>span]:text-slate-400 dark:[&>strong]:text-white"
						>
							<span>{{ t('admin.attachments.fields.id') }}</span>
							<strong class="break-all text-xs">{{
								selectedAttachment.id
							}}</strong>
						</div>
						<div
							class="grid gap-1 rounded-lg border border-slate-200 p-3 dark:border-slate-800 [&>span]:text-xs [&>span]:text-slate-500 [&>strong]:text-sm [&>strong]:text-slate-950 dark:[&>span]:text-slate-400 dark:[&>strong]:text-white"
						>
							<span>{{ t('admin.attachments.fields.app') }}</span>
							<strong>{{ selectedAttachment.app }}</strong>
						</div>
						<div
							class="grid gap-1 rounded-lg border border-slate-200 p-3 dark:border-slate-800 [&>span]:text-xs [&>span]:text-slate-500 [&>strong]:text-sm [&>strong]:text-slate-950 dark:[&>span]:text-slate-400 dark:[&>strong]:text-white"
						>
							<span>{{ t('admin.attachments.fields.category') }}</span>
							<strong>{{ selectedAttachment.category || '-' }}</strong>
						</div>
						<div
							class="grid gap-1 rounded-lg border border-slate-200 p-3 dark:border-slate-800 [&>span]:text-xs [&>span]:text-slate-500 [&>strong]:text-sm [&>strong]:text-slate-950 dark:[&>span]:text-slate-400 dark:[&>strong]:text-white"
						>
							<span>{{ t('admin.attachments.fields.purpose') }}</span>
							<strong>{{ selectedAttachment.purpose }}</strong>
						</div>
						<div
							class="grid gap-1 rounded-lg border border-slate-200 p-3 dark:border-slate-800 [&>span]:text-xs [&>span]:text-slate-500 [&>strong]:text-sm [&>strong]:text-slate-950 dark:[&>span]:text-slate-400 dark:[&>strong]:text-white"
						>
							<span>{{ t('admin.attachments.fields.status') }}</span>
							<strong>{{ selectedAttachment.status }}</strong>
						</div>
						<div
							class="grid gap-1 rounded-lg border border-slate-200 p-3 dark:border-slate-800 [&>span]:text-xs [&>span]:text-slate-500 [&>strong]:text-sm [&>strong]:text-slate-950 dark:[&>span]:text-slate-400 dark:[&>strong]:text-white"
						>
							<span>{{ t('admin.attachments.fields.visibility') }}</span>
							<strong>{{ selectedAttachment.visibility }}</strong>
						</div>
						<div
							class="grid gap-1 rounded-lg border border-slate-200 p-3 dark:border-slate-800 [&>span]:text-xs [&>span]:text-slate-500 [&>strong]:text-sm [&>strong]:text-slate-950 dark:[&>span]:text-slate-400 dark:[&>strong]:text-white"
						>
							<span>{{ t('admin.attachments.fields.ownerType') }}</span>
							<strong>{{ selectedAttachment.ownerType }}</strong>
						</div>
						<div
							class="grid gap-1 rounded-lg border border-slate-200 p-3 dark:border-slate-800 [&>span]:text-xs [&>span]:text-slate-500 [&>strong]:text-sm [&>strong]:text-slate-950 dark:[&>span]:text-slate-400 dark:[&>strong]:text-white"
						>
							<span>{{ t('admin.attachments.fields.ownerId') }}</span>
							<strong>{{ selectedAttachment.ownerId || '-' }}</strong>
						</div>
						<div
							class="grid gap-1 rounded-lg border border-slate-200 p-3 dark:border-slate-800 [&>span]:text-xs [&>span]:text-slate-500 [&>strong]:text-sm [&>strong]:text-slate-950 dark:[&>span]:text-slate-400 dark:[&>strong]:text-white"
						>
							<span>{{ t('admin.attachments.fields.contentType') }}</span>
							<strong>{{ selectedAttachment.contentType || '-' }}</strong>
						</div>
						<div
							class="grid gap-1 rounded-lg border border-slate-200 p-3 dark:border-slate-800 [&>span]:text-xs [&>span]:text-slate-500 [&>strong]:text-sm [&>strong]:text-slate-950 dark:[&>span]:text-slate-400 dark:[&>strong]:text-white"
						>
							<span>{{ t('admin.attachments.fields.sizeBytes') }}</span>
							<strong>{{ selectedAttachment.sizeBytes ?? '-' }}</strong>
						</div>
						<div
							class="grid gap-1 rounded-lg border border-slate-200 p-3 dark:border-slate-800 [&>span]:text-xs [&>span]:text-slate-500 [&>strong]:text-sm [&>strong]:text-slate-950 dark:[&>span]:text-slate-400 dark:[&>strong]:text-white"
						>
							<span>{{ t('admin.attachments.fields.createdById') }}</span>
							<strong class="break-all text-xs">{{
								selectedAttachment.createdById || '-'
							}}</strong>
						</div>
						<div
							class="grid gap-1 rounded-lg border border-slate-200 p-3 dark:border-slate-800 [&>span]:text-xs [&>span]:text-slate-500 [&>strong]:text-sm [&>strong]:text-slate-950 dark:[&>span]:text-slate-400 dark:[&>strong]:text-white"
						>
							<span>{{ t('admin.attachments.fields.createdAt') }}</span>
							<strong>{{ formatDate(selectedAttachment.createdAt) }}</strong>
						</div>
						<div
							class="grid gap-1 rounded-lg border border-slate-200 p-3 md:col-span-2 dark:border-slate-800 [&>span]:text-xs [&>span]:text-slate-500 [&>strong]:text-sm [&>strong]:text-slate-950 dark:[&>span]:text-slate-400 dark:[&>strong]:text-white"
						>
							<span>{{ t('admin.attachments.fields.objectKey') }}</span>
							<strong class="break-all text-xs">{{
								selectedAttachment.objectKey || '-'
							}}</strong>
						</div>
					</div>

					<div class="mt-6">
						<h3 class="text-base font-semibold text-slate-950 dark:text-white">
							{{ t('admin.attachments.modal.variants') }}
						</h3>
						<div class="mt-3 grid gap-3">
							<div
								v-for="variant in selectedAttachment.variants"
								:key="variant.id"
								class="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
							>
								<div class="flex flex-wrap items-center justify-between gap-3">
									<div>
										<div class="font-medium text-slate-800 dark:text-slate-100">
											{{ variant.name }} · {{ variant.width }}x{{
												variant.height
											}}
										</div>
										<div class="mt-1 break-all text-xs text-slate-500">
											{{ variant.objectKey }}
										</div>
									</div>
									<UButton
										v-if="variant.url"
										type="button"
										size="xs"
										icon="i-lucide-copy"
										@click="copyText(variant.url)"
									>
										{{ t('admin.actions.copyUrl') }}
									</UButton>
									<span v-else class="text-xs text-slate-500">
										{{ t('admin.attachments.modal.privateUrlHidden') }}
									</span>
								</div>
								<img
									v-if="variant.url && selectedAttachment.status !== 'DELETED'"
									:src="variant.url"
									:alt="variant.name"
									class="mt-3 max-h-40 rounded-md border border-slate-200 object-contain dark:border-slate-800"
								/>
							</div>
						</div>
					</div>
				</div>
			</template>
		</UModal>

		<UModal
			:open="deleteConfirmOpen"
			:ui="{ content: 'max-w-md' }"
			@update:open="deleteConfirmOpen = $event"
		>
			<template #content>
				<div class="p-5">
					<h2 class="text-lg font-semibold text-slate-950 dark:text-white">
						{{ t('admin.attachments.deleteConfirm.title') }}
					</h2>
					<p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
						{{ t('admin.attachments.deleteConfirm.description') }}
					</p>
					<p
						v-if="pendingDeleteAttachment"
						class="mt-3 break-all text-xs text-slate-500"
					>
						{{ pendingDeleteAttachment.id }}
					</p>
					<div class="mt-5 flex justify-end gap-2">
						<UButton
							type="button"
							color="neutral"
							variant="ghost"
							@click="deleteConfirmOpen = false"
						>
							{{ t('admin.actions.cancel') }}
						</UButton>
						<UButton
							type="button"
							color="error"
							icon="i-lucide-trash-2"
							:loading="deleting"
							@click="confirmDeleteAttachment"
						>
							{{ t('admin.actions.delete') }}
						</UButton>
					</div>
				</div>
			</template>
		</UModal>
	</div>
</template>

<script setup lang="ts">
import AdminTablePagination from '~/components/admin/AdminTablePagination.vue'
import {
	attachmentAppValues,
	attachmentCategoryValues,
	attachmentPurposeValues,
} from '~/utils/attachment/catalog'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'admin-auth',
})

interface AdminAttachmentVariant {
	id: string
	name: string
	objectKey: string
	url: string | null
	width: number
	height: number
	contentType: string
	sizeBytes: number | null
	createdAt: string
}

interface AdminAttachment {
	id: string
	app: string
	category: string | null
	purpose: string
	ownerType: string
	ownerId: string | null
	visibility: string
	status: string
	contentType: string | null
	sizeBytes: number | null
	createdById: string | null
	objectKey: string | null
	createdAt: string
	updatedAt: string
	variants: AdminAttachmentVariant[]
}

interface AdminAttachmentsResponse {
	items: AdminAttachment[]
	page: number
	pageSize: number
	total: number
	pageCount: number
}

const { notifyError, notifySuccess } = useAdminToast()
const { locale } = useI18n()
const ALL_FILTER_VALUE = '__all__'
const page = ref(1)
const pageSize = ref(20)
const filters = reactive({
	search: '',
	app: ALL_FILTER_VALUE,
	category: ALL_FILTER_VALUE,
	purpose: ALL_FILTER_VALUE,
	status: ALL_FILTER_VALUE,
	visibility: ALL_FILTER_VALUE,
	sortField: 'createdAt',
	sortDirection: 'desc',
})
const modalOpen = ref(false)
const deleteConfirmOpen = ref(false)
const deleting = ref(false)
const selectedAttachment = ref<AdminAttachment | null>(null)
const pendingDeleteAttachment = ref<AdminAttachment | null>(null)
const getFilterQueryValue = (value: string): string | undefined =>
	value === ALL_FILTER_VALUE ? undefined : value
const query = computed(() => ({
	page: page.value,
	pageSize: pageSize.value,
	search: filters.search || undefined,
	app: getFilterQueryValue(filters.app),
	category: getFilterQueryValue(filters.category),
	purpose: getFilterQueryValue(filters.purpose),
	status: getFilterQueryValue(filters.status),
	visibility: getFilterQueryValue(filters.visibility),
	sortField: filters.sortField,
	sortDirection: filters.sortDirection,
}))
const { data, pending, error, refresh } =
	await useFetch<AdminAttachmentsResponse>('/api/admin/attachments', {
		query,
	})
const attachments = computed(() => data.value?.items ?? [])
const pageMeta = computed(() => ({
	total: data.value?.total ?? 0,
	pageCount: data.value?.pageCount ?? 1,
}))
const columns = [
	{ accessorKey: 'id', header: 'ID' },
	{ accessorKey: 'purpose', header: t('admin.attachments.fields.purpose') },
	{ accessorKey: 'status', header: t('admin.attachments.fields.status') },
	{ accessorKey: 'owner', header: t('admin.attachments.fields.owner') },
	{ accessorKey: 'createdAt', header: t('admin.attachments.fields.createdAt') },
	{ id: 'actions', header: '' },
]
const appItems = [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	...attachmentAppValues.map((value) => ({ label: value, value })),
]
const categoryItems = [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	...attachmentCategoryValues.map((value) => ({ label: value, value })),
]
const purposeItems = [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	...attachmentPurposeValues.map((value) => ({ label: value, value })),
]
const statusItems = [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	{ label: 'PENDING', value: 'PENDING' },
	{ label: 'UPLOADED', value: 'UPLOADED' },
	{ label: 'PROCESSING', value: 'PROCESSING' },
	{ label: 'READY', value: 'READY' },
	{ label: 'FAILED', value: 'FAILED' },
	{ label: 'DELETED', value: 'DELETED' },
	{ label: 'EXPIRED', value: 'EXPIRED' },
]
const visibilityItems = [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	{ label: 'PUBLIC', value: 'PUBLIC' },
	{ label: 'PRIVATE', value: 'PRIVATE' },
]
const sortFieldItems = [
	{ label: t('admin.attachments.fields.createdAt'), value: 'createdAt' },
	{ label: t('admin.sort.fields.updatedAt'), value: 'updatedAt' },
	{ label: t('admin.attachments.fields.id'), value: 'id' },
	{ label: t('admin.attachments.fields.app'), value: 'app' },
	{ label: t('admin.attachments.fields.category'), value: 'category' },
	{ label: t('admin.attachments.fields.purpose'), value: 'purpose' },
	{ label: t('admin.attachments.fields.status'), value: 'status' },
	{ label: t('admin.attachments.fields.visibility'), value: 'visibility' },
	{ label: t('admin.attachments.fields.sizeBytes'), value: 'sizeBytes' },
]
const sortDirectionItems = [
	{ label: t('admin.sort.desc'), value: 'desc' },
	{ label: t('admin.sort.asc'), value: 'asc' },
]

watch(error, (value) => value && notifyError(value), { immediate: true })
watch(
	() => ({ ...filters }),
	() => {
		page.value = 1
	},
	{ deep: true },
)

const statusColor = (status: string) =>
	status === 'READY'
		? 'success'
		: status === 'FAILED' || status === 'DELETED'
			? 'error'
			: 'neutral'

const formatDate = (value: string): string =>
	new Intl.DateTimeFormat(locale.value, {
		dateStyle: 'short',
		timeStyle: 'short',
	}).format(new Date(value))

const setPageSize = (value: number): void => {
	pageSize.value = value
	page.value = 1
}

const resetFilters = (): void => {
	filters.search = ''
	filters.app = ALL_FILTER_VALUE
	filters.category = ALL_FILTER_VALUE
	filters.purpose = ALL_FILTER_VALUE
	filters.status = ALL_FILTER_VALUE
	filters.visibility = ALL_FILTER_VALUE
	filters.sortField = 'createdAt'
	filters.sortDirection = 'desc'
}

const openAttachment = (attachment: AdminAttachment): void => {
	selectedAttachment.value = attachment
	modalOpen.value = true
}

const copyText = async (value: string): Promise<void> => {
	await navigator.clipboard.writeText(value)
	notifySuccess({ title: t('admin.notifications.copied') })
}

const deleteAttachment = (attachment: AdminAttachment): void => {
	pendingDeleteAttachment.value = attachment
	deleteConfirmOpen.value = true
}

const confirmDeleteAttachment = async (): Promise<void> => {
	if (!pendingDeleteAttachment.value) {
		return
	}

	deleting.value = true

	try {
		await $fetch(`/api/admin/attachments/${pendingDeleteAttachment.value.id}`, {
			method: 'DELETE',
		})
		notifySuccess({ title: t('admin.attachments.notifications.deleted') })
		await refresh()
		if (selectedAttachment.value?.id === pendingDeleteAttachment.value.id) {
			selectedAttachment.value.status = 'DELETED'
		}
		deleteConfirmOpen.value = false
		pendingDeleteAttachment.value = null
	} catch (deleteError) {
		notifyError(deleteError, {
			title: t('admin.attachments.notifications.deleteFailed'),
		})
	} finally {
		deleting.value = false
	}
}
</script>
