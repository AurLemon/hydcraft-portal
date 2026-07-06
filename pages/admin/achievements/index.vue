<template>
	<div>
		<div
			class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
		>
			<div>
				<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
					{{ t('admin.achievements.title') }}
				</h1>
			</div>
			<div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
				<UButton
					icon="i-lucide-award"
					size="lg"
					color="neutral"
					variant="soft"
					@click="openAssignModal"
				>
					{{ t('admin.achievements.actions.assignBadges') }}
				</UButton>
				<UButton icon="i-lucide-plus" size="lg" @click="openCreateBadge">
					{{ t('admin.achievements.actions.createBadge') }}
				</UButton>
			</div>
		</div>

		<div
			class="mt-8 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
		>
			<div
				class="grid gap-3 border-b border-slate-200 p-4 dark:border-slate-800 sm:grid-cols-2 lg:w-1/2"
			>
				<USelect
					v-model="sortField"
					:items="sortFieldItems"
					:placeholder="t('admin.sort.field')"
				/>
				<USelect
					v-model="sortDirection"
					:items="sortDirectionItems"
					:placeholder="t('admin.sort.direction')"
				/>
			</div>
			<UTable :data="badges" :columns="badgeColumns" :loading="pending">
				<template #badge-cell="{ row }">
					<div class="grid min-w-48 gap-2">
						<UBadge
							color="neutral"
							variant="subtle"
							class="w-fit gap-1.5 rounded-md px-2.5 py-1 font-semibold"
							:class="getProfileBadgeStyle(row.original.color).class"
						>
							<UIcon
								:name="getProfileBadgeStyle(row.original.color).icon"
								class="h-4 w-4"
								:class="getProfileBadgeStyle(row.original.color).iconClass"
							/>
							{{ row.original.labelZhCn }}
						</UBadge>
						<span class="text-xs text-slate-500">
							{{ row.original.key }}
						</span>
					</div>
				</template>
				<template #labels-cell="{ row }">
					<div class="grid min-w-56 gap-1 text-sm">
						<span class="text-slate-800 dark:text-slate-100">
							{{ row.original.labelZhTw }}
						</span>
						<span class="text-slate-500">{{ row.original.labelEnUs }}</span>
						<span class="text-slate-500">{{ row.original.labelJaJp }}</span>
					</div>
				</template>
				<template #color-cell="{ row }">
					<span class="text-xs">{{ row.original.color }}</span>
				</template>
				<template #enabled-cell="{ row }">
					<UBadge
						:color="row.original.enabled ? 'success' : 'neutral'"
						variant="subtle"
					>
						{{ row.original.enabled ? 'ON' : 'OFF' }}
					</UBadge>
				</template>
				<template #actions-cell="{ row }">
					<div class="flex justify-end">
						<UButton
							type="button"
							size="xs"
							color="neutral"
							variant="ghost"
							icon="i-lucide-pencil"
							@click="openEditBadge(row.original)"
						/>
					</div>
				</template>
			</UTable>
		</div>

		<UModal
			:open="badgeModalOpen"
			:ui="{ content: 'max-w-3xl', body: 'p-0' }"
			@update:open="badgeModalOpen = $event"
		>
			<template #content>
				<form class="p-5 sm:p-6" @submit.prevent="saveBadge">
					<div class="flex items-start justify-between gap-4">
						<div>
							<h2 class="text-2xl font-semibold text-slate-950 dark:text-white">
								{{
									editingBadge
										? t('admin.achievements.modal.editBadge')
										: t('admin.achievements.modal.createBadge')
								}}
							</h2>
						</div>
						<UButton
							type="button"
							color="neutral"
							variant="ghost"
							icon="i-lucide-x"
							@click="badgeModalOpen = false"
						/>
					</div>

					<div class="mt-6 grid gap-4 md:grid-cols-2">
						<label
							class="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 [&>span]:text-slate-500 [&>strong]:text-slate-950 [&>input]:rounded-lg [&>input]:border [&>input]:border-slate-300 [&>input]:bg-slate-50/90 [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:text-slate-950 [&>input]:outline-none [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-slate-300 [&>textarea]:bg-slate-50/90 [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal [&>textarea]:text-slate-950 [&>textarea]:outline-none focus-within:[&>input]:border-sky-500 focus-within:[&>input]:ring-4 focus-within:[&>input]:ring-sky-500/15 focus-within:[&>textarea]:border-sky-500 focus-within:[&>textarea]:ring-4 focus-within:[&>textarea]:ring-sky-500/15 dark:[&>span]:text-slate-400 dark:[&>strong]:text-slate-100 dark:[&>input]:border-slate-700 dark:[&>input]:bg-slate-950/80 dark:[&>input]:text-white dark:[&>textarea]:border-slate-700 dark:[&>textarea]:bg-slate-950/80 dark:[&>textarea]:text-white"
						>
							<span>{{ t('admin.achievements.fields.key') }}</span>
							<UInput v-model="badgeForm.key" />
						</label>
						<label
							class="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 [&>span]:text-slate-500 [&>strong]:text-slate-950 [&>input]:rounded-lg [&>input]:border [&>input]:border-slate-300 [&>input]:bg-slate-50/90 [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:text-slate-950 [&>input]:outline-none [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-slate-300 [&>textarea]:bg-slate-50/90 [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal [&>textarea]:text-slate-950 [&>textarea]:outline-none focus-within:[&>input]:border-sky-500 focus-within:[&>input]:ring-4 focus-within:[&>input]:ring-sky-500/15 focus-within:[&>textarea]:border-sky-500 focus-within:[&>textarea]:ring-4 focus-within:[&>textarea]:ring-sky-500/15 dark:[&>span]:text-slate-400 dark:[&>strong]:text-slate-100 dark:[&>input]:border-slate-700 dark:[&>input]:bg-slate-950/80 dark:[&>input]:text-white dark:[&>textarea]:border-slate-700 dark:[&>textarea]:bg-slate-950/80 dark:[&>textarea]:text-white"
						>
							<span>{{ t('admin.achievements.fields.color') }}</span>
							<USelect v-model="badgeForm.color" :items="paletteItems" />
						</label>
						<label
							class="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 [&>span]:text-slate-500 [&>strong]:text-slate-950 [&>input]:rounded-lg [&>input]:border [&>input]:border-slate-300 [&>input]:bg-slate-50/90 [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:text-slate-950 [&>input]:outline-none [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-slate-300 [&>textarea]:bg-slate-50/90 [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal [&>textarea]:text-slate-950 [&>textarea]:outline-none focus-within:[&>input]:border-sky-500 focus-within:[&>input]:ring-4 focus-within:[&>input]:ring-sky-500/15 focus-within:[&>textarea]:border-sky-500 focus-within:[&>textarea]:ring-4 focus-within:[&>textarea]:ring-sky-500/15 dark:[&>span]:text-slate-400 dark:[&>strong]:text-slate-100 dark:[&>input]:border-slate-700 dark:[&>input]:bg-slate-950/80 dark:[&>input]:text-white dark:[&>textarea]:border-slate-700 dark:[&>textarea]:bg-slate-950/80 dark:[&>textarea]:text-white"
						>
							<span>简体中文</span>
							<UInput v-model="badgeForm.labelZhCn" />
						</label>
						<label
							class="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 [&>span]:text-slate-500 [&>strong]:text-slate-950 [&>input]:rounded-lg [&>input]:border [&>input]:border-slate-300 [&>input]:bg-slate-50/90 [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:text-slate-950 [&>input]:outline-none [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-slate-300 [&>textarea]:bg-slate-50/90 [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal [&>textarea]:text-slate-950 [&>textarea]:outline-none focus-within:[&>input]:border-sky-500 focus-within:[&>input]:ring-4 focus-within:[&>input]:ring-sky-500/15 focus-within:[&>textarea]:border-sky-500 focus-within:[&>textarea]:ring-4 focus-within:[&>textarea]:ring-sky-500/15 dark:[&>span]:text-slate-400 dark:[&>strong]:text-slate-100 dark:[&>input]:border-slate-700 dark:[&>input]:bg-slate-950/80 dark:[&>input]:text-white dark:[&>textarea]:border-slate-700 dark:[&>textarea]:bg-slate-950/80 dark:[&>textarea]:text-white"
						>
							<span>繁體中文</span>
							<UInput v-model="badgeForm.labelZhTw" />
						</label>
						<label
							class="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 [&>span]:text-slate-500 [&>strong]:text-slate-950 [&>input]:rounded-lg [&>input]:border [&>input]:border-slate-300 [&>input]:bg-slate-50/90 [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:text-slate-950 [&>input]:outline-none [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-slate-300 [&>textarea]:bg-slate-50/90 [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal [&>textarea]:text-slate-950 [&>textarea]:outline-none focus-within:[&>input]:border-sky-500 focus-within:[&>input]:ring-4 focus-within:[&>input]:ring-sky-500/15 focus-within:[&>textarea]:border-sky-500 focus-within:[&>textarea]:ring-4 focus-within:[&>textarea]:ring-sky-500/15 dark:[&>span]:text-slate-400 dark:[&>strong]:text-slate-100 dark:[&>input]:border-slate-700 dark:[&>input]:bg-slate-950/80 dark:[&>input]:text-white dark:[&>textarea]:border-slate-700 dark:[&>textarea]:bg-slate-950/80 dark:[&>textarea]:text-white"
						>
							<span>English</span>
							<UInput v-model="badgeForm.labelEnUs" />
						</label>
						<label
							class="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 [&>span]:text-slate-500 [&>strong]:text-slate-950 [&>input]:rounded-lg [&>input]:border [&>input]:border-slate-300 [&>input]:bg-slate-50/90 [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:text-slate-950 [&>input]:outline-none [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-slate-300 [&>textarea]:bg-slate-50/90 [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal [&>textarea]:text-slate-950 [&>textarea]:outline-none focus-within:[&>input]:border-sky-500 focus-within:[&>input]:ring-4 focus-within:[&>input]:ring-sky-500/15 focus-within:[&>textarea]:border-sky-500 focus-within:[&>textarea]:ring-4 focus-within:[&>textarea]:ring-sky-500/15 dark:[&>span]:text-slate-400 dark:[&>strong]:text-slate-100 dark:[&>input]:border-slate-700 dark:[&>input]:bg-slate-950/80 dark:[&>input]:text-white dark:[&>textarea]:border-slate-700 dark:[&>textarea]:bg-slate-950/80 dark:[&>textarea]:text-white"
						>
							<span>日本語</span>
							<UInput v-model="badgeForm.labelJaJp" />
						</label>
						<label
							class="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 [&>span]:text-slate-500 [&>strong]:text-slate-950 [&>input]:rounded-lg [&>input]:border [&>input]:border-slate-300 [&>input]:bg-slate-50/90 [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:text-slate-950 [&>input]:outline-none [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-slate-300 [&>textarea]:bg-slate-50/90 [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal [&>textarea]:text-slate-950 [&>textarea]:outline-none focus-within:[&>input]:border-sky-500 focus-within:[&>input]:ring-4 focus-within:[&>input]:ring-sky-500/15 focus-within:[&>textarea]:border-sky-500 focus-within:[&>textarea]:ring-4 focus-within:[&>textarea]:ring-sky-500/15 dark:[&>span]:text-slate-400 dark:[&>strong]:text-slate-100 dark:[&>input]:border-slate-700 dark:[&>input]:bg-slate-950/80 dark:[&>input]:text-white dark:[&>textarea]:border-slate-700 dark:[&>textarea]:bg-slate-950/80 dark:[&>textarea]:text-white"
						>
							<span>{{ t('admin.achievements.fields.sortOrder') }}</span>
							<UInput v-model.number="badgeForm.sortOrder" type="number" />
						</label>
						<label
							class="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 [&>span]:text-slate-500 [&>strong]:text-slate-950 [&>input]:rounded-lg [&>input]:border [&>input]:border-slate-300 [&>input]:bg-slate-50/90 [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:text-slate-950 [&>input]:outline-none [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-slate-300 [&>textarea]:bg-slate-50/90 [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal [&>textarea]:text-slate-950 [&>textarea]:outline-none focus-within:[&>input]:border-sky-500 focus-within:[&>input]:ring-4 focus-within:[&>input]:ring-sky-500/15 focus-within:[&>textarea]:border-sky-500 focus-within:[&>textarea]:ring-4 focus-within:[&>textarea]:ring-sky-500/15 dark:[&>span]:text-slate-400 dark:[&>strong]:text-slate-100 dark:[&>input]:border-slate-700 dark:[&>input]:bg-slate-950/80 dark:[&>input]:text-white dark:[&>textarea]:border-slate-700 dark:[&>textarea]:bg-slate-950/80 dark:[&>textarea]:text-white"
						>
							<span>{{ t('admin.achievements.fields.enabled') }}</span>
							<USwitch v-model="badgeForm.enabled" />
						</label>
						<label
							class="grid gap-1.5 text-sm font-medium text-slate-700 md:col-span-2 dark:text-slate-200 [&>span]:text-slate-500 [&>strong]:text-slate-950 [&>input]:rounded-lg [&>input]:border [&>input]:border-slate-300 [&>input]:bg-slate-50/90 [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:text-slate-950 [&>input]:outline-none [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-slate-300 [&>textarea]:bg-slate-50/90 [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal [&>textarea]:text-slate-950 [&>textarea]:outline-none focus-within:[&>input]:border-sky-500 focus-within:[&>input]:ring-4 focus-within:[&>input]:ring-sky-500/15 focus-within:[&>textarea]:border-sky-500 focus-within:[&>textarea]:ring-4 focus-within:[&>textarea]:ring-sky-500/15 dark:[&>span]:text-slate-400 dark:[&>strong]:text-slate-100 dark:[&>input]:border-slate-700 dark:[&>input]:bg-slate-950/80 dark:[&>input]:text-white dark:[&>textarea]:border-slate-700 dark:[&>textarea]:bg-slate-950/80 dark:[&>textarea]:text-white"
						>
							<span>{{ t('admin.achievements.fields.description') }}</span>
							<UInput v-model="badgeForm.description" />
						</label>
					</div>

					<div class="mt-6 flex gap-3 justify-end">
						<UButton
							type="button"
							color="neutral"
							variant="ghost"
							@click="badgeModalOpen = false"
						>
							{{ t('admin.actions.cancel') }}
						</UButton>
						<UButton type="submit" icon="i-lucide-save" :loading="savingBadge">
							{{ t('admin.actions.save') }}
						</UButton>
					</div>
				</form>
			</template>
		</UModal>

		<UModal
			:open="assignModalOpen"
			:ui="{ content: 'max-w-3xl', body: 'p-0' }"
			@update:open="assignModalOpen = $event"
		>
			<template #content>
				<div class="max-h-[86dvh] overflow-y-auto p-5 sm:p-6">
					<div class="flex items-start justify-between gap-4">
						<div>
							<h2 class="text-2xl font-semibold text-slate-950 dark:text-white">
								{{ t('admin.achievements.modal.assignBadges') }}
							</h2>
						</div>
						<UButton
							type="button"
							color="neutral"
							variant="ghost"
							icon="i-lucide-x"
							@click="assignModalOpen = false"
						/>
					</div>

					<div class="mt-6 grid gap-5">
						<label
							class="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 [&>span]:text-slate-500 [&>strong]:text-slate-950 [&>input]:rounded-lg [&>input]:border [&>input]:border-slate-300 [&>input]:bg-slate-50/90 [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:text-slate-950 [&>input]:outline-none [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-slate-300 [&>textarea]:bg-slate-50/90 [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal [&>textarea]:text-slate-950 [&>textarea]:outline-none focus-within:[&>input]:border-sky-500 focus-within:[&>input]:ring-4 focus-within:[&>input]:ring-sky-500/15 focus-within:[&>textarea]:border-sky-500 focus-within:[&>textarea]:ring-4 focus-within:[&>textarea]:ring-sky-500/15 dark:[&>span]:text-slate-400 dark:[&>strong]:text-slate-100 dark:[&>input]:border-slate-700 dark:[&>input]:bg-slate-950/80 dark:[&>input]:text-white dark:[&>textarea]:border-slate-700 dark:[&>textarea]:bg-slate-950/80 dark:[&>textarea]:text-white"
						>
							<span>{{ t('admin.achievements.fields.users') }}</span>
							<UInput
								v-model="userSearch"
								icon="i-lucide-search"
								:placeholder="t('admin.users.filters.search')"
							/>
						</label>

						<div class="grid max-h-54 gap-2 overflow-y-auto pr-1">
							<label
								v-for="user in filteredUsers"
								:key="user.id"
								class="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"
							>
								<UCheckbox
									:model-value="selectedUserIds.includes(user.id)"
									@update:model-value="
										toggleArrayItem(selectedUserIds, user.id, $event)
									"
								/>
								<UAvatar :src="user.avatarUrl || undefined" size="sm" />
								<span class="min-w-0">
									<span class="block truncate text-slate-900 dark:text-white">
										{{ user.displayName || user.username }}
									</span>
									<span class="block truncate text-xs text-slate-500">
										@{{ user.username }}
									</span>
								</span>
							</label>
						</div>

						<div class="grid gap-2">
							<span class="text-sm text-slate-500 dark:text-slate-400">
								{{ t('admin.achievements.fields.badges') }}
							</span>
							<label
								v-for="badge in badges"
								:key="badge.id"
								class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"
							>
								<span class="text-slate-800 dark:text-slate-100">
									{{ badge.labelZhCn }}
								</span>
								<UCheckbox
									:model-value="selectedBadgeIds.includes(badge.id)"
									@update:model-value="
										toggleArrayItem(selectedBadgeIds, badge.id, $event)
									"
								/>
							</label>
						</div>

						<UButton
							type="button"
							class="w-fit justify-self-end"
							icon="i-lucide-award"
							:loading="assigningBadges"
							@click="assignBadges"
						>
							{{ t('admin.achievements.actions.assignBadges') }}
						</UButton>
					</div>
				</div>
			</template>
		</UModal>
	</div>
</template>

<script setup lang="ts">
import {
	getProfileBadgeStyle,
	profileBadgePalette,
} from '~/utils/profile/badges'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'admin-auth',
})

interface AdminBadge {
	id: string
	key: string
	labelZhCn: string
	labelZhTw: string
	labelEnUs: string
	labelJaJp: string
	color: string
	description: string | null
	enabled: boolean
	sortOrder: number
	assignmentCount: number
	createdAt: string
	updatedAt: string
}

interface AdminAchievementsResponse {
	badges: AdminBadge[]
}

interface AdminUserItem {
	id: string
	username: string
	displayName: string | null
	avatarUrl: string | null
}

interface AdminUsersResponse {
	items: AdminUserItem[]
}

interface BadgeForm {
	key: string
	labelZhCn: string
	labelZhTw: string
	labelEnUs: string
	labelJaJp: string
	color: string
	description: string
	enabled: boolean
	sortOrder: number
}

const createEmptyBadgeForm = (): BadgeForm => ({
	key: '',
	labelZhCn: '',
	labelZhTw: '',
	labelEnUs: '',
	labelJaJp: '',
	color: 'amber',
	description: '',
	enabled: true,
	sortOrder: 0,
})

const { t } = useI18n()
const { notifyError, notifySuccess } = useAdminToast()
const userSearch = ref('')
const sortField = ref('sortOrder')
const sortDirection = ref<'asc' | 'desc'>('asc')
const badgeModalOpen = ref(false)
const assignModalOpen = ref(false)
const savingBadge = ref(false)
const assigningBadges = ref(false)
const editingBadge = ref<AdminBadge | null>(null)
const selectedUserIds = ref<string[]>([])
const selectedBadgeIds = ref<string[]>([])
const badgeForm = reactive(createEmptyBadgeForm())
const paletteItems = profileBadgePalette.map((item) => ({
	label: item.label,
	value: item.key,
}))
const { data, pending, refresh } = await useFetch<AdminAchievementsResponse>(
	'/api/admin/achievements',
	{
		query: computed(() => ({
			sortField: sortField.value,
			sortDirection: sortDirection.value,
		})),
	},
)
const { data: usersData } = await useFetch<AdminUsersResponse>(
	'/api/admin/users',
	{
		query: {
			page: 1,
			pageSize: 100,
		},
	},
)
const badges = computed(() => data.value?.badges ?? [])
const users = computed(() => usersData.value?.items ?? [])
const filteredUsers = computed(() => {
	const keyword = userSearch.value.trim().toLowerCase()

	if (!keyword) {
		return users.value
	}

	return users.value.filter((user) =>
		[user.username, user.displayName ?? ''].some((value) =>
			value.toLowerCase().includes(keyword),
		),
	)
})
const badgeColumns = [
	{ accessorKey: 'badge', header: t('admin.achievements.fields.badge') },
	{ accessorKey: 'labels', header: t('admin.achievements.fields.labels') },
	{ accessorKey: 'color', header: t('admin.achievements.fields.color') },
	{
		accessorKey: 'sortOrder',
		header: t('admin.achievements.fields.sortOrder'),
	},
	{
		accessorKey: 'assignmentCount',
		header: t('admin.achievements.fields.assignmentCount'),
	},
	{ accessorKey: 'enabled', header: t('admin.achievements.fields.enabled') },
	{ id: 'actions', header: '' },
]
const sortFieldItems = [
	{ label: t('admin.achievements.fields.sortOrder'), value: 'sortOrder' },
	{ label: t('admin.achievements.fields.key'), value: 'key' },
	{ label: '简体中文', value: 'labelZhCn' },
	{ label: '繁體中文', value: 'labelZhTw' },
	{ label: 'English', value: 'labelEnUs' },
	{ label: '日本語', value: 'labelJaJp' },
	{ label: t('admin.achievements.fields.color'), value: 'color' },
	{ label: t('admin.achievements.fields.enabled'), value: 'enabled' },
	{ label: t('admin.sort.fields.createdAt'), value: 'createdAt' },
	{ label: t('admin.sort.fields.updatedAt'), value: 'updatedAt' },
]
const sortDirectionItems = [
	{ label: t('admin.sort.asc'), value: 'asc' },
	{ label: t('admin.sort.desc'), value: 'desc' },
]

const assignBadgeForm = (badge: AdminBadge | null): void => {
	Object.assign(
		badgeForm,
		badge
			? {
					key: badge.key,
					labelZhCn: badge.labelZhCn,
					labelZhTw: badge.labelZhTw,
					labelEnUs: badge.labelEnUs,
					labelJaJp: badge.labelJaJp,
					color: badge.color,
					description: badge.description ?? '',
					enabled: badge.enabled,
					sortOrder: badge.sortOrder,
				}
			: createEmptyBadgeForm(),
	)
}

const openCreateBadge = (): void => {
	editingBadge.value = null
	assignBadgeForm(null)
	badgeModalOpen.value = true
}

const openEditBadge = (badge: AdminBadge): void => {
	editingBadge.value = badge
	assignBadgeForm(badge)
	badgeModalOpen.value = true
}

const openAssignModal = (): void => {
	assignModalOpen.value = true
}

const toggleArrayItem = (
	target: string[],
	value: string,
	checked: boolean | 'indeterminate',
): void => {
	if (checked === true && !target.includes(value)) {
		target.push(value)
		return
	}

	if (checked !== true) {
		const index = target.indexOf(value)

		if (index >= 0) {
			target.splice(index, 1)
		}
	}
}

const saveBadge = async (): Promise<void> => {
	savingBadge.value = true

	try {
		if (editingBadge.value) {
			await $fetch(`/api/admin/achievements/badges/${editingBadge.value.id}`, {
				method: 'PATCH',
				body: badgeForm,
			})
			notifySuccess({
				title: t('admin.achievements.notifications.badgeSaved'),
			})
		} else {
			await $fetch('/api/admin/achievements/badges', {
				method: 'POST',
				body: badgeForm,
			})
			notifySuccess({
				title: t('admin.achievements.notifications.badgeCreated'),
			})
		}

		await refresh()
		badgeModalOpen.value = false
	} catch (error) {
		notifyError(error, {
			title: editingBadge.value
				? t('admin.achievements.notifications.badgeSaveFailed')
				: t('admin.achievements.notifications.badgeCreateFailed'),
		})
	} finally {
		savingBadge.value = false
	}
}

const assignBadges = async (): Promise<void> => {
	assigningBadges.value = true

	try {
		await $fetch('/api/admin/achievements/assign-badges', {
			method: 'POST',
			body: {
				userIds: selectedUserIds.value,
				badgeIds: selectedBadgeIds.value,
			},
		})
		await refresh()
		assignModalOpen.value = false
		notifySuccess({
			title: t('admin.achievements.notifications.badgesAssigned'),
		})
	} catch (error) {
		notifyError(error, {
			title: t('admin.achievements.notifications.badgesAssignFailed'),
		})
	} finally {
		assigningBadges.value = false
	}
}
</script>
