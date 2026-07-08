<template>
	<div>
		<div
			class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
		>
			<div>
				<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
					{{ t('admin.users.title') }}
				</h1>
			</div>
		</div>

		<div
			class="mt-8 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
		>
			<div
				class="grid gap-3 border-b border-slate-200 p-4 dark:border-slate-800 lg:grid-cols-6"
			>
				<UInput
					v-model="filters.search"
					icon="i-lucide-search"
					:placeholder="t('admin.users.filters.search')"
				/>
				<USelect
					v-model="filters.role"
					:items="roleItems"
					:placeholder="t('admin.users.fields.role')"
				/>
				<USelect
					v-model="filters.status"
					:items="statusItems"
					:placeholder="t('admin.users.fields.status')"
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
				:data="users"
				:columns="columns"
				:loading="pending"
				class="min-h-72"
			>
				<template #user-cell="{ row }">
					<button
						type="button"
						class="flex min-w-0 items-center gap-3 text-left"
						@click="openUser(row.original)"
					>
						<UAvatar
							:src="row.original.avatarUrl || undefined"
							:alt="row.original.displayName || row.original.username"
						/>
						<span class="min-w-0">
							<span
								class="block truncate font-medium text-slate-900 dark:text-white"
							>
								{{ row.original.displayName || row.original.username }}
							</span>
							<span class="block truncate text-xs text-slate-500">
								@{{ row.original.username }}
							</span>
						</span>
					</button>
				</template>
				<template #role-cell="{ row }">
					<UBadge color="neutral" variant="subtle">{{
						row.original.role
					}}</UBadge>
				</template>
				<template #status-cell="{ row }">
					<UBadge
						:color="userStatusColor(row.original.status)"
						variant="subtle"
					>
						{{ row.original.status }}
					</UBadge>
				</template>
				<template #hydrolineId-cell="{ row }">
					<span class="text-sm">{{ row.original.hydrolineId }}</span>
				</template>
				<template #createdAt-cell="{ row }">
					{{ formatDate(row.original.joinedAt) }}
				</template>
				<template #actions-cell="{ row }">
					<UButton
						type="button"
						size="xs"
						color="neutral"
						variant="ghost"
						icon="i-lucide-pencil"
						@click="openUser(row.original)"
					/>
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
	</div>
</template>

<script setup lang="ts">
import AdminTablePagination from '~/components/admin/AdminTablePagination.vue'
import type {
	AdminUser,
	AdminUsersResponse,
	AdminUserStatus,
} from '~/components/admin/types'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'admin-auth',
})

const { notifyError } = useAdminToast()
const { locale } = useI18n()
const localePath = useLocalePath()
const ALL_FILTER_VALUE = '__all__'
const page = ref(1)
const pageSize = ref(20)
const filters = reactive({
	search: '',
	role: ALL_FILTER_VALUE,
	status: ALL_FILTER_VALUE,
	sortField: 'joinedAt',
	sortDirection: 'desc',
})
const getFilterQueryValue = (value: string): string | undefined =>
	value === ALL_FILTER_VALUE ? undefined : value
const query = computed(() => ({
	page: page.value,
	pageSize: pageSize.value,
	search: filters.search || undefined,
	role: getFilterQueryValue(filters.role),
	status: getFilterQueryValue(filters.status),
	sortField: filters.sortField,
	sortDirection: filters.sortDirection,
}))
const { data, pending, error } = await useFetch<AdminUsersResponse>(
	'/api/admin/users',
	{
		query,
	},
)
const users = computed(() => data.value?.items ?? [])
const pageMeta = computed(() => ({
	total: data.value?.total ?? 0,
	pageCount: data.value?.pageCount ?? 1,
}))
const columns = [
	{ accessorKey: 'user', header: t('admin.users.fields.user') },
	{ accessorKey: 'role', header: t('admin.users.fields.role') },
	{ accessorKey: 'status', header: t('admin.users.fields.status') },
	{ accessorKey: 'hydrolineId', header: t('admin.users.fields.hydrolineId') },
	{ accessorKey: 'createdAt', header: t('admin.users.fields.createdAt') },
	{ id: 'actions', header: '' },
]
const roleItems = [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	{ label: 'USER', value: 'USER' },
	{ label: 'MEMBER', value: 'MEMBER' },
	{ label: 'ADMIN', value: 'ADMIN' },
	{ label: 'OWNER', value: 'OWNER' },
]
const statusItems = [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	{ label: 'PENDING', value: 'PENDING' },
	{ label: 'ACTIVE', value: 'ACTIVE' },
	{ label: 'DISABLED', value: 'DISABLED' },
	{ label: 'BANNED', value: 'BANNED' },
]
const sortFieldItems = [
	{ label: t('admin.users.fields.createdAt'), value: 'joinedAt' },
	{ label: t('admin.sort.fields.updatedAt'), value: 'updatedAt' },
	{ label: t('admin.users.fields.username'), value: 'username' },
	{ label: t('admin.users.fields.displayName'), value: 'displayName' },
	{ label: t('admin.users.fields.hydrolineId'), value: 'hydrolineId' },
	{ label: t('admin.users.fields.role'), value: 'role' },
	{ label: t('admin.users.fields.status'), value: 'status' },
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

const userStatusColor = (status: AdminUserStatus) =>
	status === 'ACTIVE' ? 'success' : status === 'PENDING' ? 'warning' : 'error'

const formatDate = (value: string): string =>
	new Intl.DateTimeFormat(locale.value, {
		dateStyle: 'short',
		timeStyle: 'short',
	}).format(new Date(value))

const resetFilters = (): void => {
	filters.search = ''
	filters.role = ALL_FILTER_VALUE
	filters.status = ALL_FILTER_VALUE
	filters.sortField = 'joinedAt'
	filters.sortDirection = 'desc'
}

const setPageSize = (value: number): void => {
	pageSize.value = value
	page.value = 1
}

const openUser = (user: AdminUser): void => {
	navigateTo(localePath(`/admin/users/${user.id}`))
}
</script>
