<template>
	<div>
		<input
			ref="fileInput"
			type="file"
			class="hidden"
			:accept="accept"
			@change="handleFileChange"
		/>
		<UButton
			type="button"
			:color="color"
			:variant="variant"
			:size="size"
			:icon="icon"
			:class="buttonClass"
			:loading="showLoading && uploading"
			:disabled="!policy"
			@click="openFilePicker"
		>
			<slot>{{ t('attachments.upload.button') }}</slot>
		</UButton>

		<ImageCropperModal
			v-model:open="cropperOpen"
			:file="selectedFile"
			:aspect-ratio="policy?.aspectRatio ?? undefined"
			:preview-shape="previewShape"
			:title="cropperTitle"
			@cancel="resetSelection"
			@confirm="uploadWithCrop"
		/>
	</div>
</template>

<script setup lang="ts">
import { useToast } from '@nuxt/ui/composables'
import type {
	AttachmentOwnerType,
	AttachmentPurpose,
	AttachmentUploadResult,
} from '~/composables/useAttachmentUploader'
import { useAttachmentUploader } from '~/composables/useAttachmentUploader'
import type {
	ImageCropperConfirmPayload,
	ImageCropperPreviewShape,
} from '~/composables/useImageCropper'

type ButtonColor = 'primary' | 'neutral' | 'success' | 'warning' | 'error'
type ButtonVariant = 'solid' | 'soft' | 'subtle' | 'ghost' | 'link'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface AttachmentUploadButtonProps {
	purpose: AttachmentPurpose
	ownerType: AttachmentOwnerType
	ownerId?: string
	previewShape?: ImageCropperPreviewShape
	color?: ButtonColor
	variant?: ButtonVariant
	size?: ButtonSize
	icon?: string
	buttonClass?: string
	showLoading?: boolean
}

const props = withDefaults(defineProps<AttachmentUploadButtonProps>(), {
	ownerId: undefined,
	previewShape: 'square',
	color: 'neutral',
	variant: 'soft',
	size: 'sm',
	icon: 'i-lucide-image',
	buttonClass: '',
	showLoading: true,
})
const emit = defineEmits<{
	uploaded: [result: AttachmentUploadResult]
}>()

interface AttachmentPolicyMetadata {
	purpose: AttachmentPurpose
	allowedContentTypes: string[]
	maxSizeBytes: number
	requiresCrop: boolean
	aspectRatio?: number | null
	category: string
	visibility: string
}

interface AttachmentPoliciesResponse {
	policies: AttachmentPolicyMetadata[]
}

const { t } = useI18n()
const toast = useToast()
const { notifyError } = useAdminToast()
const uploader = useAttachmentUploader()
const { data: policyData } = await useFetch<AttachmentPoliciesResponse>(
	'/api/attachments/policies',
)
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = shallowRef<File | null>(null)
const cropperOpen = ref(false)
const uploading = ref(false)
const policy = computed(() =>
	policyData.value?.policies.find((item) => item.purpose === props.purpose),
)
const accept = computed(() => policy.value?.allowedContentTypes.join(',') ?? '')
const cropperTitle = computed(() =>
	props.purpose === 'user-avatar'
		? t('attachments.crop.avatarTitle')
		: props.purpose === 'partner-avatar'
			? t('attachments.crop.partnerAvatarTitle')
			: props.purpose === 'partner-cover'
				? t('attachments.crop.partnerCoverTitle')
				: t('attachments.crop.coverTitle'),
)

const resetSelection = (): void => {
	selectedFile.value = null

	if (fileInput.value) {
		fileInput.value.value = ''
	}
}

const openFilePicker = (): void => {
	fileInput.value?.click()
}

defineExpose({
	openFilePicker,
})

const validateFile = (file: File): boolean => {
	if (!policy.value) {
		toast.add({
			title: t('attachments.upload.policyUnavailable'),
			color: 'warning',
			icon: 'i-lucide-info',
		})
		return false
	}

	if (!policy.value.allowedContentTypes.includes(file.type)) {
		toast.add({
			title: t('attachments.upload.invalidType'),
			color: 'warning',
			icon: 'i-lucide-info',
		})
		return false
	}

	if (file.size > policy.value.maxSizeBytes) {
		toast.add({
			title: t('attachments.upload.fileTooLarge'),
			color: 'warning',
			icon: 'i-lucide-info',
		})
		return false
	}

	return true
}

const upload = async (fileOverride?: File): Promise<void> => {
	const file = fileOverride ?? selectedFile.value

	if (!file) {
		return
	}

	uploading.value = true

	try {
		const result = await uploader.uploadImage({
			file,
			purpose: props.purpose,
			ownerType: props.ownerType,
			ownerId: props.ownerId,
		})
		emit('uploaded', result)
		toast.add({
			title: t('attachments.upload.uploaded'),
			color: 'success',
			icon: 'i-lucide-check',
		})
		resetSelection()
	} catch (error) {
		notifyError(error, {
			title: t('attachments.upload.failed'),
		})
	} finally {
		uploading.value = false
	}
}

const uploadWithCrop = (payload: ImageCropperConfirmPayload): void => {
	cropperOpen.value = false
	void upload(payload.file)
}

const handleFileChange = (event: Event): void => {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]

	if (!file || !validateFile(file)) {
		resetSelection()
		return
	}

	selectedFile.value = file

	if (policy.value?.requiresCrop) {
		cropperOpen.value = true
		return
	}

	void upload()
}
</script>
