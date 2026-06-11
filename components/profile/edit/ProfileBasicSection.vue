<template>
	<section class="grid gap-3">
		<div class="mx-1 flex items-center justify-between gap-3">
			<div :class="profileSectionTitleClass">
				{{ t('profile.edit.sections.basic') }}
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
			<ProfileField :label="t('profile.fields.displayName')" required>
				<UInput
					v-model="form.displayName"
					class="w-full text-sm"
					maxlength="32"
				/>
			</ProfileField>
			<ProfileField label="Hydroline ID">
				<div class="flex min-w-0 items-center gap-2">
					<div
						class="flex min-w-0 w-full items-center rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
					>
						<span class="min-w-0 flex-1 truncate px-3 py-2">
							{{ hydrolineId }}
						</span>
						<UButton
							color="neutral"
							variant="ghost"
							size="xs"
							class="mr-1 shrink-0"
							:aria-label="t('profile.edit.actions.copyHydrolineId')"
							@click="$emit('copyHydrolineId')"
						>
							<UIcon name="i-lucide-copy" class="size-3.5" />
						</UButton>
					</div>
				</div>
			</ProfileField>
			<ProfileField :label="t('profile.fields.createdAt')">
				<div
					class="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
				>
					{{ formatProfileDateTime(createdAt) }}
				</div>
			</ProfileField>
			<ProfileField :label="t('profile.fields.joinedAt')">
				<div
					class="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
				>
					{{ formatProfileDate(joinedAt) }}
				</div>
			</ProfileField>
			<ProfileField :label="t('profile.fields.bio')">
				<div class="grid gap-1.5">
					<UTextarea
						v-model="form.bio"
						class="w-full resize-none text-sm"
						:ui="{ base: 'resize-none' }"
						:rows="4"
						maxlength="300"
					/>
					<div class="text-right text-xs text-slate-500 dark:text-slate-400">
						{{ form.bio.length }}/300
					</div>
				</div>
			</ProfileField>
			<ProfileField :label="t('profile.fields.location')">
				<UInput v-model="form.location" class="w-full text-sm" />
			</ProfileField>
			<ProfileField :label="t('profile.fields.countryOrRegion')">
				<USelect
					v-model="form.countryOrRegion"
					class="w-full text-sm"
					:items="localizedCountryItems"
				/>
			</ProfileField>
			<ProfileField :label="t('profile.fields.birthday')">
				<ProfileBirthdayField v-model="form.birthday" />
			</ProfileField>
		</div>
	</section>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import ProfileBirthdayField from '~/components/profile/edit/ProfileBirthdayField.vue'
import {
	countryItems,
	formatProfileDate,
	profileCardClass,
	profileSectionTitleClass,
	type ProfileForm,
} from '~/utils/profile-edit'

interface ProfileBasicSectionProps {
	hydrolineId: string
	createdAt: string
	joinedAt: string
	submitting: boolean
}

defineProps<ProfileBasicSectionProps>()
defineEmits<{
	copyHydrolineId: []
	submit: []
}>()
const form = defineModel<ProfileForm>('form', { required: true })
const { t } = useI18n()

const localizedCountryItems = computed(() =>
	countryItems.map((item) => ({
		value: item.value,
		label: t(`profile.options.country.${item.value}`),
	})),
)

const formatProfileDateTime = (value: string): string =>
	dayjs(value).format('YYYY-M-D HH:mm:ss')
</script>
