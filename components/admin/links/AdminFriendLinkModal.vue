<template>
	<UModal
		v-model:open="openModel"
		:title="modalTitle"
		:ui="{ content: 'max-w-2xl' }"
	>
		<template #body>
			<form class="grid gap-4" @submit.prevent="save">
				<UFormField :label="t('admin.links.fields.category')">
					<USelect
						v-model="form.category"
						:items="categoryItems"
						class="w-full"
					/>
				</UFormField>
				<UFormField :label="t('admin.links.fields.url')">
					<UInput v-model="form.url" class="w-full" />
				</UFormField>
				<UFormField :label="t('admin.links.fields.name')">
					<UInput v-model="form.name" class="w-full" />
				</UFormField>
				<UFormField :label="t('admin.links.fields.summary')">
					<UTextarea
						v-model="form.summary"
						:rows="3"
						:autoresize="true"
						class="w-full"
					/>
				</UFormField>
				<div
					class="grid gap-4"
					:class="
						showAvatarPreview ? 'sm:grid-cols-[auto,1fr] sm:items-center' : ''
					"
				>
					<UAvatar
						v-if="showAvatarPreview"
						:src="current?.avatarUrl || undefined"
						:alt="avatarPreviewAlt"
						size="3xl"
						class="h-18 w-18 shrink-0 rounded-lg"
						:ui="avatarUi"
					/>
					<div class="grid gap-3">
						<UFormField :label="t('admin.links.fields.avatar')">
							<div class="flex flex-wrap gap-2">
								<AttachmentUploadButton
									v-if="current"
									ref="avatarUploadButton"
									purpose="friend-link-avatar"
									owner-type="friend-link"
									:owner-id="current.id"
									preview-shape="square"
									icon="i-lucide-upload"
									@uploaded="handleAvatarUploaded"
								>
									{{ t('admin.links.actions.uploadAvatar') }}
								</AttachmentUploadButton>
								<UButton
									v-else
									type="button"
									size="sm"
									color="neutral"
									variant="soft"
									icon="i-lucide-upload"
									@click="triggerAvatarUpload"
								>
									{{ t('admin.links.actions.uploadAvatar') }}
								</UButton>
								<UButton
									v-if="current?.avatarAttachmentId || current?.avatarUrl"
									type="button"
									size="sm"
									color="neutral"
									variant="soft"
									icon="i-lucide-rotate-ccw"
									@click="resetAvatar"
								>
									{{ t('admin.links.actions.resetAvatar') }}
								</UButton>
							</div>
						</UFormField>
					</div>
				</div>
				<UFormField :label="t('admin.links.fields.enabled')">
					<USwitch v-model="form.enabled" />
				</UFormField>
				<UFormField :label="t('admin.links.fields.archived')">
					<USwitch v-model="form.archived" />
				</UFormField>
			</form>
		</template>

		<template #footer>
			<div
				class="flex w-full gap-3 flex-row justify-end"
			>
				<UButton
					v-if="current"
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
					type="button"
					color="neutral"
					variant="ghost"
					@click="openModel = false"
				>
					{{ t('common.cancel') }}
				</UButton>
				<UButton
					type="button"
					icon="i-lucide-save"
					:loading="saving"
					@click="save"
				>
					{{ t('admin.actions.save') }}
				</UButton>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import type { AttachmentUploadResult } from '~/composables/useAttachmentUploader'
import {
	friendLinkCategoryValues,
	type FriendLinkCategory,
	type FriendLinkSummary,
} from '~/utils/links/friend-links'

interface AdminFriendLinkModalProps {
	open: boolean
	link: FriendLinkSummary | null
}

const props = defineProps<AdminFriendLinkModalProps>()
const emit = defineEmits<{
	'update:open': [value: boolean]
	saved: [link: FriendLinkSummary]
	deleted: [linkId: string]
}>()

const { t } = useI18n()
const { notifyError, notifySuccess } = useAdminToast()
const avatarUi = {
	root: 'rounded-lg overflow-hidden',
	fallback: 'rounded-lg',
}
const openModel = computed({
	get: () => props.open,
	set: (value: boolean) => emit('update:open', value),
})
const current = ref<FriendLinkSummary | null>(null)
const saving = ref(false)
const deleting = ref(false)
const avatarUploadButton = ref<{ openFilePicker: () => void } | null>(null)
const form = reactive({
	category: 'BUSINESS' as FriendLinkCategory,
	url: '',
	name: '',
	summary: '',
	enabled: true,
	archived: false,
})

const categoryItems = computed(() =>
	friendLinkCategoryValues.map((category) => ({
		label: t(`content.links.categories.${category}`),
		value: category,
	})),
)
const normalizedAvatarName = computed(() => form.name.trim())
const showAvatarPreview = computed(() =>
	Boolean(current.value?.avatarUrl || normalizedAvatarName.value),
)
const avatarPreviewAlt = computed(() => normalizedAvatarName.value || undefined)
const modalTitle = computed(() =>
	current.value
		? t('admin.links.modal.editTitle')
		: t('admin.links.modal.createTitle'),
)

const syncFromLink = (link: FriendLinkSummary | null): void => {
	current.value = link
	form.category = link?.category ?? 'BUSINESS'
	form.url = link?.url ?? ''
	form.name = link?.name ?? ''
	form.summary = link?.summary ?? ''
	form.enabled = link?.enabled ?? true
	form.archived = link?.archived ?? false
}

watch(
	() => props.open,
	(value) => {
		if (!value) {
			return
		}

		syncFromLink(props.link)
	},
)

const buildBody = (): Record<string, unknown> => ({
	category: form.category,
	url: form.url,
	name: form.name,
	summary: form.summary || null,
	enabled: form.enabled,
	archived: form.archived,
})

const createCurrent = async (): Promise<FriendLinkSummary | null> => {
	try {
		const created = await $fetch<FriendLinkSummary>('/api/admin/links', {
			method: 'POST',
			body: buildBody(),
		})
		current.value = created
		emit('saved', created)
		notifySuccess({ title: t('admin.links.notifications.created') })
		return created
	} catch (error) {
		notifyError(error, {
			title: t('admin.links.notifications.saveFailed'),
		})
		return null
	}
}

const save = async (): Promise<void> => {
	saving.value = true

	try {
		if (!current.value) {
			const created = await $fetch<FriendLinkSummary>('/api/admin/links', {
				method: 'POST',
				body: buildBody(),
			})
			emit('saved', created)
			notifySuccess({ title: t('admin.links.notifications.created') })
			openModel.value = false
			return
		}

		const updated = await $fetch<FriendLinkSummary>(
			`/api/admin/links/${current.value.id}`,
			{
				method: 'PATCH',
				body: buildBody(),
			},
		)
		current.value = updated
		emit('saved', updated)
		notifySuccess({ title: t('admin.links.notifications.saved') })
		openModel.value = false
	} catch (error) {
		notifyError(error, {
			title: t('admin.links.notifications.saveFailed'),
		})
	} finally {
		saving.value = false
	}
}

const triggerAvatarUpload = async (): Promise<void> => {
	if (!current.value) {
		const created = await createCurrent()

		if (!created) {
			return
		}

		await nextTick()
	}

	avatarUploadButton.value?.openFilePicker()
}

const patchAvatar = async (attachmentId: string | null): Promise<void> => {
	if (!current.value) {
		return
	}

	try {
		const updated = await $fetch<FriendLinkSummary>(
			`/api/admin/links/${current.value.id}`,
			{
				method: 'PATCH',
				body: {
					avatarAttachmentId: attachmentId,
				},
			},
		)
		current.value = updated
		emit('saved', updated)
		notifySuccess({ title: t('admin.links.notifications.saved') })
	} catch (error) {
		notifyError(error, {
			title: t('admin.links.notifications.saveFailed'),
		})
	}
}

const handleAvatarUploaded = (result: AttachmentUploadResult): void => {
	void patchAvatar(result.id)
}

const resetAvatar = (): void => {
	void patchAvatar(null)
}

const remove = async (): Promise<void> => {
	if (!current.value) {
		return
	}

	deleting.value = true

	try {
		await $fetch(`/api/admin/links/${current.value.id}`, {
			method: 'DELETE',
		})
		emit('deleted', current.value.id)
		notifySuccess({ title: t('admin.links.notifications.deleted') })
		openModel.value = false
	} catch (error) {
		notifyError(error, {
			title: t('admin.links.notifications.deleteFailed'),
		})
	} finally {
		deleting.value = false
	}
}
</script>
