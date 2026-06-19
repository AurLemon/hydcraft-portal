<template>
	<section class="grid gap-3 break-inside-avoid">
		<div class="mx-1 flex items-center justify-between gap-3">
			<div :class="profileSectionTitleClass">
				{{ t('admin.users.sections.achievements') }}
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
		<div :class="profileCardClass" class="grid gap-4">
			<div class="grid gap-2">
				<span class="text-sm text-slate-500 dark:text-slate-400">
					{{ t('admin.users.fields.badges') }}
				</span>
				<label
					v-for="badge in availableBadges"
					:key="badge.id"
					:class="adminToggleRowClass"
				>
					<span class="text-slate-800 dark:text-slate-100">
						{{ badge.labelZhCn }}
					</span>
					<UCheckbox
						:model-value="form.badgeIds.includes(badge.id)"
						@update:model-value="toggleBadge(badge.id, $event)"
					/>
				</label>
			</div>
			<div class="grid gap-2">
				<span class="text-sm text-slate-500 dark:text-slate-400">
					{{ t('admin.users.fields.verified') }}
				</span>
				<label :class="adminToggleRowClass">
					<span class="text-slate-700 dark:text-slate-200">
						{{ t('admin.users.fields.verified') }}
					</span>
					<USwitch v-model="form.verified" />
				</label>
			</div>
			<div class="grid gap-4 md:grid-cols-2">
				<label :class="adminFieldClass">
					<span>简体中文</span>
					<UInput v-model="form.verifiedTextZhCn" />
				</label>
				<label :class="adminFieldClass">
					<span>繁體中文</span>
					<UInput v-model="form.verifiedTextZhTw" />
				</label>
				<label :class="adminFieldClass">
					<span>English</span>
					<UInput v-model="form.verifiedTextEnUs" />
				</label>
				<label :class="adminFieldClass">
					<span>日本語</span>
					<UInput v-model="form.verifiedTextJaJp" />
				</label>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import type { AdminBadge } from '~/components/admin/types'
import {
	profileCardClass,
	profileSectionTitleClass,
} from '~/utils/profile-edit'
import {
	adminFieldClass,
	adminToggleRowClass,
	type AdminUserForm,
} from '~/utils/admin-user-edit'

interface AdminUserAchievementsSectionProps {
	availableBadges: AdminBadge[]
	submitting: boolean
}

defineProps<AdminUserAchievementsSectionProps>()
defineEmits<{
	submit: []
}>()

const { t } = useI18n()
const form = defineModel<AdminUserForm>('form', { required: true })

const toggleBadge = (
	badgeId: string,
	checked: boolean | 'indeterminate',
): void => {
	if (checked === true && !form.value.badgeIds.includes(badgeId)) {
		form.value.badgeIds.push(badgeId)
		return
	}

	if (checked !== true) {
		form.value.badgeIds = form.value.badgeIds.filter((item) => item !== badgeId)
	}
}
</script>
