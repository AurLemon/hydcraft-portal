<template>
	<section class="grid gap-3">
		<div class="mx-1 flex items-center justify-between gap-3">
			<div :class="profileSectionTitleClass">
				{{ t('profile.edit.sections.social') }}
			</div>
			<UButton
				type="button"
				size="sm"
				variant="link"
				icon="i-lucide-check"
				:loading="submitting"
				:aria-label="t('profile.edit.actions.updateProfile')"
				@click="$emit('submit')"
			>
				{{ t('profile.edit.actions.updateProfile') }}
			</UButton>
		</div>
		<div :class="profileCardClass" class="grid gap-4">
			<ProfileField :label="t('profile.fields.h2wikiPageName')">
				<UInput v-model="form.social.h2wikiPageName" class="w-full text-sm" />
			</ProfileField>
			<ProfileField label="GitHub">
				<UInput v-model="form.social.githubUsername" class="w-full text-sm" />
			</ProfileField>
			<ProfileField :label="t('profile.fields.website')">
				<UInput
					v-model="form.social.websiteUrl"
					class="w-full text-sm"
					type="url"
				/>
			</ProfileField>
			<ProfileField label="Bilibili">
				<UInput
					v-model="form.social.bilibiliUrl"
					class="w-full text-sm"
					type="url"
				/>
			</ProfileField>
			<ProfileField :label="t('profile.fields.publicEmail')">
				<div class="grid gap-2">
					<UInput
						v-model="form.social.publicEmail"
						class="w-full text-sm"
						type="email"
					/>
					<div class="text-xs text-slate-500 dark:text-slate-400">
						{{ t('profile.edit.hints.publicEmail') }}
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

interface ProfileSocialSectionProps {
	submitting: boolean
}

defineProps<ProfileSocialSectionProps>()
defineEmits<{
	submit: []
}>()

const { t } = useI18n()
const form = defineModel<ProfileForm>('form', { required: true })
</script>
