<template>
	<PageInlineException
		v-if="error && !needsSearchCaptcha"
		class="site-shell pb-16"
		icon="i-lucide-cloud-off"
		:title="t('content.serverOverview.directories.states.loadFailed')"
	/>

	<ServerDirectoryTableShell
		v-else
		:title="t('content.serverOverview.directories.players.title')"
		:page="page"
		:page-size="pageSize"
		:total="pageMeta.total"
		:page-count="pageMeta.pageCount"
		@update:page="page = $event"
		@update:page-size="setPageSize"
	>
		<template #headerPrefix>
			<div class="mb-3 flex flex-wrap items-center gap-2">
				<UButton
					:to="localePath('/server')"
					color="primary"
					variant="ghost"
					icon="i-lucide-arrow-left"
					class="-ml-2"
				>
					{{ t('routes.server') }}
				</UButton>
			</div>
		</template>

		<template #filters>
			<UInput
				v-model="filters.search"
				icon="i-lucide-search"
				:placeholder="
					t('content.serverOverview.directories.players.filters.search')
				"
				class="lg:col-span-2"
			/>
			<USelect
				v-model="filters.status"
				:items="statusItems"
				:placeholder="
					t('content.serverOverview.directories.players.fields.identity')
				"
			/>
			<UInput
				v-model="filters.group"
				icon="i-lucide-shield"
				:placeholder="
					t('content.serverOverview.directories.players.filters.group')
				"
			/>
			<USelect
				v-model="filters.sortField"
				:items="sortFieldItems"
				:placeholder="t('admin.sort.field')"
			/>
			<div class="flex gap-3">
				<USelect
					v-model="filters.sortDirection"
					:items="sortDirectionItems"
					:placeholder="t('admin.sort.direction')"
					class="min-w-0 flex-1"
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
			v-else-if="players.length || pending"
			:data="players"
			:columns="columns"
			:loading="pending"
			class="min-h-72"
		>
			<template #player-cell="{ row }">
				<NuxtLink
					:to="localePath(`/players/${row.original.mcid}`)"
					class="flex min-w-0 items-center gap-3"
				>
					<SkeletonImage
						:src="getMinecraftHeadRendererUrl(row.original.username)"
						:alt="row.original.username"
						class="size-10 shrink-0 overflow-hidden rounded-md"
						image-class="size-10 object-cover"
						skeleton-class="rounded-md"
					/>
					<div class="min-w-0">
						<div class="flex items-center gap-2">
							<p class="truncate font-medium text-slate-900 dark:text-white">
								{{ row.original.username }}
							</p>
							<UBadge
								:color="
									row.original.identityKind === 'HISTORICAL'
										? 'warning'
										: 'primary'
								"
								variant="soft"
								size="xs"
							>
								{{
									row.original.identityKind === 'HISTORICAL'
										? t(
												'content.serverOverview.directories.players.identity.historical',
											)
										: t(
												'content.serverOverview.directories.players.identity.formal',
											)
								}}
							</UBadge>
						</div>
						<p v-if="row.original.uuid" class="truncate text-xs text-slate-500">
							{{ row.original.uuid }}
						</p>
					</div>
				</NuxtLink>
			</template>
			<template #linkedUser-cell="{ row }">
				<NuxtLink
					v-if="row.original.linkedUser"
					:to="localePath(`/u/${row.original.linkedUser.username}`)"
					class="flex min-w-0 items-center gap-2"
				>
					<UAvatar
						:src="row.original.linkedUser.avatarUrl || undefined"
						:alt="
							row.original.linkedUser.displayName ||
							row.original.linkedUser.username
						"
						size="xs"
					/>
					<span class="min-w-0">
						<span class="block truncate text-sm text-slate-900 dark:text-white">
							{{
								row.original.linkedUser.displayName ||
								row.original.linkedUser.username
							}}
						</span>
						<span class="block truncate text-xs text-slate-500">
							@{{ row.original.linkedUser.username }}
						</span>
					</span>
				</NuxtLink>
				<span v-else class="text-sm text-slate-500">
					{{ t('admin.players.empty.notLinked') }}
				</span>
			</template>
			<template #luckPermsPrimaryGroup-cell="{ row }">
				<UBadge
					v-if="row.original.luckPermsPrimaryGroup"
					color="neutral"
					variant="subtle"
				>
					{{ row.original.luckPermsPrimaryGroup }}
				</UBadge>
				<span v-else class="text-sm text-slate-500">
					{{ t('admin.players.empty.noGroup') }}
				</span>
			</template>
			<template #playTime-cell="{ row }">
				{{ formatPlayTime(row.original.playTimeTicks, row.original.hasStats) }}
			</template>
			<template #authMeRegisteredAt-cell="{ row }">
				{{ formatDate(row.original.authMeRegisteredAt) }}
			</template>
			<template #authMeLastLoginAt-cell="{ row }">
				{{ formatDate(row.original.authMeLastLoginAt) }}
			</template>
		</UTable>

		<div
			v-else
			class="p-8 text-center text-sm text-slate-500 dark:text-slate-400"
		>
			{{ t('content.serverOverview.directories.states.emptyPlayers') }}
		</div>
	</ServerDirectoryTableShell>
</template>

<script setup lang="ts">
import PageInlineException from '~/components/common/PageInlineException.vue'
import type { ServerDirectoryPlayersResponse } from '~/utils/server/directories'
import { useExplicitRouteTitle } from '~/utils/layout/route-display'
import { getMinecraftHeadRendererUrl } from '~/utils/minecraft/body-renderer'

definePageMeta({
	headerVariant: 'solid',
})

const { locale, t } = useI18n()
const { getErrorCode } = useApiError()
const localePath = useLocalePath()
const ALL_FILTER_VALUE = '__all__'
const page = ref(1)
const pageSize = ref(20)
const filters = reactive({
	search: '',
	status: ALL_FILTER_VALUE,
	group: '',
	sortField: 'authMeLastLoginAt',
	sortDirection: 'desc',
})
const getFilterQueryValue = (value: string): string | undefined =>
	value === ALL_FILTER_VALUE ? undefined : value
const playerStatusQueryMap: Record<
	string,
	{ linked?: string; identity?: string }
> = {
	[ALL_FILTER_VALUE]: {},
	linked: { linked: 'linked' },
	unlinked: { linked: 'unlinked' },
	formal: { identity: 'formal' },
	historical: { identity: 'historical' },
}
const query = computed(() => ({
	page: page.value,
	pageSize: pageSize.value,
	search: filters.search || undefined,
	...playerStatusQueryMap[
		getFilterQueryValue(filters.status) ?? ALL_FILTER_VALUE
	],
	group: filters.group || undefined,
	sortField: filters.sortField,
	sortDirection: filters.sortDirection,
}))
const { data, pending, error, refresh } =
	await useFetch<ServerDirectoryPlayersResponse>('/api/public/server/players', {
		query,
	})
const players = computed(() => data.value?.items ?? [])
const pageMeta = computed(() => ({
	total: data.value?.total ?? 0,
	pageCount: data.value?.pageCount ?? 1,
}))
const columns = [
	{
		accessorKey: 'player',
		header: t('content.serverOverview.directories.players.fields.player'),
	},
	{
		accessorKey: 'linkedUser',
		header: t('content.serverOverview.directories.players.fields.linkedUser'),
	},
	{
		accessorKey: 'luckPermsPrimaryGroup',
		header: t('content.serverOverview.directories.players.fields.group'),
	},
	{
		accessorKey: 'playTime',
		header: t('content.serverOverview.directories.players.fields.playTime'),
	},
	{
		accessorKey: 'authMeRegisteredAt',
		header: t('content.serverOverview.directories.players.fields.registeredAt'),
	},
	{
		accessorKey: 'authMeLastLoginAt',
		header: t('content.serverOverview.directories.players.fields.lastLogin'),
	},
]
const statusItems = [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	{ label: t('admin.players.filters.linked'), value: 'linked' },
	{ label: t('admin.players.filters.unlinked'), value: 'unlinked' },
	{
		label: t('content.serverOverview.directories.players.identity.formal'),
		value: 'formal',
	},
	{
		label: t('content.serverOverview.directories.players.identity.historical'),
		value: 'historical',
	},
]
const sortFieldItems = [
	{
		label: t('content.serverOverview.directories.players.fields.lastLogin'),
		value: 'authMeLastLoginAt',
	},
	{
		label: t('content.serverOverview.directories.players.fields.playTime'),
		value: 'playTimeTicks',
	},
	{
		label: t('content.serverOverview.directories.players.fields.player'),
		value: 'username',
	},
	{
		label: t('content.serverOverview.directories.players.fields.registeredAt'),
		value: 'authMeRegisteredAt',
	},
	{ label: t('admin.sort.fields.updatedAt'), value: 'updatedAt' },
]
const sortDirectionItems = [
	{ label: t('admin.sort.desc'), value: 'desc' },
	{ label: t('admin.sort.asc'), value: 'asc' },
]
const pageTitle = computed(() => t('routes.serverPlayers'))
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

const formatPlayTime = (ticks: number, hasStats: boolean): string => {
	if (!hasStats) {
		return t('content.serverOverview.states.notAvailable')
	}

	const hours = ticks / 20 / 3600
	return `${Math.round(hours * 10) / 10}h`
}

const resetFilters = (): void => {
	filters.search = ''
	filters.status = ALL_FILTER_VALUE
	filters.group = ''
	filters.sortField = 'authMeLastLoginAt'
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
