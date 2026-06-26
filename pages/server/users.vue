<template>
	<PageInlineException
		v-if="error && !needsSearchCaptcha"
		class="site-shell pb-16"
		icon="i-lucide-cloud-off"
		:title="t('content.serverOverview.directories.states.loadFailed')"
	/>

	<ServerDirectoryTableShell
		v-else
		:title="t('content.serverOverview.directories.users.title')"
		:page="page"
		:page-size="pageSize"
		:total="pageMeta.total"
		:page-count="pageMeta.pageCount"
		@update:page="page = $event"
		@update:page-size="setPageSize"
	>
		<template #filters>
			<UInput
				v-model="filters.search"
				icon="i-lucide-search"
				:placeholder="
					t('content.serverOverview.directories.users.filters.search')
				"
				class="lg:col-span-3"
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
		</template>

		<ServerDirectorySearchCaptchaCard
			v-if="needsSearchCaptcha"
			:title="t('content.serverOverview.directories.searchCaptcha.title')"
			:description="
				t('content.serverOverview.directories.searchCaptcha.description')
			"
			@verified="handleSearchCaptchaVerified"
		/>

		<UTable
			v-else-if="users.length || pending"
			:data="users"
			:columns="columns"
			:loading="pending"
			class="min-h-72"
		>
			<template #user-cell="{ row }">
				<NuxtLink
					:to="localePath(`/u/${row.original.username}`)"
					class="flex min-w-0 items-center gap-3 text-left"
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
				</NuxtLink>
			</template>
			<template #minecraft-cell="{ row }">
				<NuxtLink
					v-if="row.original.minecraft"
					:to="localePath(`/players/${row.original.minecraft.mcid}`)"
					class="inline-flex items-center gap-2 text-sm text-slate-900 dark:text-white"
				>
					<SkeletonImage
						:src="getMinecraftHeadRendererUrl(row.original.minecraft.username)"
						:alt="row.original.minecraft.username"
						class="size-7 shrink-0 overflow-hidden rounded-md"
						image-class="size-7 object-cover"
						skeleton-class="rounded-md"
					/>
					<span class="truncate">{{ row.original.minecraft.username }}</span>
				</NuxtLink>
				<span v-else class="text-sm text-slate-500">
					{{ t('content.serverOverview.states.notAvailable') }}
				</span>
			</template>
			<template #joinedAt-cell="{ row }">
				{{ formatDate(row.original.joinedAt) }}
			</template>
		</UTable>

		<div
			v-else
			class="p-8 text-center text-sm text-slate-500 dark:text-slate-400"
		>
			{{ t('content.serverOverview.directories.states.emptyUsers') }}
		</div>
	</ServerDirectoryTableShell>
</template>

<script setup lang="ts">
import PageInlineException from '~/components/common/PageInlineException.vue'
import type { ServerDirectoryUsersResponse } from '~/utils/server/directories'
import { useExplicitRouteTitle } from '~/utils/layout/route-display'
import { getMinecraftHeadRendererUrl } from '~/utils/minecraft/body-renderer'

definePageMeta({
	headerVariant: 'solid',
})

const { locale, t } = useI18n()
const { getErrorCode } = useApiError()
const localePath = useLocalePath()
const page = ref(1)
const pageSize = ref(20)
const filters = reactive({
	search: '',
	sortField: 'joinedAt',
	sortDirection: 'desc',
})
const query = computed(() => ({
	page: page.value,
	pageSize: pageSize.value,
	search: filters.search || undefined,
	sortField: filters.sortField,
	sortDirection: filters.sortDirection,
}))
const { data, pending, error, refresh } =
	await useFetch<ServerDirectoryUsersResponse>('/api/public/server/users', {
		query,
	})
const users = computed(() => data.value?.items ?? [])
const pageMeta = computed(() => ({
	total: data.value?.total ?? 0,
	pageCount: data.value?.pageCount ?? 1,
}))
const columns = [
	{
		accessorKey: 'user',
		header: t('content.serverOverview.directories.users.fields.user'),
	},
	{
		accessorKey: 'minecraft',
		header: t('content.serverOverview.directories.users.fields.minecraft'),
	},
	{
		accessorKey: 'joinedAt',
		header: t('content.serverOverview.directories.users.fields.joinedAt'),
	},
]
const sortFieldItems = [
	{
		label: t('content.serverOverview.directories.users.fields.joinedAt'),
		value: 'joinedAt',
	},
	{ label: t('admin.users.fields.username'), value: 'username' },
	{ label: t('admin.users.fields.displayName'), value: 'displayName' },
	{ label: t('admin.sort.fields.updatedAt'), value: 'updatedAt' },
]
const sortDirectionItems = [
	{ label: t('admin.sort.desc'), value: 'desc' },
	{ label: t('admin.sort.asc'), value: 'asc' },
]
const pageTitle = computed(() =>
	t('content.serverOverview.directories.users.title'),
)
const errorCode = computed(() =>
	error.value ? getErrorCode(error.value) : null,
)
const needsSearchCaptcha = computed(
	() =>
		filters.search.trim().length > 0 &&
		errorCode.value === 'DIRECTORY_SEARCH_CAPTCHA_REQUIRED',
)

useExplicitRouteTitle(pageTitle)

watch(
	() => ({ ...filters }),
	() => {
		page.value = 1
	},
	{ deep: true },
)

const formatDate = (value: string | null): string => {
	if (!value) {
		return t('content.serverOverview.states.notAvailable')
	}

	return new Intl.DateTimeFormat(locale.value, {
		dateStyle: 'short',
		timeStyle: 'short',
	}).format(new Date(value))
}

const resetFilters = (): void => {
	filters.search = ''
	filters.sortField = 'joinedAt'
	filters.sortDirection = 'desc'
}

const setPageSize = (value: number): void => {
	pageSize.value = value
	page.value = 1
}

const handleSearchCaptchaVerified = async (): Promise<void> => {
	await refresh()
}
</script>
