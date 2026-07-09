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
		<template #headerPrefix>
			<UButton
				:to="localePath('/server')"
				color="primary"
				variant="ghost"
				icon="i-lucide-arrow-left"
				class="-ml-2 mb-3"
			>
				{{ t('routes.server') }}
			</UButton>
		</template>

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
						<span class="flex items-center gap-2">
							<span class="truncate font-medium text-slate-900 dark:text-white">
								{{ row.original.displayName || row.original.username }}
							</span>
							<UTooltip
								v-if="row.original.verified.enabled"
								:text="verifiedText(row.original.verified)"
							>
								<UIcon
									name="i-lucide-badge-check"
									class="size-4 shrink-0 text-sky-500"
								/>
							</UTooltip>
							<UBadge
								v-for="badge in visibleBadges(row.original)"
								:key="badge.id"
								color="neutral"
								variant="subtle"
								class="max-w-full gap-1 rounded-md px-2 py-1 text-xs font-semibold"
								:class="getProfileBadgeStyle(badge.color).class"
							>
								<UIcon
									:name="getProfileBadgeStyle(badge.color).icon"
									class="size-3.5 shrink-0"
									:class="getProfileBadgeStyle(badge.color).iconClass"
								/>
								<span class="truncate">
									{{ badgeLabel(badge) }}
								</span>
							</UBadge>
						</span>
						<span class="block truncate text-xs text-slate-500">
							@{{ row.original.username }}
						</span>
					</span>
				</NuxtLink>
			</template>
			<template #hydrolineId-cell="{ row }">
				<span
					v-if="row.original.hydrolineId"
					class="text-sm text-slate-900 dark:text-white"
				>
					{{ row.original.hydrolineId }}
				</span>
				<span v-else class="text-sm text-slate-500">
					{{ t('content.serverOverview.states.notAvailable') }}
				</span>
			</template>
			<template #minecraftAccounts-cell="{ row }">
				<div
					v-if="row.original.minecraftAccounts.length"
					class="flex flex-wrap items-center gap-1.5"
				>
					<UTooltip
						v-for="account in row.original.minecraftAccounts"
						:key="account.mcid"
						:text="account.username"
					>
						<NuxtLink
							:to="localePath(`/players/${account.mcid}`)"
							class="inline-flex"
						>
							<SkeletonImage
								:src="getMinecraftHeadRendererUrl(account.username)"
								:alt="account.username"
								class="size-7 shrink-0 overflow-hidden rounded-md"
								image-class="size-7 object-cover"
								skeleton-class="rounded-md"
							/>
						</NuxtLink>
					</UTooltip>
				</div>
				<span v-else class="text-sm text-slate-500">
					{{ t('content.serverOverview.states.notAvailable') }}
				</span>
			</template>
			<template #playTime-cell="{ row }">
				{{
					formatPlayTime(row.original.playTimeTicks, row.original.hasPlayTime)
				}}
			</template>
			<template #registeredAt-cell="{ row }">
				{{ formatDate(row.original.registeredAt) }}
			</template>
			<template #joinedAt-cell="{ row }">
				{{ formatDateOnly(row.original.joinedAt) }}
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
import type {
	ServerDirectoryUserBadgeSummary,
	ServerDirectoryUserItem,
	ServerDirectoryUserVerifiedSummary,
	ServerDirectoryUsersResponse,
} from '~/utils/server/directories'
import { useExplicitRouteTitle } from '~/utils/layout/route-display'
import { getMinecraftHeadRendererUrl } from '~/utils/minecraft/body-renderer'
import { getProfileBadgeStyle } from '~/utils/profile/badges'

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
		accessorKey: 'hydrolineId',
		header: t('content.serverOverview.directories.users.fields.hydrolineId'),
	},
	{
		accessorKey: 'playTime',
		header: t('content.serverOverview.directories.users.fields.playTime'),
	},
	{
		accessorKey: 'minecraftAccounts',
		header: t(
			'content.serverOverview.directories.users.fields.minecraftAccounts',
		),
	},
	{
		accessorKey: 'registeredAt',
		header: t('content.serverOverview.directories.users.fields.registeredAt'),
	},
	{
		accessorKey: 'joinedAt',
		header: t('content.serverOverview.directories.users.fields.joinedAt'),
	},
]
const sortFieldItems = [
	{
		label: t('content.serverOverview.directories.users.fields.registeredAt'),
		value: 'createdAt',
	},
	{
		label: t('content.serverOverview.directories.users.fields.playTime'),
		value: 'playTimeTicks',
	},
	{
		label: t('content.serverOverview.directories.users.fields.joinedAt'),
		value: 'joinedAt',
	},
	{
		label: t('content.serverOverview.directories.users.fields.hydrolineId'),
		value: 'hydrolineId',
	},
	{ label: t('admin.users.fields.username'), value: 'username' },
	{ label: t('admin.users.fields.displayName'), value: 'displayName' },
	{ label: t('admin.sort.fields.updatedAt'), value: 'updatedAt' },
]
const sortDirectionItems = [
	{ label: t('admin.sort.desc'), value: 'desc' },
	{ label: t('admin.sort.asc'), value: 'asc' },
]
const pageTitle = computed(() => t('routes.serverUsers'))
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

const formatDateOnly = (value: string | null): string => {
	if (!value) {
		return t('content.serverOverview.states.notAvailable')
	}

	return new Intl.DateTimeFormat(locale.value, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(new Date(value))
}

const formatPlayTime = (ticks: number, hasPlayTime: boolean): string => {
	if (!hasPlayTime) {
		return t('content.serverOverview.states.notAvailable')
	}

	const hours = ticks / 20 / 3600
	return `${Math.round(hours * 10) / 10}h`
}

const visibleBadges = (
	user: ServerDirectoryUserItem,
): ServerDirectoryUserBadgeSummary[] => [
	...user.badges,
	...(user.roleBadge ? [user.roleBadge] : []),
]

const verifiedText = (verified: ServerDirectoryUserVerifiedSummary): string => {
	if (locale.value === 'zh-TW') {
		return verified.textZhTw || verified.textZhCn || t('profile.verified.text')
	}

	if (locale.value === 'en-US') {
		return verified.textEnUs || verified.textZhCn || t('profile.verified.text')
	}

	if (locale.value === 'ja-JP') {
		return verified.textJaJp || verified.textZhCn || t('profile.verified.text')
	}

	return verified.textZhCn || t('profile.verified.text')
}

const badgeLabel = (badge: ServerDirectoryUserBadgeSummary): string => {
	if (badge.key === 'server-member') {
		return t('profile.badges.serverMember')
	}

	if (locale.value === 'zh-TW') {
		return badge.labelZhTw || badge.labelZhCn || badge.label
	}

	if (locale.value === 'en-US') {
		return badge.labelEnUs || badge.labelZhCn || badge.label
	}

	if (locale.value === 'ja-JP') {
		return badge.labelJaJp || badge.labelZhCn || badge.label
	}

	return badge.labelZhCn || badge.label
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
