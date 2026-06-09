<template>
	<div class="-mt-2">
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
					<span class="font-mono text-xs">{{ row.original.hydrolineId }}</span>
				</template>
				<template #createdAt-cell="{ row }">
					{{ formatDate(row.original.createdAt) }}
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

		<UModal
			:open="modalOpen"
			:ui="{ content: 'max-w-3xl', body: 'p-0' }"
			@update:open="modalOpen = $event"
		>
			<template #content>
				<form
					v-if="selectedUser"
					class="max-h-[86dvh] overflow-y-auto p-5 sm:p-6"
					@submit.prevent="saveUser"
				>
					<div class="flex items-start justify-between gap-4">
						<div class="flex min-w-0 items-center gap-4">
							<UAvatar
								:src="selectedUser.avatarUrl || undefined"
								:alt="selectedUser.displayName || selectedUser.username"
								size="3xl"
							/>
							<div class="min-w-0">
								<h2
									class="truncate text-2xl font-semibold text-slate-950 dark:text-white"
								>
									{{ selectedUser.displayName || selectedUser.username }}
								</h2>
								<p class="mt-1 font-mono text-xs text-slate-500">
									{{ selectedUser.id }}
								</p>
							</div>
						</div>
						<UButton
							type="button"
							color="neutral"
							variant="ghost"
							icon="i-lucide-x"
							@click="modalOpen = false"
						/>
					</div>

					<div class="mt-6 grid gap-5">
						<section class="admin-section">
							<h3 class="admin-section-title">
								{{ t('admin.users.sections.identity') }}
							</h3>
							<div class="grid gap-4 md:grid-cols-2">
								<label class="admin-field">
									<span>{{ t('admin.users.fields.username') }}</span>
									<UInput v-model="form.username" />
								</label>
								<label class="admin-field">
									<span>{{ t('admin.users.fields.displayName') }}</span>
									<UInput v-model="form.displayName" />
								</label>
								<label class="admin-field">
									<span>{{ t('admin.users.fields.role') }}</span>
									<USelect v-model="form.role" :items="roleItemsWithoutAll" />
								</label>
								<label class="admin-field">
									<span>{{ t('admin.users.fields.status') }}</span>
									<USelect
										v-model="form.status"
										:items="statusItemsWithoutAll"
									/>
								</label>
								<label class="admin-field md:col-span-2">
									<span>{{ t('admin.users.fields.statusReason') }}</span>
									<UInput v-model="form.statusReason" />
								</label>
								<label class="admin-field md:col-span-2">
									<span>{{ t('admin.users.fields.title') }}</span>
									<UInput v-model="form.title" />
								</label>
								<label class="admin-field md:col-span-2">
									<span>{{ t('admin.users.fields.verified') }}</span>
									<USwitch v-model="form.verified" />
								</label>
							</div>
						</section>

						<section class="admin-section">
							<h3 class="admin-section-title">
								{{ t('admin.users.sections.profile') }}
							</h3>
							<div class="grid gap-4 md:grid-cols-2">
								<label class="admin-field md:col-span-2">
									<span>{{ t('admin.users.fields.bio') }}</span>
									<UTextarea v-model="form.bio" :rows="4" />
								</label>
								<label class="admin-field">
									<span>{{ t('admin.users.fields.location') }}</span>
									<UInput v-model="form.location" />
								</label>
								<label class="admin-field">
									<span>{{ t('admin.users.fields.countryOrRegion') }}</span>
									<USelect
										v-model="form.countryOrRegion"
										:items="countryItems"
									/>
								</label>
								<label class="admin-field">
									<span>{{ t('admin.users.fields.birthday') }}</span>
									<UInput v-model="form.birthday" type="date" />
								</label>
							</div>
						</section>

						<section class="admin-section">
							<h3 class="admin-section-title">
								{{ t('admin.users.sections.attachments') }}
							</h3>
							<div class="grid gap-4">
								<div class="grid gap-3 md:grid-cols-2">
									<div class="admin-image-preview">
										<span>{{ t('admin.users.fields.avatarUrl') }}</span>
										<div class="admin-media-frame">
											<USkeleton
												v-if="avatarPreviewUrl && !avatarPreviewReady"
												class="absolute inset-0"
											/>
											<img
												v-if="avatarPreviewUrl && !avatarPreviewFailed"
												:src="avatarPreviewUrl"
												:alt="selectedUser.displayName || selectedUser.username"
												class="h-full w-full object-cover transition-opacity duration-200"
												:class="
													avatarPreviewReady ? 'opacity-100' : 'opacity-0'
												"
												loading="lazy"
												decoding="async"
												@load="avatarPreviewReady = true"
												@error="markAvatarPreviewFailed"
											/>
											<div v-else class="admin-media-empty">
												<UIcon name="i-lucide-image-off" class="h-5 w-5" />
												<span>{{
													form.resetAvatar
														? t('admin.users.media.avatarReset')
														: t('admin.users.media.avatarEmpty')
												}}</span>
											</div>
										</div>
										<UButton
											type="button"
											size="sm"
											color="neutral"
											variant="soft"
											icon="i-lucide-rotate-ccw"
											block
											@click="form.resetAvatar = true"
										>
											{{ t('admin.users.actions.resetAvatar') }}
										</UButton>
									</div>
									<div class="admin-image-preview">
										<span>{{ t('admin.users.fields.coverUrl') }}</span>
										<div class="admin-media-frame">
											<USkeleton
												v-if="coverPreviewUrl && !coverPreviewReady"
												class="absolute inset-0"
											/>
											<img
												v-if="coverPreviewUrl && !coverPreviewFailed"
												:src="coverPreviewUrl"
												:alt="selectedUser.displayName || selectedUser.username"
												class="h-full w-full object-cover transition-opacity duration-200"
												:class="coverPreviewReady ? 'opacity-100' : 'opacity-0'"
												loading="lazy"
												decoding="async"
												@load="coverPreviewReady = true"
												@error="markCoverPreviewFailed"
											/>
											<div v-else class="admin-media-empty">
												<UIcon name="i-lucide-image-off" class="h-5 w-5" />
												<span>{{
													form.resetCover
														? t('admin.users.media.coverReset')
														: t('admin.users.media.coverEmpty')
												}}</span>
											</div>
										</div>
										<UButton
											type="button"
											size="sm"
											color="neutral"
											variant="soft"
											icon="i-lucide-rotate-ccw"
											block
											@click="form.resetCover = true"
										>
											{{ t('admin.users.actions.resetCover') }}
										</UButton>
									</div>
								</div>
								<div class="admin-field">
									<span>{{ t('admin.users.fields.avatarAttachmentId') }}</span>
									<strong class="break-all font-mono text-xs">{{
										selectedUser.avatarAttachmentId || '-'
									}}</strong>
								</div>
								<div class="admin-field">
									<span>{{ t('admin.users.fields.coverAttachmentId') }}</span>
									<strong class="break-all font-mono text-xs">{{
										selectedUser.coverAttachmentId || '-'
									}}</strong>
								</div>
								<div class="admin-field">
									<span>{{ t('admin.users.fields.avatarUrl') }}</span>
									<strong class="break-all font-mono text-xs">{{
										selectedUser.avatarUrl || '-'
									}}</strong>
								</div>
								<div class="admin-field">
									<span>{{ t('admin.users.fields.coverUrl') }}</span>
									<strong class="break-all font-mono text-xs">{{
										selectedUser.coverUrl || '-'
									}}</strong>
								</div>
							</div>
						</section>

						<section class="admin-section">
							<h3 class="admin-section-title">
								{{ t('admin.users.sections.preferences') }}
							</h3>
							<div class="grid gap-4 md:grid-cols-2">
								<label class="admin-field">
									<span>{{ t('admin.users.fields.language') }}</span>
									<USelect
										v-model="form.preferences.language"
										:items="languageItems"
									/>
								</label>
								<label class="admin-field">
									<span>{{ t('admin.users.fields.timezoneMode') }}</span>
									<USelect
										v-model="form.preferences.timezoneMode"
										:items="timezoneModeItems"
									/>
								</label>
								<label class="admin-field md:col-span-2">
									<span>{{ t('admin.users.fields.timezone') }}</span>
									<USelect
										v-model="form.preferences.timezone"
										:items="timezoneItems"
									/>
								</label>
							</div>
						</section>

						<section class="admin-section">
							<h3 class="admin-section-title">
								{{ t('admin.users.sections.social') }}
							</h3>
							<div class="grid gap-4 md:grid-cols-2">
								<label class="admin-field">
									<span>GitHub</span>
									<UInput v-model="form.social.githubUsername" />
								</label>
								<label class="admin-field">
									<span>Wiki</span>
									<UInput v-model="form.social.h2wikiPageName" />
								</label>
								<label class="admin-field">
									<span>{{ t('admin.users.fields.websiteUrl') }}</span>
									<UInput v-model="form.social.websiteUrl" />
								</label>
								<label class="admin-field">
									<span>Bilibili</span>
									<UInput v-model="form.social.bilibiliUrl" />
								</label>
								<label class="admin-field md:col-span-2">
									<span>{{ t('admin.users.fields.publicEmail') }}</span>
									<UInput v-model="form.social.publicEmail" />
								</label>
							</div>
						</section>

						<section class="admin-section">
							<h3 class="admin-section-title">
								{{ t('admin.users.sections.achievements') }}
							</h3>
							<div class="grid gap-4">
								<div class="grid gap-2">
									<span class="text-sm text-slate-500 dark:text-slate-400">
										{{ t('admin.users.fields.badges') }}
									</span>
									<label
										v-for="badge in availableBadges"
										:key="badge.id"
										class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700"
									>
										<span class="text-slate-800 dark:text-slate-100">
											{{ badge.labelZhCn }}
										</span>
										<UCheckbox
											:model-value="form.badgeIds.includes(badge.id)"
											@update:model-value="toggleBadge(badge.id, $event)"
										/>
									</label>
								</div>
								<div class="grid gap-4 md:grid-cols-2">
									<label class="admin-field">
										<span>简体中文</span>
										<UInput v-model="form.verifiedTextZhCn" />
									</label>
									<label class="admin-field">
										<span>繁體中文</span>
										<UInput v-model="form.verifiedTextZhTw" />
									</label>
									<label class="admin-field">
										<span>English</span>
										<UInput v-model="form.verifiedTextEnUs" />
									</label>
									<label class="admin-field">
										<span>日本語</span>
										<UInput v-model="form.verifiedTextJaJp" />
									</label>
								</div>
							</div>
						</section>

						<section class="admin-section">
							<h3 class="admin-section-title">
								{{ t('admin.users.sections.privacy') }}
							</h3>
							<div class="grid gap-3 md:grid-cols-3">
								<label
									v-for="item in privacyItems"
									:key="item.key"
									class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"
								>
									<span>{{ item.label }}</span>
									<USwitch v-model="form.privacy[item.key]" />
								</label>
							</div>
						</section>
					</div>

					<div
						class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
					>
						<UButton
							type="button"
							color="neutral"
							variant="ghost"
							@click="modalOpen = false"
						>
							{{ t('admin.actions.cancel') }}
						</UButton>
						<UButton type="submit" icon="i-lucide-save" :loading="saving">
							{{ t('admin.actions.save') }}
						</UButton>
					</div>
				</form>
			</template>
		</UModal>
	</div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import AdminTablePagination from '~/components/admin/AdminTablePagination.vue'
import {
	countryItems,
	languageItems,
	privacyItems,
	timezoneItems,
	type PrivacyKey,
	type ProfileLanguage,
	type TimezoneMode,
} from '~/utils/profile-edit'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'admin-auth',
})

type UserRole = 'USER' | 'MEMBER' | 'ADMIN' | 'OWNER'
type UserStatus = 'PENDING' | 'ACTIVE' | 'DISABLED' | 'BANNED'

interface AdminUser {
	id: string
	username: string
	hydrolineId: string
	displayName: string | null
	email: string | null
	avatarUrl: string | null
	coverUrl: string | null
	avatarAttachmentId: string | null
	coverAttachmentId: string | null
	bio: string | null
	location: string | null
	countryOrRegion: string | null
	birthday: string | null
	role: UserRole
	status: UserStatus
	statusReason: string | null
	title: string | null
	verified: boolean
	verifiedTextZhCn: string | null
	verifiedTextZhTw: string | null
	verifiedTextEnUs: string | null
	verifiedTextJaJp: string | null
	createdAt: string
	updatedAt: string
	profile: {
		h2wikiPageName: string | null
		githubUsername: string | null
		websiteUrl: string | null
		bilibiliUrl: string | null
		publicEmail: string | null
	} | null
	preferences: {
		language: ProfileLanguage
		timezoneMode: TimezoneMode
		timezone: string | null
	} | null
	privacy: Record<PrivacyKey, boolean> | null
	badges: Array<{
		id: string
		badgeId: string | null
		label: string | null
		color: string | null
		sortOrder: number
	}>
}

interface AdminUsersResponse {
	items: AdminUser[]
	page: number
	pageSize: number
	total: number
	pageCount: number
}

interface AdminBadge {
	id: string
	labelZhCn: string
	color: string
	enabled: boolean
}

interface AdminAchievementsResponse {
	badges: AdminBadge[]
}

interface AdminUserForm {
	username: string
	displayName: string
	bio: string
	location: string
	countryOrRegion: string
	birthday: string
	role: UserRole
	status: UserStatus
	statusReason: string
	title: string
	verified: boolean
	verifiedTextZhCn: string
	verifiedTextZhTw: string
	verifiedTextEnUs: string
	verifiedTextJaJp: string
	resetAvatar: boolean
	resetCover: boolean
	badgeIds: string[]
	preferences: {
		language: ProfileLanguage
		timezoneMode: TimezoneMode
		timezone: string
	}
	social: {
		h2wikiPageName: string
		githubUsername: string
		websiteUrl: string
		bilibiliUrl: string
		publicEmail: string
	}
	privacy: Record<PrivacyKey, boolean>
}

const createEmptyForm = (): AdminUserForm => ({
	username: '',
	displayName: '',
	bio: '',
	location: '',
	countryOrRegion: '',
	birthday: '',
	role: 'USER',
	status: 'ACTIVE',
	statusReason: '',
	title: '',
	verified: false,
	verifiedTextZhCn: '',
	verifiedTextZhTw: '',
	verifiedTextEnUs: '',
	verifiedTextJaJp: '',
	resetAvatar: false,
	resetCover: false,
	badgeIds: [],
	preferences: {
		language: 'ZH_CN',
		timezoneMode: 'AUTO',
		timezone: 'Asia/Shanghai',
	},
	social: {
		h2wikiPageName: '',
		githubUsername: '',
		websiteUrl: '',
		bilibiliUrl: '',
		publicEmail: '',
	},
	privacy: Object.fromEntries(
		privacyItems.map((item) => [item.key, true]),
	) as Record<PrivacyKey, boolean>,
})

const { notifyError, notifySuccess } = useAdminToast()
const { locale } = useI18n()
const ALL_FILTER_VALUE = '__all__'
const page = ref(1)
const pageSize = ref(20)
const filters = reactive({
	search: '',
	role: ALL_FILTER_VALUE,
	status: ALL_FILTER_VALUE,
	sortField: 'createdAt',
	sortDirection: 'desc',
})
const modalOpen = ref(false)
const saving = ref(false)
const selectedUser = ref<AdminUser | null>(null)
const avatarPreviewReady = ref(false)
const avatarPreviewFailed = ref(false)
const coverPreviewReady = ref(false)
const coverPreviewFailed = ref(false)
const form = reactive(createEmptyForm())
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
const { data, pending, error, refresh } = await useFetch<AdminUsersResponse>(
	'/api/admin/users',
	{
		query,
	},
)
const { data: achievementsData } = await useFetch<AdminAchievementsResponse>(
	'/api/admin/achievements',
)
const users = computed(() => data.value?.items ?? [])
const availableBadges = computed(() =>
	(achievementsData.value?.badges ?? []).filter((badge) => badge.enabled),
)
const avatarPreviewUrl = computed(() =>
	form.resetAvatar ? '' : selectedUser.value?.avatarUrl || '',
)
const coverPreviewUrl = computed(() =>
	form.resetCover ? '' : selectedUser.value?.coverUrl || '',
)
const pageMeta = computed(() => ({
	total: data.value?.total ?? 0,
	pageCount: data.value?.pageCount ?? 1,
}))
const columns = [
	{ accessorKey: 'user', header: t('admin.users.fields.user') },
	{ accessorKey: 'role', header: t('admin.users.fields.role') },
	{ accessorKey: 'status', header: t('admin.users.fields.status') },
	{ accessorKey: 'hydrolineId', header: 'Hydroline ID' },
	{ accessorKey: 'createdAt', header: t('admin.users.fields.createdAt') },
	{ id: 'actions', header: '' },
]
const roleItemsWithoutAll = [
	{ label: 'USER', value: 'USER' },
	{ label: 'MEMBER', value: 'MEMBER' },
	{ label: 'ADMIN', value: 'ADMIN' },
	{ label: 'OWNER', value: 'OWNER' },
]
const statusItemsWithoutAll = [
	{ label: 'PENDING', value: 'PENDING' },
	{ label: 'ACTIVE', value: 'ACTIVE' },
	{ label: 'DISABLED', value: 'DISABLED' },
	{ label: 'BANNED', value: 'BANNED' },
]
const roleItems = [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	...roleItemsWithoutAll,
]
const statusItems = [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	...statusItemsWithoutAll,
]
const sortFieldItems = [
	{ label: t('admin.users.fields.createdAt'), value: 'createdAt' },
	{ label: t('admin.sort.fields.updatedAt'), value: 'updatedAt' },
	{ label: t('admin.users.fields.username'), value: 'username' },
	{ label: t('admin.users.fields.displayName'), value: 'displayName' },
	{ label: 'Hydroline ID', value: 'hydrolineId' },
	{ label: t('admin.users.fields.role'), value: 'role' },
	{ label: t('admin.users.fields.status'), value: 'status' },
]
const sortDirectionItems = [
	{ label: t('admin.sort.desc'), value: 'desc' },
	{ label: t('admin.sort.asc'), value: 'asc' },
]
const timezoneModeItems = [
	{ label: 'AUTO', value: 'AUTO' },
	{ label: 'MANUAL', value: 'MANUAL' },
]

watch(error, (value) => value && notifyError(value), { immediate: true })
watch(
	() => ({ ...filters }),
	() => {
		page.value = 1
	},
	{ deep: true },
)
watch(avatarPreviewUrl, () => {
	avatarPreviewReady.value = false
	avatarPreviewFailed.value = false
})
watch(coverPreviewUrl, () => {
	coverPreviewReady.value = false
	coverPreviewFailed.value = false
})

const userStatusColor = (status: UserStatus) =>
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
	filters.sortField = 'createdAt'
	filters.sortDirection = 'desc'
}

const setPageSize = (value: number): void => {
	pageSize.value = value
	page.value = 1
}

const markAvatarPreviewFailed = (): void => {
	avatarPreviewReady.value = true
	avatarPreviewFailed.value = true
}

const markCoverPreviewFailed = (): void => {
	coverPreviewReady.value = true
	coverPreviewFailed.value = true
}

const assignForm = (user: AdminUser): void => {
	form.username = user.username
	form.displayName = user.displayName ?? ''
	form.bio = user.bio ?? ''
	form.location = user.location ?? ''
	form.countryOrRegion = user.countryOrRegion ?? ''
	form.birthday = user.birthday ? dayjs(user.birthday).format('YYYY-MM-DD') : ''
	form.role = user.role
	form.status = user.status
	form.statusReason = user.statusReason ?? ''
	form.title = user.title ?? ''
	form.verified = user.verified
	form.verifiedTextZhCn = user.verifiedTextZhCn ?? ''
	form.verifiedTextZhTw = user.verifiedTextZhTw ?? ''
	form.verifiedTextEnUs = user.verifiedTextEnUs ?? ''
	form.verifiedTextJaJp = user.verifiedTextJaJp ?? ''
	form.resetAvatar = false
	form.resetCover = false
	form.badgeIds = user.badges
		.map((badge) => badge.badgeId)
		.filter((badgeId): badgeId is string => Boolean(badgeId))
	form.preferences.language = user.preferences?.language ?? 'ZH_CN'
	form.preferences.timezoneMode = user.preferences?.timezoneMode ?? 'AUTO'
	form.preferences.timezone = user.preferences?.timezone ?? 'Asia/Shanghai'
	form.social.h2wikiPageName = user.profile?.h2wikiPageName ?? ''
	form.social.githubUsername = user.profile?.githubUsername ?? ''
	form.social.websiteUrl = user.profile?.websiteUrl ?? ''
	form.social.bilibiliUrl = user.profile?.bilibiliUrl ?? ''
	form.social.publicEmail = user.profile?.publicEmail ?? ''

	for (const item of privacyItems) {
		form.privacy[item.key] = user.privacy?.[item.key] ?? true
	}
}

const toggleBadge = (
	badgeId: string,
	checked: boolean | 'indeterminate',
): void => {
	if (checked === true && !form.badgeIds.includes(badgeId)) {
		form.badgeIds.push(badgeId)
		return
	}

	if (checked !== true) {
		form.badgeIds = form.badgeIds.filter((item) => item !== badgeId)
	}
}

const openUser = (user: AdminUser): void => {
	selectedUser.value = user
	assignForm(user)
	modalOpen.value = true
}

const saveUser = async (): Promise<void> => {
	if (!selectedUser.value) {
		return
	}

	saving.value = true

	try {
		const updated = await $fetch<AdminUser>(
			`/api/admin/users/${selectedUser.value.id}`,
			{
				method: 'PATCH',
				body: {
					username: form.username,
					displayName: form.displayName,
					bio: form.bio,
					location: form.location,
					countryOrRegion: form.countryOrRegion,
					birthday: form.birthday || null,
					role: form.role,
					status: form.status,
					statusReason: form.statusReason,
					title: form.title,
					verified: form.verified,
					verifiedTextZhCn: form.verifiedTextZhCn,
					verifiedTextZhTw: form.verifiedTextZhTw,
					verifiedTextEnUs: form.verifiedTextEnUs,
					verifiedTextJaJp: form.verifiedTextJaJp,
					resetAvatar: form.resetAvatar,
					resetCover: form.resetCover,
					badgeIds: form.badgeIds,
					preferences: form.preferences,
					social: form.social,
					privacy: form.privacy,
				},
			},
		)
		selectedUser.value = updated
		assignForm(updated)
		await refresh()
		notifySuccess({ title: t('admin.users.notifications.saved') })
	} catch (saveError) {
		notifyError(saveError, {
			title: t('admin.users.notifications.saveFailed'),
		})
	} finally {
		saving.value = false
	}
}
</script>

<style scoped>
.admin-section {
	display: grid;
	gap: 1rem;
	border-radius: 0.5rem;
	border: 1px solid rgb(203 213 225);
	padding: 1rem;
}

.admin-section-title {
	font-size: 1rem;
	font-weight: 600;
	color: rgb(15 23 42);
}

.admin-field {
	display: grid;
	gap: 0.4rem;
	font-size: 0.875rem;
}

.admin-field span {
	color: rgb(100 116 139);
}

.admin-field strong {
	color: rgb(15 23 42);
}

.admin-image-preview {
	display: grid;
	gap: 0.6rem;
	font-size: 0.875rem;
}

.admin-image-preview span {
	color: rgb(100 116 139);
}

.admin-media-frame {
	position: relative;
	display: flex;
	height: 9rem;
	width: 100%;
	overflow: hidden;
	border-radius: 0.5rem;
	border: 1px solid rgb(226 232 240);
	background: rgb(248 250 252);
}

.admin-media-empty {
	display: flex;
	height: 100%;
	width: 100%;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	padding: 1rem;
	text-align: center;
	font-size: 0.875rem;
	color: rgb(100 116 139);
}

:global(.dark) .admin-section {
	border-color: rgb(148 163 184);
}

:global(.dark) .admin-section-title {
	color: rgb(226 232 240);
}

:global(.dark) .admin-field span,
:global(.dark) .admin-image-preview span {
	color: rgb(148 163 184);
}

:global(.dark) .admin-field strong {
	color: rgb(226 232 240);
}

:global(.dark) .admin-media-frame {
	border-color: rgb(71 85 105);
	background: rgb(15 23 42);
}

:global(.dark) .admin-media-empty {
	color: rgb(148 163 184);
}
</style>
