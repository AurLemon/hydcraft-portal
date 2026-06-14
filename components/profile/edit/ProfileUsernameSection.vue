<template>
	<section class="grid gap-3">
		<div class="mx-1 flex items-center justify-between gap-3">
			<div :class="profileSectionTitleClass">
				{{ t('profile.edit.sections.username') }}
			</div>
			<UButton
				type="button"
				size="sm"
				variant="link"
				icon="i-lucide-check"
				:disabled="disabled"
				:loading="submitting"
				:aria-label="t('profile.edit.actions.updateUsername')"
				@click="$emit('submit')"
			>
				{{ t('profile.edit.actions.updateUsername') }}
			</UButton>
		</div>
		<div :class="profileCardClass" class="grid gap-4">
			<ProfileField :label="t('profile.fields.username')" required>
				<div class="grid gap-2">
					<UInput
						v-model="form.username"
						class="w-full text-sm"
						maxlength="24"
					/>
					<div>
						<div class="w-full text-xs text-slate-500 dark:text-slate-400">
							{{ publicProfileUrl }}
						</div>
						<div class="text-xs text-slate-500 dark:text-slate-400">
							{{ usernameStatusText }}
						</div>
					</div>
				</div>
			</ProfileField>
		</div>
	</section>
</template>

<script setup lang="ts">
import {
	profileCardClass,
	profileSectionTitleClass,
	type ProfileForm,
} from '~/utils/profile-edit'

interface ProfileUsernameSectionProps {
	publicProfileUrl: string
	submitting: boolean
	disabled: boolean
	usernameStatusText: string
}

defineProps<ProfileUsernameSectionProps>()
defineEmits<{
	submit: []
}>()

const { t } = useI18n()
const form = defineModel<ProfileForm>('form', { required: true })
</script>
