<template>
	<div>
		<div
			class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
		>
			<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
				{{ t('admin.builderRanks.title') }}
			</h1>
			<div class="flex items-center gap-3">
				<USelect v-model="bulkRank" :items="rankItems" class="min-w-40" />
				<UButton
					icon="i-lucide-badge-check"
					:disabled="!selectedUserIds.length"
					:loading="assigning"
					@click="assignSelected"
				>
					{{ t('admin.builderRanks.actions.assign') }}
				</UButton>
			</div>
		</div>

		<div
			class="mt-8 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
		>
			<div
				class="grid gap-3 border-b border-slate-200 p-4 dark:border-slate-800 md:grid-cols-[1fr_12rem_auto]"
			>
				<UInput
					v-model="filters.search"
					icon="i-lucide-search"
					:placeholder="t('admin.builderRanks.filters.search')"
				/>
				<USelect v-model="filters.rank" :items="filterRankItems" />
				<UButton
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
				<template #select-cell="{ row }">
					<UCheckbox
						:model-value="selectedUserIds.includes(row.original.id)"
						@update:model-value="toggleSelected(row.original.id, $event)"
					/>
				</template>
				<template #user-cell="{ row }">
					<div class="flex min-w-48 items-center gap-3">
						<UAvatar
							:src="row.original.avatarUrl || undefined"
							:alt="row.original.displayName || row.original.username"
						/>
						<span class="min-w-0">
							<span
								class="block truncate font-medium text-slate-900 dark:text-white"
								>{{ row.original.displayName || row.original.username }}</span
							>
							<span class="block truncate text-xs text-slate-500"
								>@{{ row.original.username }}</span
							>
						</span>
					</div>
				</template>
				<template #rank-cell="{ row }">
					<UBadge
						:color="row.original.builderRank.rank ? 'primary' : 'neutral'"
						variant="subtle"
					>
						{{ rankLabel(row.original.builderRank.rank) }}
					</UBadge>
				</template>
				<template #comment-cell="{ row }">
					<span
						class="block max-w-96 truncate text-sm text-slate-600 dark:text-slate-300"
					>
						{{ localizedComment(row.original) || '—' }}
					</span>
				</template>
				<template #actions-cell="{ row }">
					<UButton
						type="button"
						size="xs"
						color="neutral"
						variant="ghost"
						icon="i-lucide-pencil"
						@click="openEditor(row.original)"
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
			:open="editorOpen"
			:ui="{ content: 'max-w-2xl', body: 'p-0' }"
			@update:open="editorOpen = $event"
		>
			<template #content>
				<form class="p-5 sm:p-6" @submit.prevent="saveEditor">
					<div class="flex items-start justify-between gap-4">
						<div>
							<h2 class="text-2xl font-semibold text-slate-950 dark:text-white">
								{{ t('admin.builderRanks.modal.edit') }}
							</h2>
							<p class="mt-1 text-sm text-slate-500">
								{{ editingUser?.displayName || editingUser?.username }}
							</p>
						</div>
						<UButton
							type="button"
							color="neutral"
							variant="ghost"
							icon="i-lucide-x"
							@click="editorOpen = false"
						/>
					</div>

					<div class="mt-6 grid gap-4">
						<label :class="adminFieldClass">
							<span>{{ t('admin.builderRanks.fields.rank') }}</span>
							<USelect v-model="editor.rank" :items="rankItems" />
						</label>
						<div class="grid gap-4 md:grid-cols-2">
							<label
								v-for="language in commentLanguages"
								:key="language.key"
								:class="adminFieldClass"
							>
								<span>{{ language.label }}</span>
								<UTextarea v-model="editor.comments[language.key]" :rows="3" />
							</label>
						</div>
					</div>

					<div class="mt-6 flex justify-end gap-3">
						<UButton
							type="button"
							color="neutral"
							variant="ghost"
							@click="editorOpen = false"
							>{{ t('admin.actions.cancel') }}</UButton
						>
						<UButton
							type="submit"
							icon="i-lucide-save"
							:loading="savingEditor"
							>{{ t('admin.actions.save') }}</UButton
						>
					</div>
				</form>
			</template>
		</UModal>
	</div>
</template>

<script setup lang="ts">
import AdminTablePagination from '~/components/admin/AdminTablePagination.vue'
import type {
	AdminBuilderRank,
	AdminUser,
	AdminUsersResponse,
} from '~/components/admin/types'
import { adminFieldClass } from '~/utils/admin/users/edit'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'admin-auth',
})

type BuilderRankInput = AdminBuilderRank | null
type CommentKey = 'zhCn' | 'zhTw' | 'enUs' | 'jaJp'

const { t, locale } = useI18n()
const { notifyError, notifySuccess } = useAdminToast()
const ALL_FILTER_VALUE = '__all__'
const page = ref(1)
const pageSize = ref(20)
const filters = reactive({ search: '', rank: ALL_FILTER_VALUE })
const bulkRank = ref<BuilderRankInput>('APPRENTICE')
const selectedUserIds = ref<string[]>([])
const assigning = ref(false)
const editorOpen = ref(false)
const editingUser = ref<AdminUser | null>(null)
const savingEditor = ref(false)
const editor = reactive({
	rank: null as BuilderRankInput,
	comments: { zhCn: '', zhTw: '', enUs: '', jaJp: '' },
})

const rankItems = computed(() => [
	{ label: t('admin.builderRanks.ranks.NONE'), value: null },
	{ label: t('admin.builderRanks.ranks.CHIEF'), value: 'CHIEF' },
	{ label: t('admin.builderRanks.ranks.SENIOR'), value: 'SENIOR' },
	{ label: t('admin.builderRanks.ranks.PRACTICING'), value: 'PRACTICING' },
	{ label: t('admin.builderRanks.ranks.APPRENTICE'), value: 'APPRENTICE' },
])
const filterRankItems = computed(() => [
	{ label: t('admin.filters.all'), value: ALL_FILTER_VALUE },
	...rankItems.value,
])
const query = computed(() => ({
	page: page.value,
	pageSize: pageSize.value,
	search: filters.search || undefined,
	builderRank: filters.rank === ALL_FILTER_VALUE ? undefined : filters.rank,
	sortField: 'updatedAt',
	sortDirection: 'desc',
}))
const { data, pending, error, refresh } = await useFetch<AdminUsersResponse>(
	'/api/admin/users',
	{ query },
)
const users = computed(() => data.value?.items ?? [])
const pageMeta = computed(() => ({
	total: data.value?.total ?? 0,
	pageCount: data.value?.pageCount ?? 1,
}))
const columns = [
	{ accessorKey: 'select', header: '' },
	{ accessorKey: 'user', header: t('admin.builderRanks.fields.user') },
	{ accessorKey: 'rank', header: t('admin.builderRanks.fields.rank') },
	{ accessorKey: 'comment', header: t('admin.builderRanks.fields.comment') },
	{ id: 'actions', header: '' },
]
const commentLanguages: Array<{ key: CommentKey; label: string }> = [
	{ key: 'zhCn', label: '简体中文' },
	{ key: 'zhTw', label: '繁體中文' },
	{ key: 'enUs', label: 'English' },
	{ key: 'jaJp', label: '日本語' },
]

const localeCommentKeys: Record<string, CommentKey> = {
	'zh-CN': 'zhCn',
	'zh-TW': 'zhTw',
	'en-US': 'enUs',
	'ja-JP': 'jaJp',
}
const localeCommentKey = computed<CommentKey>(
	() => localeCommentKeys[locale.value] ?? 'zhCn',
)

watch(error, (value) => value && notifyError(value), { immediate: true })
watch(
	filters,
	() => {
		page.value = 1
	},
	{ deep: true },
)

const rankLabel = (rank: BuilderRankInput): string =>
	t(`admin.builderRanks.ranks.${rank ?? 'NONE'}`)
const localizedComment = (user: AdminUser): string | null =>
	user.builderRank.comments[localeCommentKey.value]

const toggleSelected = (
	userId: string,
	checked: boolean | 'indeterminate',
): void => {
	if (checked === true && !selectedUserIds.value.includes(userId)) {
		selectedUserIds.value.push(userId)
	} else if (checked !== true) {
		selectedUserIds.value = selectedUserIds.value.filter(
			(value) => value !== userId,
		)
	}
}

const resetFilters = (): void => {
	filters.search = ''
	filters.rank = ALL_FILTER_VALUE
}

const setPageSize = (value: number): void => {
	pageSize.value = value
	page.value = 1
}

const assignSelected = async (): Promise<void> => {
	assigning.value = true
	try {
		await $fetch('/api/admin/builder-ranks/assign', {
			method: 'POST',
			body: { userIds: selectedUserIds.value, rank: bulkRank.value },
		})
		selectedUserIds.value = []
		await refresh()
		notifySuccess({ title: t('admin.builderRanks.notifications.assigned') })
	} catch (assignmentError) {
		notifyError(assignmentError, {
			title: t('admin.builderRanks.notifications.assignFailed'),
		})
	} finally {
		assigning.value = false
	}
}

const openEditor = (user: AdminUser): void => {
	editingUser.value = user
	editor.rank = user.builderRank.rank
	editor.comments.zhCn = user.builderRank.comments.zhCn ?? ''
	editor.comments.zhTw = user.builderRank.comments.zhTw ?? ''
	editor.comments.enUs = user.builderRank.comments.enUs ?? ''
	editor.comments.jaJp = user.builderRank.comments.jaJp ?? ''
	editorOpen.value = true
}

const saveEditor = async (): Promise<void> => {
	if (!editingUser.value) return

	savingEditor.value = true
	try {
		await $fetch(`/api/admin/users/${editingUser.value.id}`, {
			method: 'PATCH',
			body: {
				builderRank: editor.rank,
				builderRankCommentZhCn: editor.comments.zhCn || null,
				builderRankCommentZhTw: editor.comments.zhTw || null,
				builderRankCommentEnUs: editor.comments.enUs || null,
				builderRankCommentJaJp: editor.comments.jaJp || null,
			},
		})
		editorOpen.value = false
		await refresh()
		notifySuccess({ title: t('admin.builderRanks.notifications.saved') })
	} catch (saveError) {
		notifyError(saveError, {
			title: t('admin.builderRanks.notifications.saveFailed'),
		})
	} finally {
		savingEditor.value = false
	}
}
</script>
