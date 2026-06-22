<template>
	<UModal
		:open="open"
		:ui="{ content: 'max-w-3xl', body: 'p-0' }"
		@update:open="handleOpenChange"
	>
		<template #content>
			<div class="p-5 sm:p-6 overflow-auto">
				<div class="flex items-start justify-between gap-4">
					<h2 class="text-2xl font-semibold text-slate-950 dark:text-white">
						{{ modalTitle }}
					</h2>
					<UButton
						type="button"
						color="neutral"
						variant="ghost"
						icon="i-lucide-x"
						:aria-label="t('common.cancel')"
						@click="close"
					/>
				</div>

				<div class="mt-6 grid gap-5">
					<form class="grid gap-4" @submit.prevent="saveBasic">
						<UFormField :label="t('admin.partners.fields.name')">
							<UInput v-model="form.name" class="w-full" required />
						</UFormField>

						<UFormField
							v-if="section === 'COMMUNITY'"
							:label="t('admin.partners.fields.kind')"
						>
							<USelect v-model="form.kind" :items="kindItems" class="w-full" />
						</UFormField>

						<UFormField :label="t('admin.partners.fields.websiteUrl')">
							<UInput v-model="form.websiteUrl" class="w-full" />
						</UFormField>

						<UFormField :label="t('admin.partners.fields.summary')">
							<UTextarea
								v-model="form.summary"
								:rows="4"
								class="w-full"
								:autoresize="true"
							/>
						</UFormField>

						<div class="grid gap-4 sm:grid-cols-2">
							<UFormField :label="t('admin.partners.fields.enabled')">
								<USwitch v-model="form.enabled" />
							</UFormField>
							<UFormField :label="t('admin.partners.fields.archived')">
								<USwitch v-model="form.archived" />
							</UFormField>
						</div>

						<UFormField
							:label="t('admin.partners.fields.relationshipEstablishedAt')"
						>
							<PartnerRelationshipDateField
								v-model="form.relationshipEstablishedAt"
							/>
						</UFormField>

						<UFormField :label="t('admin.partners.fields.coreMembers')">
							<USelectMenu
								v-model="coreMemberUserIds"
								v-model:search-term="coreMemberSearchTerm"
								:items="coreMemberItems"
								value-key="value"
								label-key="label"
								multiple
								ignore-filter
								:loading="coreMemberUsersPending"
								:placeholder="t('admin.partners.fields.coreMembers')"
								:search-input="{
									placeholder: t('admin.partners.filters.coreMemberSearch'),
								}"
							>
								<template #item-leading="{ item }">
									<UAvatar
										:src="item.avatarUrl || undefined"
										:alt="item.label"
										size="xs"
										class="rounded-lg"
										:ui="avatarUi"
									/>
								</template>
								<template #item-label="{ item }">
									<div class="min-w-0">
										<p class="truncate">{{ item.label }}</p>
										<p class="truncate text-xs text-slate-500">
											{{ item.description }}
										</p>
									</div>
								</template>
								<template #empty>
									<div class="px-2 py-3 text-sm text-slate-500">
										{{ t('admin.partners.empty.coreMembers') }}
									</div>
								</template>
							</USelectMenu>

							<div
								v-if="selectedCoreMemberOptions.length"
								class="mt-3 grid gap-2 sm:grid-cols-2"
							>
								<div
									v-for="member in selectedCoreMemberOptions"
									:key="member.value"
									class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
								>
									<div class="flex min-w-0 items-center gap-3">
										<UAvatar
											:src="member.avatarUrl || undefined"
											:alt="member.label"
											class="rounded-lg"
											:ui="avatarUi"
										/>
										<div class="min-w-0">
											<p
												class="truncate font-medium text-slate-950 dark:text-white"
											>
												{{ member.label }}
											</p>
											<p class="truncate text-xs text-slate-500">
												{{ member.description }}
											</p>
										</div>
									</div>
									<UButton
										type="button"
										size="xs"
										color="neutral"
										variant="ghost"
										icon="i-lucide-x"
										@click="removeCoreMember(member.value)"
									/>
								</div>
							</div>
						</UFormField>

						<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
							<UButton
								v-if="mode === 'edit'"
								type="button"
								color="error"
								variant="soft"
								icon="i-lucide-trash-2"
								:loading="deleting"
								@click="remove"
							>
								{{ t('admin.actions.delete') }}
							</UButton>
							<UButton
								type="submit"
								icon="i-lucide-save"
								:loading="saving === 'basic'"
							>
								{{ t('admin.actions.save') }}
							</UButton>
						</div>
					</form>

					<template v-if="current || mode === 'create'">
						<div class="border-t border-slate-200 dark:border-slate-800" />

						<section class="grid gap-4">
							<h3 class="font-semibold text-slate-950 dark:text-white">
								{{ t('admin.partners.sections.media') }}
							</h3>

							<div class="grid gap-4 sm:grid-cols-2">
								<div class="grid gap-2">
									<span class="text-sm text-slate-500 dark:text-slate-400">
										{{ t('admin.partners.fields.avatar') }}
									</span>
									<UAvatar
										:src="current?.avatarUrl || undefined"
										:alt="current?.name || form.name"
										size="3xl"
										class="rounded-lg"
										:ui="avatarUi"
									/>
									<div class="flex flex-wrap gap-2">
										<AttachmentUploadButton
											v-if="current"
											ref="avatarUploadButton"
											purpose="partner-avatar"
											owner-type="partner"
											:owner-id="current.id"
											preview-shape="square"
											icon="i-lucide-upload"
											@uploaded="handleAvatarUploaded"
										>
											{{ t('admin.partners.actions.uploadAvatar') }}
										</AttachmentUploadButton>
										<UButton
											v-else
											type="button"
											size="sm"
											color="neutral"
											variant="soft"
											icon="i-lucide-upload"
											:loading="saving === 'basic'"
											@click="triggerCreateMediaUpload('avatar')"
										>
											{{ t('admin.partners.actions.uploadAvatar') }}
										</UButton>
										<UButton
											v-if="current?.avatarAttachmentId || current?.avatarUrl"
											type="button"
											size="sm"
											color="neutral"
											variant="soft"
											icon="i-lucide-rotate-ccw"
											:loading="saving === 'avatar'"
											@click="resetAvatar"
										>
											{{ t('admin.partners.actions.resetAvatar') }}
										</UButton>
									</div>
								</div>

								<div class="grid gap-2">
									<span class="text-sm text-slate-500 dark:text-slate-400">
										{{ t('admin.partners.fields.cover') }}
									</span>
									<div
										class="h-28 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800"
									>
										<SkeletonImage
											:src="current?.coverUrl || defaultCover"
											:alt="current?.name || form.name"
											class="h-full w-full"
											image-class="block h-full w-full object-cover transition-opacity duration-200"
										/>
									</div>
									<div class="flex flex-wrap gap-2">
										<AttachmentUploadButton
											v-if="current"
											ref="coverUploadButton"
											purpose="partner-cover"
											owner-type="partner"
											:owner-id="current.id"
											preview-shape="cover"
											icon="i-lucide-upload"
											@uploaded="handleCoverUploaded"
										>
											{{ t('admin.partners.actions.uploadCover') }}
										</AttachmentUploadButton>
										<UButton
											v-else
											type="button"
											size="sm"
											color="neutral"
											variant="soft"
											icon="i-lucide-upload"
											:loading="saving === 'basic'"
											@click="triggerCreateMediaUpload('cover')"
										>
											{{ t('admin.partners.actions.uploadCover') }}
										</UButton>
										<UButton
											v-if="current?.coverAttachmentId || current?.coverUrl"
											type="button"
											size="sm"
											color="neutral"
											variant="soft"
											icon="i-lucide-rotate-ccw"
											:loading="saving === 'cover'"
											@click="resetCover"
										>
											{{ t('admin.partners.actions.resetCover') }}
										</UButton>
									</div>
								</div>
							</div>
						</section>

						<div
							v-if="mode === 'edit' && current"
							class="border-t border-slate-200 dark:border-slate-800"
						/>

						<section v-if="mode === 'edit' && current" class="grid gap-4">
							<h3 class="font-semibold text-slate-950 dark:text-white">
								{{ t('admin.partners.sections.editors') }}
							</h3>

							<USelectMenu
								v-model="editorAssignmentUserId"
								v-model:search-term="editorSearchTerm"
								:items="editorCandidateItems"
								value-key="value"
								label-key="label"
								ignore-filter
								:loading="editorUsersPending"
								:placeholder="t('admin.partners.filters.userSearch')"
								:search-input="{
									placeholder: t('admin.partners.filters.userSearch'),
								}"
								@update:model-value="handleEditorSelection"
							>
								<template #item-leading="{ item }">
									<UAvatar
										:src="item.avatarUrl || undefined"
										:alt="item.label"
										size="xs"
										class="rounded-lg"
										:ui="avatarUi"
									/>
								</template>
								<template #item-label="{ item }">
									<div class="min-w-0">
										<p class="truncate">{{ item.label }}</p>
										<p class="truncate text-xs text-slate-500">
											{{ item.description }}
										</p>
									</div>
								</template>
								<template #empty>
									<div class="px-2 py-3 text-sm text-slate-500">
										{{ t('admin.partners.empty.userSearch') }}
									</div>
								</template>
							</USelectMenu>

							<div class="grid gap-2">
								<div
									v-if="!current.editors?.length"
									class="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700"
								>
									{{ t('admin.partners.empty.editors') }}
								</div>
								<div
									v-for="editor in current.editors"
									:key="editor.id"
									class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
								>
									<div class="flex min-w-0 items-center gap-3">
										<UAvatar
											:src="editor.user.avatarUrl || undefined"
											:alt="editor.user.displayName || editor.user.username"
											class="rounded-lg"
											:ui="avatarUi"
										/>
										<div class="min-w-0">
											<p
												class="truncate font-medium text-slate-950 dark:text-white"
											>
												{{ editor.user.displayName || editor.user.username }}
											</p>
											<p class="truncate text-xs text-slate-500">
												@{{ editor.user.username }}
											</p>
										</div>
									</div>
									<UButton
										type="button"
										size="xs"
										color="error"
										variant="ghost"
										icon="i-lucide-trash-2"
										:loading="saving === `editor:${editor.userId}`"
										@click="revokeEditor(editor.userId)"
									/>
								</div>
							</div>
						</section>
					</template>
				</div>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import type { AdminUser, AdminUsersResponse } from '~/components/admin/types'
import type { AttachmentUploadResult } from '~/composables/useAttachmentUploader'
import defaultCover from '~/assets/resources/pages/partners_cover.webp'
import type {
	PartnerCoreMemberSummary,
	PartnerKind,
	PartnerSection,
	PartnerSummary,
} from '~/utils/partners'
import { partnerKindValues } from '~/utils/partners'

interface PartnerAdminModalProps {
	open: boolean
	mode: 'create' | 'edit'
	section: PartnerSection
	partner?: PartnerSummary | null
}

interface UploadButtonExpose {
	openFilePicker: () => void
}

interface UserLookupOption {
	value: string
	label: string
	description: string
	username: string
	displayName: string | null
	avatarUrl: string | null
	role: string
	publicProfile: boolean
}

const props = withDefaults(defineProps<PartnerAdminModalProps>(), {
	partner: null,
})
const emit = defineEmits<{
	'update:open': [value: boolean]
	saved: [partner: PartnerSummary]
	deleted: [partnerId: string]
}>()

const { t } = useI18n()
const { notifyError, notifySuccess } = useAdminToast()
const avatarUi = {
	root: 'rounded-lg overflow-hidden',
	fallback: 'rounded-lg',
}

const form = reactive({
	name: '',
	kind: 'SERVER' as PartnerKind,
	summary: '',
	websiteUrl: '',
	enabled: true,
	archived: false,
	relationshipEstablishedAt: '',
})
const current = ref<PartnerSummary | null>(null)
const coreMemberUserIds = ref<string[]>([])
const avatarUploadButton = ref<UploadButtonExpose | null>(null)
const coverUploadButton = ref<UploadButtonExpose | null>(null)
const saving = ref<string | null>(null)
const deleting = ref(false)
const editorSearchTerm = ref('')
const editorAssignmentUserId = ref<string | undefined>(undefined)
const coreMemberSearchTerm = ref('')
const coreMemberOptionCache = ref<Record<string, UserLookupOption>>({})

const kindItems = computed(() =>
	partnerKindValues.map((kind) => ({
		label: t(`admin.partners.kinds.${kind}`),
		value: kind,
	})),
)
const modalTitle = computed(() => {
	if (props.mode === 'create') {
		return props.section === 'COMMUNITY'
			? t('admin.partners.modal.createCommunityTitle')
			: t('admin.partners.modal.createSupportTitle')
	}

	return t('admin.partners.modal.editTitle')
})

const toUserLookupOption = (user: AdminUser): UserLookupOption => ({
	value: user.id,
	label: user.displayName || user.username,
	description: `@${user.username}`,
	username: user.username,
	displayName: user.displayName,
	avatarUrl: user.avatarUrl,
	role: user.role,
	publicProfile: Boolean(user.privacy?.publicProfile),
})

const toCoreMemberLookupOption = (
	member: PartnerCoreMemberSummary,
): UserLookupOption => ({
	value: member.id,
	label: member.displayName || member.username,
	description: `@${member.username}`,
	username: member.username,
	displayName: member.displayName,
	avatarUrl: member.avatarUrl,
	role: 'USER',
	publicProfile: true,
})

const mergeCoreMemberOptions = (items: UserLookupOption[]): void => {
	const nextCache = { ...coreMemberOptionCache.value }

	for (const item of items) {
		nextCache[item.value] = item
	}

	coreMemberOptionCache.value = nextCache
}

const editorUsersQuery = computed(() => ({
	search: editorSearchTerm.value || undefined,
	page: 1,
	pageSize: 8,
}))
const coreMemberUsersQuery = computed(() => ({
	search: coreMemberSearchTerm.value || undefined,
	page: 1,
	pageSize: 8,
}))
const {
	data: editorUsersData,
	pending: editorUsersPending,
	refresh: refreshEditorUsers,
} = await useFetch<AdminUsersResponse>('/api/admin/users', {
	query: editorUsersQuery,
	immediate: false,
})
const {
	data: coreMemberUsersData,
	pending: coreMemberUsersPending,
	refresh: refreshCoreMemberUsers,
} = await useFetch<AdminUsersResponse>('/api/admin/users', {
	query: coreMemberUsersQuery,
	immediate: false,
})

const editorCandidateItems = computed(() => {
	const assignedUserIds = new Set(
		current.value?.editors?.map((editor) => editor.userId) ?? [],
	)

	return (editorUsersData.value?.items ?? [])
		.map(toUserLookupOption)
		.filter((user) => !assignedUserIds.has(user.value))
})
const selectedCoreMemberOptions = computed(() =>
	coreMemberUserIds.value
		.map((userId) => coreMemberOptionCache.value[userId] ?? null)
		.filter((item): item is UserLookupOption => Boolean(item)),
)
const coreMemberItems = computed(() => {
	const selectedUserIds = new Set(coreMemberUserIds.value)
	const selectedItems = selectedCoreMemberOptions.value
	const fetchedItems = (coreMemberUsersData.value?.items ?? [])
		.map(toUserLookupOption)
		.filter((user) => user.publicProfile)

	return [
		...selectedItems,
		...fetchedItems.filter((item) => !selectedUserIds.has(item.value)),
	]
})

watch(
	coreMemberUsersData,
	(value) => {
		if (!value?.items?.length) {
			return
		}

		mergeCoreMemberOptions(
			value.items.map(toUserLookupOption).filter((item) => item.publicProfile),
		)
	},
	{ deep: true },
)

const resetForm = (): void => {
	form.name = ''
	form.kind = 'SERVER'
	form.summary = ''
	form.websiteUrl = ''
	form.enabled = true
	form.archived = false
	form.relationshipEstablishedAt = ''
	coreMemberUserIds.value = []
	editorSearchTerm.value = ''
	editorAssignmentUserId.value = undefined
	coreMemberSearchTerm.value = ''
	coreMemberOptionCache.value = {}
}

const toDateInputValue = (value: string | null): string => {
	if (!value) {
		return ''
	}

	return new Date(value).toISOString().slice(0, 10)
}

const syncFormFromPartner = (partner: PartnerSummary): void => {
	form.name = partner.name
	form.kind = partner.kind ?? 'SERVER'
	form.summary = partner.summary ?? ''
	form.websiteUrl = partner.websiteUrl ?? ''
	form.enabled = partner.enabled
	form.archived = partner.archived
	form.relationshipEstablishedAt = toDateInputValue(
		partner.relationshipEstablishedAt,
	)
	coreMemberUserIds.value = partner.coreMembers.map((member) => member.id)
	mergeCoreMemberOptions(partner.coreMembers.map(toCoreMemberLookupOption))
}

const refreshUserLookups = async (): Promise<void> => {
	await Promise.all([
		refreshCoreMemberUsers(),
		props.mode === 'edit' && current.value
			? refreshEditorUsers()
			: Promise.resolve(),
	])
}

watch(
	() => props.open,
	(value) => {
		if (!value) {
			return
		}

		resetForm()

		if (props.mode === 'edit' && props.partner) {
			current.value = props.partner
			syncFormFromPartner(props.partner)
		} else {
			current.value = null
		}

		void refreshUserLookups()
	},
	{ immediate: true },
)

watch(editorSearchTerm, () => {
	if (!props.open || props.mode !== 'edit' || !current.value) {
		return
	}

	void refreshEditorUsers()
})

watch(coreMemberSearchTerm, () => {
	if (!props.open) {
		return
	}

	void refreshCoreMemberUsers()
})

const handleOpenChange = (value: boolean): void => {
	if (!value) {
		close()
	}
}

const close = (): void => {
	emit('update:open', false)
}

const refreshCurrent = async (): Promise<void> => {
	if (!current.value) {
		return
	}

	const updated = await $fetch<PartnerSummary>(
		`/api/admin/partners/${current.value.id}`,
	)
	current.value = updated
	syncFormFromPartner(updated)
	emit('saved', updated)
}

const buildSaveBody = (): Record<string, unknown> => ({
	name: form.name,
	...(props.section === 'COMMUNITY' ? { kind: form.kind } : {}),
	summary: form.summary || null,
	websiteUrl: form.websiteUrl || null,
	enabled: form.enabled,
	archived: form.archived,
	relationshipEstablishedAt: form.relationshipEstablishedAt || null,
	coreMemberUserIds: coreMemberUserIds.value,
})

const createPartnerDraft = async (): Promise<PartnerSummary | null> => {
	saving.value = 'basic'

	try {
		const created = await $fetch<PartnerSummary>('/api/admin/partners', {
			method: 'POST',
			body: {
				section: props.section,
				...buildSaveBody(),
			},
		})
		current.value = created
		syncFormFromPartner(created)
		emit('saved', created)
		notifySuccess({ title: t('admin.partners.notifications.created') })
		return created
	} catch (error) {
		notifyError(error, {
			title: t('admin.partners.notifications.saveFailed'),
		})
		return null
	} finally {
		saving.value = null
	}
}

const ensureCurrentForMedia = async (): Promise<PartnerSummary | null> => {
	if (current.value) {
		return current.value
	}

	return await createPartnerDraft()
}

const saveBasic = async (): Promise<void> => {
	saving.value = 'basic'

	try {
		if (!current.value) {
			const created = await $fetch<PartnerSummary>('/api/admin/partners', {
				method: 'POST',
				body: {
					section: props.section,
					...buildSaveBody(),
				},
			})
			notifySuccess({ title: t('admin.partners.notifications.created') })
			emit('saved', created)
			close()
		} else {
			await $fetch<PartnerSummary>(`/api/admin/partners/${current.value.id}`, {
				method: 'PATCH',
				body: buildSaveBody(),
			})
			await refreshCurrent()
			notifySuccess({ title: t('admin.partners.notifications.saved') })

			if (props.mode === 'create') {
				close()
			}
		}
	} catch (error) {
		notifyError(error, {
			title: t('admin.partners.notifications.saveFailed'),
		})
	} finally {
		saving.value = null
	}
}

const triggerCreateMediaUpload = async (
	target: 'avatar' | 'cover',
): Promise<void> => {
	const ensured = await ensureCurrentForMedia()

	if (!ensured) {
		return
	}

	await nextTick()

	if (target === 'avatar') {
		avatarUploadButton.value?.openFilePicker()
		return
	}

	coverUploadButton.value?.openFilePicker()
}

const patchAttachment = async (
	field: 'avatarAttachmentId' | 'coverAttachmentId',
	value: string | null,
	savingKey: 'avatar' | 'cover',
): Promise<void> => {
	if (!current.value) {
		return
	}

	saving.value = savingKey

	try {
		await $fetch<PartnerSummary>(`/api/admin/partners/${current.value.id}`, {
			method: 'PATCH',
			body: { [field]: value },
		})
		await refreshCurrent()
		notifySuccess({ title: t('admin.partners.notifications.saved') })
	} catch (error) {
		notifyError(error, {
			title: t('admin.partners.notifications.saveFailed'),
		})
	} finally {
		saving.value = null
	}
}

const handleAvatarUploaded = (result: AttachmentUploadResult): void => {
	void patchAttachment('avatarAttachmentId', result.id, 'avatar')
}

const handleCoverUploaded = (result: AttachmentUploadResult): void => {
	void patchAttachment('coverAttachmentId', result.id, 'cover')
}

const resetAvatar = (): void => {
	void patchAttachment('avatarAttachmentId', null, 'avatar')
}

const resetCover = (): void => {
	void patchAttachment('coverAttachmentId', null, 'cover')
}

const removeCoreMember = (userId: string): void => {
	coreMemberUserIds.value = coreMemberUserIds.value.filter(
		(id) => id !== userId,
	)
}

const handleEditorSelection = (userId: string | undefined): void => {
	if (!userId) {
		return
	}

	editorAssignmentUserId.value = undefined
	void assignEditor(userId)
}

const assignEditor = async (userId: string): Promise<void> => {
	if (!current.value) {
		return
	}

	saving.value = `editor:${userId}`

	try {
		await $fetch(`/api/admin/partners/${current.value.id}/editors`, {
			method: 'POST',
			body: { userId },
		})
		await refreshCurrent()
		editorSearchTerm.value = ''
		await refreshEditorUsers()
		notifySuccess({ title: t('admin.partners.notifications.editorAssigned') })
	} catch (error) {
		notifyError(error, {
			title: t('admin.partners.notifications.editorAssignFailed'),
		})
	} finally {
		saving.value = null
	}
}

const revokeEditor = async (userId: string): Promise<void> => {
	if (!current.value) {
		return
	}

	saving.value = `editor:${userId}`

	try {
		await $fetch(`/api/admin/partners/${current.value.id}/editors`, {
			method: 'DELETE',
			body: { userId },
		})
		await refreshCurrent()
		await refreshEditorUsers()
		notifySuccess({ title: t('admin.partners.notifications.editorRevoked') })
	} catch (error) {
		notifyError(error, {
			title: t('admin.partners.notifications.editorRevokeFailed'),
		})
	} finally {
		saving.value = null
	}
}

const remove = async (): Promise<void> => {
	if (!current.value) {
		return
	}

	deleting.value = true

	try {
		await $fetch(`/api/admin/partners/${current.value.id}`, {
			method: 'DELETE',
		})
		notifySuccess({ title: t('admin.partners.notifications.deleted') })
		emit('deleted', current.value.id)
		close()
	} catch (error) {
		notifyError(error, {
			title: t('admin.partners.notifications.deleteFailed'),
		})
	} finally {
		deleting.value = false
	}
}
</script>
