<template>
	<section class="grid gap-3 break-inside-avoid">
		<div class="mx-1 flex items-center justify-between gap-3">
			<div :class="profileSectionTitleClass">
				{{ t('admin.users.sections.identity') }}
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
				<span>{{ t('admin.users.fields.username') }}</span>
				<UInput v-model="form.username" />
			</label>
			<label :class="adminFieldClass">
				<span>{{ t('admin.users.fields.displayName') }}</span>
				<UInput v-model="form.displayName" />
			</label>
			<label :class="adminFieldClass">
				<span>{{ t('admin.users.fields.createdAt') }}</span>
				<AdminDatePartsField v-model="form.joinedAt" :allow-empty="false" />
			</label>
			<label :class="adminFieldClass">
				<span>{{ t('admin.users.fields.hydrolineId') }}</span>
				<div class="flex flex-col gap-2 sm:flex-row">
					<UInput
						:model-value="form.hydrolineId"
						readonly
						class="min-w-0 flex-1 font-mono"
					/>
					<UButton
						type="button"
						color="neutral"
						variant="soft"
						icon="i-lucide-refresh-cw"
						:loading="regenerating"
						@click="$emit('regenerate-hydroline')"
					>
						{{ t('admin.users.actions.regenerateHydrolineId') }}
					</UButton>
				</div>
			</label>
			<label :class="adminFieldClass">
				<span>{{ t('admin.users.fields.role') }}</span>
				<USelect v-model="form.role" :items="roleItems" />
			</label>
			<label :class="adminFieldClass">
				<span>{{ t('admin.users.fields.status') }}</span>
				<USelect v-model="form.status" :items="statusItems" />
			</label>
			<label :class="[adminFieldClass, 'md:col-span-2']">
				<span>{{ t('admin.users.fields.statusReason') }}</span>
				<UInput v-model="form.statusReason" />
			</label>
		</div>
	</section>
</template>

<script setup lang="ts">
import {
	profileCardClass,
	profileSectionTitleClass,
} from '~/utils/profile-edit'
import {
	adminFieldClass,
	type AdminUserForm,
	type AdminUserSelectItem,
} from '~/utils/admin-user-edit'

interface AdminUserIdentitySectionProps {
	submitting: boolean
	regenerating: boolean
	roleItems: AdminUserSelectItem[]
	statusItems: AdminUserSelectItem[]
}

defineProps<AdminUserIdentitySectionProps>()
defineEmits<{
	submit: []
	'regenerate-hydroline': []
}>()

const { t } = useI18n()
const form = defineModel<AdminUserForm>('form', { required: true })
</script>
