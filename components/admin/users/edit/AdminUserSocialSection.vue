<template>
	<section class="grid gap-3 break-inside-avoid">
		<div class="mx-1 flex items-center justify-between gap-3">
			<div :class="profileSectionTitleClass">
				{{ t('admin.users.sections.social') }}
			</div>
			<UButton
				type="button"
				color="primary"
				size="sm"
				variant="link"
				icon="i-lucide-check"
				:loading="submitting"
				@click="$emit('submit')"
			>
				{{ t('admin.actions.save') }}
			</UButton>
		</div>
		<div :class="profileCardClass" class="grid gap-4 md:grid-cols-2">
			<label :class="adminFieldClass">
				<span>GitHub</span>
				<UInput v-model="form.social.githubUsername" />
			</label>
			<label :class="adminFieldClass">
				<span>Wiki</span>
				<UInput v-model="form.social.h2wikiPageName" />
			</label>
			<label :class="adminFieldClass">
				<span>{{ t('admin.users.fields.websiteUrl') }}</span>
				<UInput v-model="form.social.websiteUrl" />
			</label>
			<label :class="adminFieldClass">
				<span>Bilibili</span>
				<UInput v-model="form.social.bilibiliUrl" />
			</label>
			<label :class="adminFieldClass">
				<span>QQ</span>
				<UInput v-model="form.social.qqNumber" />
			</label>
			<label :class="adminFieldClass">
				<span>微信</span>
				<UInput v-model="form.social.wechatId" />
			</label>
			<label :class="[adminFieldClass, 'md:col-span-2']">
				<span>{{ t('admin.users.fields.publicEmail') }}</span>
				<UInput v-model="form.social.publicEmail" />
			</label>
		</div>
	</section>
</template>

<script setup lang="ts">
import {
	profileCardClass,
	profileSectionTitleClass,
} from '~/utils/profile/edit'
import { adminFieldClass, type AdminUserForm } from '~/utils/admin/users/edit'

interface AdminUserSocialSectionProps {
	submitting: boolean
}

defineProps<AdminUserSocialSectionProps>()
defineEmits<{
	submit: []
}>()

const { t } = useI18n()
const form = defineModel<AdminUserForm>('form', { required: true })
</script>
