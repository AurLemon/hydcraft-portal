<template>
	<section class="grid gap-3 break-inside-avoid">
		<div class="mx-1 flex items-center justify-between gap-3">
			<div :class="profileSectionTitleClass">
				{{ t('admin.users.sections.privacy') }}
			</div>
		</div>
		<div :class="profileCardClass" class="grid gap-x-4 gap-y-2 md:grid-cols-2">
			<ProfileSwitchField
				v-for="item in privacyItems"
				:key="item.key"
				control-class="w-fit"
				control-wrapper-class=""
				field-class="flex! items-start gap-2"
				label-class="flex-1"
				:label="item.label"
			>
				<USwitch v-model="form.privacy[item.key]" />
			</ProfileSwitchField>
		</div>
	</section>
</template>

<script setup lang="ts">
import ProfileSwitchField from '~/components/profile/ProfileSwitchField.vue'
import {
	privacyItems,
	profileCardClass,
	profileSectionTitleClass,
} from '~/utils/profile/edit'
import type { AdminUserForm } from '~/utils/admin/users/edit'

const { t } = useI18n()
const form = defineModel<AdminUserForm>('form', { required: true })
</script>
