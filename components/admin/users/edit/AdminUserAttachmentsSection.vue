<template>
	<section class="grid gap-3 break-inside-avoid">
		<div class="mx-1 flex items-center justify-between gap-3">
			<div :class="profileSectionTitleClass">
				{{ t('admin.users.sections.attachments') }}
			</div>
		</div>
		<div :class="profileCardClass" class="grid gap-4 md:grid-cols-2">
			<div class="flex flex-col items-center gap-3 text-sm">
				<div :class="avatarFrameClass">
					<USkeleton
						v-if="avatarPreviewUrl && !avatarPreviewReady"
						class="absolute inset-0 rounded-full"
					/>
					<img
						v-if="avatarPreviewUrl && !avatarPreviewFailed"
						:src="avatarPreviewUrl"
						:alt="user.displayName || user.username"
						class="h-full w-full rounded-full object-cover transition-opacity duration-200"
						:class="avatarPreviewReady ? 'opacity-100' : 'opacity-0'"
						loading="lazy"
						decoding="async"
						@load="avatarPreviewReady = true"
						@error="markAvatarPreviewFailed"
					/>
					<div v-else :class="adminMediaEmptyClass">
						<UIcon name="i-lucide-image-off" class="h-5 w-5" />
						<span>{{ t('admin.users.media.avatarEmpty') }}</span>
					</div>
				</div>
				<div class="flex flex-row flex-wrap items-center justify-center gap-2">
					<AttachmentUploadButton
						purpose="user-avatar"
						owner-type="user"
						:owner-id="user.id"
						preview-shape="circle"
						variant="link"
						icon="i-lucide-upload"
						@uploaded="$emit('avatar-uploaded', $event)"
					>
						{{ t('admin.users.actions.uploadAvatar') }}
					</AttachmentUploadButton>
					<UButton
						type="button"
						size="sm"
						color="neutral"
						variant="link"
						icon="i-lucide-rotate-ccw"
						:loading="avatarUploading"
						@click="$emit('reset-avatar')"
					>
						{{ t('admin.users.actions.resetAvatar') }}
					</UButton>
				</div>
			</div>
			<div class="flex flex-col items-center gap-3 text-sm">
				<div :class="coverFrameClass">
					<USkeleton
						v-if="coverPreviewUrl && !coverPreviewReady"
						class="absolute inset-0"
					/>
					<img
						v-if="coverPreviewUrl && !coverPreviewFailed"
						:src="coverPreviewUrl"
						:alt="user.displayName || user.username"
						class="h-full w-full object-cover transition-opacity duration-200"
						:class="coverPreviewReady ? 'opacity-100' : 'opacity-0'"
						loading="lazy"
						decoding="async"
						@load="coverPreviewReady = true"
						@error="markCoverPreviewFailed"
					/>
					<div v-else :class="adminMediaEmptyClass">
						<UIcon name="i-lucide-image-off" class="h-5 w-5" />
						<span>{{ t('admin.users.media.coverEmpty') }}</span>
					</div>
				</div>
				<div class="flex flex-row flex-wrap items-center justify-center gap-2">
					<AttachmentUploadButton
						purpose="user-cover"
						owner-type="user"
						:owner-id="user.id"
						preview-shape="cover"
						variant="link"
						icon="i-lucide-upload"
						@uploaded="$emit('cover-uploaded', $event)"
					>
						{{ t('admin.users.actions.uploadCover') }}
					</AttachmentUploadButton>
					<UButton
						type="button"
						size="sm"
						color="neutral"
						variant="link"
						icon="i-lucide-rotate-ccw"
						:loading="coverUploading"
						@click="$emit('reset-cover')"
					>
						{{ t('admin.users.actions.resetCover') }}
					</UButton>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import type { AdminUser } from '~/components/admin/types'
import type { AttachmentUploadResult } from '~/composables/useAttachmentUploader'
import {
	profileCardClass,
	profileSectionTitleClass,
} from '~/utils/profile/edit'
import {
	adminMediaEmptyClass,
	adminMediaFrameClass,
} from '~/utils/admin/users/edit'

interface AdminUserAttachmentsSectionProps {
	user: AdminUser
	avatarUploading: boolean
	coverUploading: boolean
}

const props = defineProps<AdminUserAttachmentsSectionProps>()
defineEmits<{
	'avatar-uploaded': [result: AttachmentUploadResult]
	'cover-uploaded': [result: AttachmentUploadResult]
	'reset-avatar': []
	'reset-cover': []
}>()

const { t } = useI18n()
const avatarPreviewReady = ref(false)
const avatarPreviewFailed = ref(false)
const coverPreviewReady = ref(false)
const coverPreviewFailed = ref(false)

const avatarPreviewUrl = computed(() => props.user.avatarUrl || '')
const coverPreviewUrl = computed(() => props.user.coverUrl || '')
const hasAvatarPreview = computed(
	() => Boolean(avatarPreviewUrl.value) && !avatarPreviewFailed.value,
)
const hasCoverPreview = computed(
	() => Boolean(coverPreviewUrl.value) && !coverPreviewFailed.value,
)
const avatarFrameClass = computed(() => [
	adminMediaFrameClass,
	'!size-36 !rounded-full',
	hasAvatarPreview.value &&
		'border-transparent bg-transparent dark:border-transparent dark:bg-transparent',
])
const coverFrameClass = computed(() => [
	adminMediaFrameClass,
	hasCoverPreview.value &&
		'border-transparent bg-transparent dark:border-transparent dark:bg-transparent',
])

const markAvatarPreviewFailed = (): void => {
	avatarPreviewReady.value = true
	avatarPreviewFailed.value = true
}
const markCoverPreviewFailed = (): void => {
	coverPreviewReady.value = true
	coverPreviewFailed.value = true
}

watch(avatarPreviewUrl, () => {
	avatarPreviewReady.value = false
	avatarPreviewFailed.value = false
})
watch(coverPreviewUrl, () => {
	coverPreviewReady.value = false
	coverPreviewFailed.value = false
})
</script>
