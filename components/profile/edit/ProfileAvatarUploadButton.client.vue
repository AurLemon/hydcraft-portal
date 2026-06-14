<template>
	<div class="flex items-center gap-4">
		<AttachmentUploadButton
			purpose="user-avatar"
			owner-type="user"
			:owner-id="ownerId"
			preview-shape="circle"
			color="neutral"
			variant="ghost"
			size="sm"
			icon=""
			:show-loading="false"
			:class="sizeClass"
			:button-class="buttonClass"
			@uploaded="$emit('uploaded', $event)"
		>
			<div class="relative block h-full w-full overflow-hidden rounded-full">
				<template v-if="avatarUrl && !avatarImageFailed">
					<USkeleton
						v-if="!avatarImageReady"
						class="block h-full w-full rounded-full"
					/>
					<img
						ref="avatarImageRef"
						:src="avatarUrl"
						:alt="displayName || username"
						class="block h-full w-full rounded-full object-cover transition-opacity duration-200"
						:class="avatarImageReady ? 'opacity-100' : 'hidden opacity-0'"
						loading="eager"
						decoding="async"
						@load="markAvatarImageReady"
						@error="markAvatarImageFailed"
					/>
				</template>
				<div
					v-else
					class="flex h-full w-full items-center justify-center rounded-full bg-slate-700 text-3xl leading-none font-semibold text-slate-300 sm:text-4xl"
				>
					{{ avatarInitial }}
				</div>
			</div>
			<span
				class="absolute inset-0 flex items-center justify-center bg-slate-950/45 opacity-0 transition-opacity group-hover:opacity-100"
			>
				<UIcon name="i-lucide-camera" class="h-6 w-6 text-white" />
			</span>
		</AttachmentUploadButton>

		<UButton
			v-if="showReset"
			type="button"
			color="neutral"
			variant="link"
			size="sm"
			class="px-0"
			@click="$emit('reset')"
		>
			{{ t('profile.edit.actions.resetAvatar') }}
		</UButton>
	</div>
</template>

<script setup lang="ts">
import type { AttachmentUploadResult } from '~/composables/useAttachmentUploader'

interface ProfileAvatarUploadButtonProps {
	ownerId: string
	avatarUrl: string
	displayName: string
	username: string
	sizeClass?: string
	buttonClass?: string
	showReset?: boolean
}

const props = withDefaults(defineProps<ProfileAvatarUploadButtonProps>(), {
	sizeClass: 'h-24 w-24 shrink-0 sm:h-28 sm:w-28',
	buttonClass:
		'group relative h-full w-full overflow-hidden rounded-full border border-white/40 bg-slate-900/40 p-0 hover:!bg-slate-900/40',
	showReset: false,
})

defineEmits<{
	uploaded: [result: AttachmentUploadResult]
	reset: []
}>()

const { t } = useI18n()
const avatarImageRef = ref<HTMLImageElement | null>(null)
const avatarImageReady = ref(false)
const avatarImageFailed = ref(false)

const avatarInitial = computed(() =>
	(props.displayName || props.username || '?').slice(0, 1).toUpperCase(),
)

const markAvatarImageReady = (): void => {
	avatarImageReady.value = true
	avatarImageFailed.value = false
}

const markAvatarImageFailed = (): void => {
	avatarImageReady.value = true
	avatarImageFailed.value = true
}

const syncCachedAvatarImageState = async (): Promise<void> => {
	await nextTick()

	if (!props.avatarUrl || !avatarImageRef.value?.complete) {
		return
	}

	if (avatarImageRef.value.naturalWidth > 0) {
		markAvatarImageReady()
		return
	}

	markAvatarImageFailed()
}

watch(
	() => props.avatarUrl,
	() => {
		avatarImageReady.value = false
		avatarImageFailed.value = false
		void syncCachedAvatarImageState()
	},
)

onMounted(() => {
	void syncCachedAvatarImageState()
})
</script>
