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
				<div class="grid gap-1.5">
					<UInput v-model="form.social.h2wikiPageName" class="w-full text-sm" />
					<div
						v-if="h2wikiPreview"
						class="text-xs text-slate-500 dark:text-slate-400"
					>
						{{ h2wikiPreview.text }}
					</div>
				</div>
			</ProfileField>
			<ProfileField label="GitHub">
				<div class="grid gap-1.5">
					<UInput v-model="form.social.githubUsername" class="w-full text-sm" />
					<div
						v-if="githubPreview"
						class="text-xs text-slate-500 dark:text-slate-400"
					>
						{{ githubPreview.text }}
					</div>
				</div>
			</ProfileField>
			<ProfileField label="Bilibili">
				<div class="grid gap-1.5">
					<UInput v-model="form.social.bilibiliUrl" class="w-full text-sm" />
					<div
						v-if="bilibiliPreview"
						class="text-xs text-slate-500 dark:text-slate-400"
					>
						{{ bilibiliPreview.text }}
					</div>
				</div>
			</ProfileField>
			<ProfileField label="QQ">
				<div class="grid gap-1.5">
					<UInput v-model="form.social.qqNumber" class="w-full text-sm" />
				</div>
			</ProfileField>
			<ProfileField label="微信">
				<div class="grid gap-1.5">
					<UInput v-model="form.social.wechatId" class="w-full text-sm" />
				</div>
			</ProfileField>
			<ProfileField :label="t('profile.fields.website')">
				<div class="grid gap-1.5">
					<UInput
						v-model="form.social.websiteUrl"
						class="w-full text-sm"
						type="url"
					/>
				</div>
			</ProfileField>
			<ProfileField :label="t('profile.fields.publicEmail')">
				<div class="grid gap-1.5">
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
	createSocialPreviewLink,
	profileCardClass,
	profileSectionTitleClass,
	type ProfileForm,
} from '~/utils/profile/edit'

interface ProfileSocialSectionProps {
	submitting: boolean
}

defineProps<ProfileSocialSectionProps>()
defineEmits<{
	submit: []
}>()

const { t } = useI18n()
const form = defineModel<ProfileForm>('form', { required: true })

const h2wikiPreview = computed(() =>
	createSocialPreviewLink(
		'https://wiki.hydcraft.cn/',
		form.value.social.h2wikiPageName,
	),
)
const githubPreview = computed(() =>
	createSocialPreviewLink(
		'https://github.com/',
		form.value.social.githubUsername,
	),
)
const bilibiliPreview = computed(() =>
	createSocialPreviewLink(
		'https://space.bilibili.com/',
		form.value.social.bilibiliUrl,
	),
)
</script>
