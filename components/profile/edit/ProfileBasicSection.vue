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
			<ProfileField
				:label="t('profile.fields.avatar')"
				field-class="grid gap-2 md:grid-cols-[180px_1fr] md:items-center"
			>
				<ProfileAvatarUploadButton
					:owner-id="profileId"
					:avatar-url="form.avatarUrl"
					:display-name="form.displayName"
					:username="form.username"
					show-reset
					size-class="h-20 w-20 shrink-0"
					button-class="group relative h-full w-full overflow-hidden rounded-full border border-slate-200 bg-slate-50 p-0 hover:!bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:!bg-slate-900/60"
					@uploaded="$emit('avatarUploaded', $event)"
					@reset="$emit('resetAvatar')"
				/>
			</ProfileField>
			<ProfileField
				:label="t('profile.fields.cover')"
				field-class="grid gap-2 md:grid-cols-[180px_1fr] md:items-center"
			>
				<div class="flex min-w-0 items-center gap-3">
					<AttachmentUploadButton
						purpose="user-cover"
						owner-type="user"
						:owner-id="profileId"
						preview-shape="cover"
						color="neutral"
						variant="ghost"
						size="sm"
						icon=""
						:show-loading="false"
						button-class="group relative h-26 min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-0 hover:!bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:!bg-slate-900/60"
						@uploaded="$emit('coverUploaded', $event)"
					>
						<SkeletonImage
							:src="effectiveCoverImage"
							:alt="
								t('profile.media.coverAlt', {
									name: form.displayName || form.username,
								})
							"
							class="block h-full w-full"
							image-class="block h-full w-full object-cover"
							skeleton-class="rounded-none"
							loading="lazy"
						/>
						<span
							class="absolute inset-0 flex items-center justify-center bg-slate-950/32 opacity-0 transition-opacity group-hover:opacity-100"
						>
							<UIcon name="i-lucide-image-plus" class="h-5 w-5 text-white" />
						</span>
					</AttachmentUploadButton>

					<UButton
						type="button"
						color="neutral"
						variant="link"
						size="sm"
						class="shrink-0 px-0"
						@click="$emit('resetCover')"
					>
						{{ t('profile.edit.actions.resetCover') }}
					</UButton>
				</div>
			</ProfileField>
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
			<ProfileField :label="t('profile.fields.schoolOrCompany')">
				<UInput
					v-model="form.schoolOrCompany"
					class="w-full text-sm"
					maxlength="120"
				/>
			</ProfileField>
			<ProfileField :label="t('profile.fields.occupationOrMajor')">
				<UInput
					v-model="form.occupationOrMajor"
					class="w-full text-sm"
					maxlength="120"
				/>
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
			<ProfileField :label="t('profile.fields.gender')">
				<USelect
					v-model="form.gender"
					class="w-full text-sm"
					:items="localizedGenderItems"
				/>
			</ProfileField>
			<ProfileField :label="t('profile.fields.birthday')">
				<div class="grid gap-1.5">
					<ProfileBirthdayField v-model="form.birthday" />
					<ProfileBirthdayInfo :birthday="form.birthday" />
				</div>
			</ProfileField>
		</div>
	</section>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import defaultCover from '~/assets/resources/pages/timeline_cover.webp'
import type { AttachmentUploadResult } from '~/composables/useAttachmentUploader'
import ProfileBirthdayField from '~/components/profile/edit/ProfileBirthdayField.vue'
import ProfileBirthdayInfo from '~/components/profile/edit/ProfileBirthdayInfo.vue'
import {
	countryItems,
	formatProfileDate,
	genderItems,
	profileCardClass,
	profileSectionTitleClass,
	type ProfileForm,
} from '~/utils/profile/edit'

interface ProfileBasicSectionProps {
	profileId: string
	coverImage: string
	hydrolineId: string
	createdAt: string
	joinedAt: string
	submitting: boolean
}

defineEmits<{
	copyHydrolineId: []
	avatarUploaded: [result: AttachmentUploadResult]
	coverUploaded: [result: AttachmentUploadResult]
	resetAvatar: []
	resetCover: []
	submit: []
}>()
const form = defineModel<ProfileForm>('form', { required: true })
const { t } = useI18n()
const props = defineProps<ProfileBasicSectionProps>()

const effectiveCoverImage = computed(() => props.coverImage || defaultCover)

const localizedCountryItems = computed(() =>
	countryItems.map((item) => ({
		value: item.value,
		label: t(`profile.options.country.${item.key}`),
	})),
)

const localizedGenderItems = computed(() =>
	genderItems.map((item) => ({
		value: item.value,
		label: t(`profile.options.gender.${item.value}`),
	})),
)

const formatProfileDateTime = (value: string): string =>
	dayjs(value).format('YYYY-M-D HH:mm:ss')
</script>
