<template>
	<section class="grid gap-3 break-inside-avoid">
		<div class="mx-1 flex items-center justify-between gap-3">
			<div :class="profileSectionTitleClass">
				{{ t('admin.users.sections.preferences') }}
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
				<span>{{ t('admin.users.fields.language') }}</span>
				<USelect v-model="form.preferences.language" :items="languageItems" />
			</label>
			<label :class="adminFieldClass">
				<span>{{ t('admin.users.fields.timezoneMode') }}</span>
				<USelect
					v-model="form.preferences.timezoneMode"
					:items="timezoneModeItems"
				/>
			</label>
			<label :class="[adminFieldClass, 'md:col-span-2']">
				<span>{{ t('admin.users.fields.timezone') }}</span>
				<USelect v-model="form.preferences.timezone" :items="timezoneItems" />
			</label>
		</div>
	</section>
</template>

<script setup lang="ts">
import {
	languageItems,
	profileCardClass,
	profileSectionTitleClass,
	timezoneItems,
} from '~/utils/profile-edit'
import { adminFieldClass, type AdminUserForm } from '~/utils/admin-user-edit'

interface AdminUserPreferencesSectionProps {
	submitting: boolean
}

defineProps<AdminUserPreferencesSectionProps>()
defineEmits<{
	submit: []
}>()

const { t } = useI18n()
const form = defineModel<AdminUserForm>('form', { required: true })

const timezoneModeItems = [
	{ label: 'AUTO', value: 'AUTO' },
	{ label: 'MANUAL', value: 'MANUAL' },
]
</script>
