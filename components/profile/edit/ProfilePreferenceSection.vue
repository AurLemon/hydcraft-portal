<template>
	<section class="grid gap-3">
		<div class="mx-1 flex items-center justify-between gap-3">
			<div :class="profileSectionTitleClass">
				{{ t('profile.edit.sections.preferences') }}
			</div>
		</div>
		<div :class="profileCardClass" class="grid gap-4">
			<ProfileField :label="t('profile.fields.language')">
				<div class="grid gap-1.5">
					<USelect
						v-model="form.preferences.language"
						class="w-full text-sm"
						:items="localizedLanguageItems"
						@update:model-value="selectLanguagePreference"
					/>
					<div class="text-xs text-slate-500 dark:text-slate-400">
						{{ t('profile.edit.hints.languagePreference') }}
					</div>
				</div>
			</ProfileField>
			<ProfileField :label="t('profile.fields.timezone')">
				<USelect
					v-model="form.preferences.timezone"
					class="w-full text-sm"
					:items="timezoneItems"
					:disabled="form.preferences.timezoneMode === 'AUTO'"
				/>
			</ProfileField>
			<ProfileSwitchField :label="t('profile.fields.autoTimezone')">
				<USwitch
					:model-value="form.preferences.timezoneMode === 'AUTO'"
					disabled
					@update:model-value="setTimezoneMode"
				/>
			</ProfileSwitchField>
		</div>
	</section>
</template>

<script setup lang="ts">
import ProfileSwitchField from '~/components/profile/ProfileSwitchField.vue'
import {
	languageItems,
	profileLanguageToLocaleCode,
	profileCardClass,
	profileSectionTitleClass,
	timezoneItems,
	type LocaleCode,
	type ProfileLanguage,
	type ProfileForm,
} from '~/utils/profile/edit'

const form = defineModel<ProfileForm>('form', { required: true })
const { t } = useI18n()
const route = useRoute()
const nuxtApp = useNuxtApp()
const switchLocalePath = useSwitchLocalePath()
const MANUAL_LOCALE_SWITCH_STORAGE_KEY = 'hydcraft:manual-locale-switch-at'
const i18nApi = nuxtApp.$i18n as {
	setLocale?: (code: LocaleCode) => Promise<void>
}

const localizedLanguageItems = computed(() =>
	languageItems.map((item) => ({
		value: item.value,
		label: t(`profile.options.language.${item.value}`),
	})),
)

const setTimezoneMode = (value: boolean): void => {
	form.value.preferences.timezoneMode = value ? 'AUTO' : 'MANUAL'
}

const selectLanguagePreference = async (value: unknown): Promise<void> => {
	const language = value as ProfileLanguage
	form.value.preferences.language = language

	const targetLocale = profileLanguageToLocaleCode[language]

	if (import.meta.client) {
		window.sessionStorage.setItem(
			MANUAL_LOCALE_SWITCH_STORAGE_KEY,
			String(Date.now()),
		)
	}

	const targetPath = switchLocalePath(targetLocale)

	if (targetPath && targetPath !== route.fullPath) {
		await navigateTo(targetPath)
		return
	}

	if (i18nApi.setLocale) {
		await i18nApi.setLocale(targetLocale)
	}
}
</script>
