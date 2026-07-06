<template>
	<UModal
		:open="open"
		:title="t('admin.partners.modal.editTitle')"
		:ui="{ content: 'max-w-2xl' }"
		@update:open="handleOpenChange"
	>
		<template #body>
			<form class="grid gap-4" @submit.prevent="save">
				<UFormField :label="t('admin.partners.fields.name')">
					<UInput v-model="form.name" class="w-full" required />
				</UFormField>
				<UFormField :label="t('admin.partners.fields.summary')">
					<UTextarea
						v-model="form.summary"
						:rows="4"
						class="w-full"
						:autoresize="true"
					/>
				</UFormField>
				<UFormField :label="t('admin.partners.fields.websiteUrl')">
					<UInput v-model="form.websiteUrl" class="w-full" />
				</UFormField>

				<div class="grid gap-4 sm:grid-cols-2">
					<div class="grid gap-2">
						<span class="text-sm text-slate-500 dark:text-slate-400">
							{{ t('admin.partners.fields.avatar') }}
						</span>
						<UAvatar
							:src="currentPartner?.avatarUrl || undefined"
							:alt="currentPartner?.name || ''"
							size="3xl"
							class="rounded-lg"
							:ui="avatarUi"
						/>
						<div class="flex flex-wrap gap-2">
							<AttachmentUploadButton
								v-if="currentPartner"
								purpose="partner-avatar"
								owner-type="partner"
								:owner-id="currentPartner.id"
								preview-shape="square"
								icon="i-lucide-upload"
								@uploaded="handleAvatarUploaded"
							>
								{{ t('admin.partners.actions.uploadAvatar') }}
							</AttachmentUploadButton>
							<UButton
								v-if="
									currentPartner?.avatarAttachmentId ||
									currentPartner?.avatarUrl
								"
								type="button"
								size="sm"
								color="neutral"
								variant="soft"
								icon="i-lucide-rotate-ccw"
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
							class="h-28 overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-700"
						>
							<SkeletonImage
								:src="displayCover"
								:alt="currentPartner?.name || ''"
								class="h-full w-full"
								image-class="block h-full w-full object-cover transition-opacity duration-200"
							/>
						</div>
						<div class="flex flex-wrap gap-2">
							<AttachmentUploadButton
								v-if="currentPartner"
								purpose="partner-cover"
								owner-type="partner"
								:owner-id="currentPartner.id"
								preview-shape="cover"
								icon="i-lucide-upload"
								@uploaded="handleCoverUploaded"
							>
								{{ t('admin.partners.actions.uploadCover') }}
							</AttachmentUploadButton>
							<UButton
								v-if="
									currentPartner?.coverAttachmentId || currentPartner?.coverUrl
								"
								type="button"
								size="sm"
								color="neutral"
								variant="soft"
								icon="i-lucide-rotate-ccw"
								@click="resetCover"
							>
								{{ t('admin.partners.actions.resetCover') }}
							</UButton>
						</div>
					</div>
				</div>
			</form>
		</template>

		<template #footer>
			<div
				class="flex w-full gap-3 flex-row justify-end"
			>
				<UButton
					type="button"
					color="neutral"
					variant="ghost"
					@click="emit('update:open', false)"
				>
					{{ t('common.cancel') }}
				</UButton>
				<UButton
					type="submit"
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
import { getPartnerDisplayCover } from '~/utils/community/partner-cover'
import type { PartnerSummary } from '~/utils/community/partners'

interface PartnerEditModalProps {
	open: boolean
	partner: PartnerSummary | null
}

const props = defineProps<PartnerEditModalProps>()
const emit = defineEmits<{
	'update:open': [value: boolean]
	updated: [partner: PartnerSummary]
}>()

const { t } = useI18n()
const { notifyError, notifySuccess } = useAdminToast()
const avatarUi = {
	root: 'rounded-lg overflow-hidden',
	fallback: 'rounded-lg',
}

const saving = ref(false)
const currentPartner = ref<PartnerSummary | null>(null)
const form = reactive({
	name: '',
	summary: '',
	websiteUrl: '',
})

const displayCover = computed(() =>
	getPartnerDisplayCover(currentPartner.value),
)

const syncForm = (): void => {
	currentPartner.value = props.partner
	form.name = props.partner?.name ?? ''
	form.summary = props.partner?.summary ?? ''
	form.websiteUrl = props.partner?.websiteUrl ?? ''
}

watch(
	() => props.open,
	(value) => {
		if (value) {
			syncForm()
		}
	},
)

watch(
	() => props.partner,
	(value) => {
		currentPartner.value = value
	},
)

const handleOpenChange = (value: boolean): void => {
	emit('update:open', value)
}

const save = async (): Promise<void> => {
	if (!props.partner) {
		return
	}

	saving.value = true

	try {
		const updated = await $fetch<PartnerSummary>(
			`/api/partners/${props.partner.id}/profile`,
			{
				method: 'PATCH',
				body: {
					name: form.name,
					summary: form.summary || null,
					websiteUrl: form.websiteUrl || null,
				},
			},
		)
		currentPartner.value = updated
		emit('updated', updated)
		emit('update:open', false)
		notifySuccess({ title: t('admin.partners.notifications.saved') })
	} catch (error) {
		notifyError(error, {
			title: t('admin.partners.notifications.saveFailed'),
		})
	} finally {
		saving.value = false
	}
}

const patchAttachment = async (
	field: 'avatarAttachmentId' | 'coverAttachmentId',
	value: string | null,
): Promise<void> => {
	if (!props.partner) {
		return
	}

	try {
		const updated = await $fetch<PartnerSummary>(
			`/api/partners/${props.partner.id}/profile`,
			{
				method: 'PATCH',
				body: { [field]: value },
			},
		)
		currentPartner.value = updated
		emit('updated', updated)
		notifySuccess({ title: t('admin.partners.notifications.saved') })
	} catch (error) {
		notifyError(error, {
			title: t('admin.partners.notifications.saveFailed'),
		})
	}
}

const handleAvatarUploaded = (result: AttachmentUploadResult): void => {
	void patchAttachment('avatarAttachmentId', result.id)
}

const handleCoverUploaded = (result: AttachmentUploadResult): void => {
	void patchAttachment('coverAttachmentId', result.id)
}

const resetAvatar = (): void => {
	void patchAttachment('avatarAttachmentId', null)
}

const resetCover = (): void => {
	void patchAttachment('coverAttachmentId', null)
}
</script>
