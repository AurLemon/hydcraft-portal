<template>
	<section class="grid gap-3 break-inside-avoid">
		<div class="mx-1 flex items-center justify-between gap-3">
			<div :class="profileSectionTitleClass">
				{{ t('admin.users.sections.profile') }}
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
			<label :class="[adminFieldClass, 'md:col-span-2']">
				<span>{{ t('admin.users.fields.bio') }}</span>
				<UTextarea v-model="form.bio" :rows="4" />
			</label>
			<label :class="adminFieldClass">
				<span>{{ t('admin.users.fields.location') }}</span>
				<UInput v-model="form.location" />
			</label>
			<label :class="adminFieldClass">
				<span>{{ t('admin.users.fields.countryOrRegion') }}</span>
				<USelect v-model="form.countryOrRegion" :items="countryItems" />
			</label>
			<label :class="adminFieldClass">
				<span>{{ t('admin.users.fields.birthday') }}</span>
				<AdminDatePartsField v-model="form.birthday" />
			</label>
		</div>
	</section>
</template>

<script setup lang="ts">
import {
	profileCardClass,
	profileSectionTitleClass,
} from '~/utils/profile/edit'
import {
	adminFieldClass,
	type AdminUserForm,
	type AdminUserSelectItem,
} from '~/utils/admin/users/edit'

interface AdminUserProfileSectionProps {
	submitting: boolean
	countryItems: AdminUserSelectItem[]
}

defineProps<AdminUserProfileSectionProps>()
defineEmits<{
	submit: []
}>()

const { t } = useI18n()
const form = defineModel<AdminUserForm>('form', { required: true })
</script>
