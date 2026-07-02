<template>
	<UModal
		v-model:open="openModel"
		:title="t('content.links.application.title')"
		:ui="{ content: 'max-w-2xl' }"
	>
		<template #body>
			<div v-if="creatingDraft" class="grid gap-4">
				<USkeleton class="h-10 rounded-lg" />
				<USkeleton class="h-10 rounded-lg" />
				<USkeleton class="h-28 rounded-lg" />
				<USkeleton class="h-14 rounded-2xl" />
			</div>
			<form v-else class="grid gap-4" @submit.prevent="submit">
				<UFormField :label="t('content.links.application.fields.category')">
					<USelect
						v-model="form.category"
						:items="categoryItems"
						class="w-full"
					/>
				</UFormField>

				<UFormField :label="t('content.links.application.fields.url')">
					<UInput v-model="form.url" class="w-full" />
				</UFormField>

				<UFormField :label="t('content.links.application.fields.name')">
					<UInput v-model="form.name" class="w-full" />
				</UFormField>

				<UFormField :label="t('content.links.application.fields.summary')">
					<UTextarea
						v-model="form.summary"
						:rows="3"
						:autoresize="true"
						class="w-full"
					/>
				</UFormField>

				<UFormField :label="t('content.links.application.fields.avatar')">
					<div class="flex items-center gap-4">
						<div
							class="flex h-18 w-18 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800"
						>
							<UAvatar
								v-if="showAvatarPreview"
								:src="avatarPreviewUrl || undefined"
								:alt="avatarPreviewAlt"
								size="3xl"
								class="h-18 w-18 shrink-0 rounded-lg"
								:ui="avatarUi"
							/>
						</div>
						<div class="flex flex-wrap gap-2">
							<AttachmentUploadButton
								v-if="draft"
								purpose="friend-link-avatar"
								owner-type="friend-link-application"
								:owner-id="draft.id"
								preview-shape="square"
								icon="i-lucide-upload"
								@uploaded="handleAvatarUploaded"
							>
								{{ t('content.links.application.actions.uploadAvatar') }}
							</AttachmentUploadButton>
							<UButton
								v-if="form.avatarAttachmentId || avatarPreviewUrl"
								type="button"
								color="neutral"
								variant="soft"
								size="sm"
								icon="i-lucide-rotate-ccw"
								@click="resetAvatar"
							>
								{{ t('content.links.application.actions.resetAvatar') }}
							</UButton>
						</div>
					</div>
				</UFormField>

				<UFormField
					:label="t('content.links.application.fields.applicantStatement')"
				>
					<UTextarea
						v-model="form.applicantStatement"
						:rows="5"
						:autoresize="true"
						class="w-full"
					/>
				</UFormField>

				<UFormField :label="t('content.links.application.fields.captcha')">
					<CapWidget ref="captchaWidgetRef" v-model="captcha.token.value" />
				</UFormField>
			</form>
		</template>

		<template #footer>
			<div
				class="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end"
			>
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
					icon="i-lucide-send"
					:loading="submitting"
					:disabled="submitDisabled"
					@click="submit"
				>
					{{ t('content.links.application.actions.submit') }}
				</UButton>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import type { AttachmentUploadResult } from '~/composables/useAttachmentUploader'
import {
	friendLinkApplicationCategoryValues,
	type FriendLinkApplicationSummary,
	type FriendLinkCategory,
} from '~/utils/links/friend-links'

interface FriendLinkApplicationModalProps {
	open: boolean
}

const props = defineProps<FriendLinkApplicationModalProps>()
const emit = defineEmits<{
	'update:open': [value: boolean]
	submitted: [application: FriendLinkApplicationSummary]
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
const draft = ref<FriendLinkApplicationSummary | null>(null)
const creatingDraft = ref(false)
const submitting = ref(false)
const avatarPreviewUrl = ref('')
const captcha = useCap(true)
const captchaWidgetRef = captcha.widgetRef
const form = reactive({
	category: 'PERSONAL' as FriendLinkCategory,
	url: '',
	name: '',
	summary: '',
	avatarAttachmentId: '',
	applicantStatement: '',
})

const categoryItems = computed(() =>
	friendLinkApplicationCategoryValues.map((category) => ({
		label: t(`content.links.categories.${category}`),
		value: category,
	})),
)
const normalizedAvatarName = computed(() => form.name.trim())
const showAvatarPreview = computed(() =>
	Boolean(avatarPreviewUrl.value || normalizedAvatarName.value),
)
const avatarPreviewAlt = computed(() => normalizedAvatarName.value || undefined)
const submitDisabled = computed(
	() =>
		creatingDraft.value ||
		submitting.value ||
		!draft.value ||
		!form.url ||
		!form.name ||
		!form.avatarAttachmentId ||
		!form.applicantStatement ||
		!captcha.token.value,
)

const resetForm = (): void => {
	form.category = 'PERSONAL'
	form.url = ''
	form.name = ''
	form.summary = ''
	form.avatarAttachmentId = ''
	form.applicantStatement = ''
	avatarPreviewUrl.value = ''
	captcha.reset(true)
}

const ensureDraft = async (): Promise<void> => {
	if (draft.value?.status === 'DRAFT') {
		return
	}

	creatingDraft.value = true

	try {
		draft.value = await $fetch<FriendLinkApplicationSummary>(
			'/api/links/applications/drafts',
			{
				method: 'POST',
			},
		)
	} catch (error) {
		notifyError(error, {
			title: t('content.links.application.notifications.draftCreateFailed'),
		})
		openModel.value = false
	} finally {
		creatingDraft.value = false
	}
}

watch(
	() => props.open,
	(value) => {
		if (!value) {
			return
		}

		void ensureDraft()
	},
)

const handleAvatarUploaded = (result: AttachmentUploadResult): void => {
	form.avatarAttachmentId = result.id
	avatarPreviewUrl.value =
		result.variants.find((variant) => variant.name === 'avatar_256')?.url ||
		result.variants[0]?.url ||
		''
}

const resetAvatar = (): void => {
	form.avatarAttachmentId = ''
	avatarPreviewUrl.value = ''
}

const submit = async (): Promise<void> => {
	if (!draft.value || submitDisabled.value) {
		return
	}

	submitting.value = true

	try {
		const submitted = await $fetch<FriendLinkApplicationSummary>(
			`/api/links/applications/${draft.value.id}/submit`,
			{
				method: 'POST',
				body: {
					category: form.category,
					url: form.url,
					name: form.name,
					summary: form.summary || null,
					avatarAttachmentId: form.avatarAttachmentId,
					applicantStatement: form.applicantStatement,
					captchaToken: captcha.consumeToken(),
				},
			},
		)
		notifySuccess({
			title: t('content.links.application.notifications.submitted'),
		})
		draft.value = null
		resetForm()
		emit('submitted', submitted)
		openModel.value = false
	} catch (error) {
		captcha.reset(true)
		notifyError(error, {
			title: t('content.links.application.notifications.submitFailed'),
		})
	} finally {
		submitting.value = false
	}
}
</script>
