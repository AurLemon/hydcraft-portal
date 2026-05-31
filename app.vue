<script setup lang="ts">
import { useToast } from '@nuxt/ui/composables'
import PageFooter from '~/layouts/PageFooter.vue'
import PageContainer from '~/layouts/PageContainer.vue'
import PageHeader from '~/layouts/PageHeader.vue'

type LocaleCode = 'zh-CN' | 'zh-TW' | 'en-US'
type LocaleNameKey = 'zhCN' | 'zhTW' | 'enUS'

interface NuxtI18nApi {
	setLocale?: (code: LocaleCode) => Promise<void>
	loadLocaleMessages?: (code: LocaleCode) => Promise<void>
}

const toast = useToast()
const nuxtApp = useNuxtApp()
const locale = (nuxtApp.$i18n as { locale: Ref<LocaleCode> }).locale

const CHINESE_PRIMARY_LOCALES = new Set([
	'zh',
	'cmn',
	'yue',
	'wuu',
	'hak',
	'nan',
])

const TRADITIONAL_CHINESE_REGIONS = new Set(['tw', 'hk', 'mo'])

const isChineseLocale = (localeTag: string): boolean => {
	if (!localeTag) {
		return false
	}

	const primary = localeTag.split('-', 1)[0] ?? ''

	if (CHINESE_PRIMARY_LOCALES.has(primary)) {
		return true
	}

	return (
		localeTag.includes('chinese') ||
		localeTag.includes('mandarin') ||
		localeTag.includes('cantonese')
	)
}

const resolveChineseLocaleCode = (localeTag: string): LocaleCode => {
	const fragments = localeTag.split('-').filter(Boolean)

	if (
		fragments.includes('hant') ||
		fragments.some((part) => TRADITIONAL_CHINESE_REGIONS.has(part))
	) {
		return 'zh-TW'
	}

	return 'zh-CN'
}

const normalizeLocaleCode = (value: string | null | undefined): LocaleCode => {
	const normalized = String(value ?? '')
		.trim()
		.toLowerCase()
		.replace(/_/g, '-')

	if (isChineseLocale(normalized)) {
		return resolveChineseLocaleCode(normalized)
	}

	return 'en-US'
}

const toLocaleNameKey = (localeCode: LocaleCode): LocaleNameKey => {
	if (localeCode === 'zh-TW') {
		return 'zhTW'
	}

	if (localeCode === 'en-US') {
		return 'enUS'
	}

	return 'zhCN'
}

const i18nApi = nuxtApp.$i18n as NuxtI18nApi

const setAppLocale = async (nextLocale: LocaleCode): Promise<void> => {
	if (nextLocale === normalizeLocaleCode(locale.value)) {
		return
	}

	if (i18nApi.setLocale) {
		await i18nApi.setLocale(nextLocale)
		return
	}

	locale.value = nextLocale
}

const translateLocaleNotice = (
	key: string,
	promptLocale: LocaleCode,
	values: Record<string, string> = {},
): string => t(key, values, { locale: promptLocale })

const resolveLocaleDisplayName = (
	localeCode: LocaleCode,
	promptLocale: LocaleCode,
): string =>
	translateLocaleNotice(
		`localeNotice.localeNames.${toLocaleNameKey(localeCode)}`,
		promptLocale,
	)

let localeSuggestionChecked = false
let localeSuggestionBusy = false

const maybePromptLocaleSwitch = async (): Promise<void> => {
	if (!import.meta.client || localeSuggestionBusy || localeSuggestionChecked) {
		return
	}

	localeSuggestionChecked = true

	const preferredLocale = normalizeLocaleCode(useBrowserLocale())
	const currentLocale = normalizeLocaleCode(locale.value)

	if (preferredLocale === currentLocale) {
		return
	}

	localeSuggestionBusy = true

	try {
		if (i18nApi.loadLocaleMessages) {
			await i18nApi.loadLocaleMessages(preferredLocale)
		}

		const targetLanguage = resolveLocaleDisplayName(
			preferredLocale,
			preferredLocale,
		)
		const currentLanguage = resolveLocaleDisplayName(
			currentLocale,
			preferredLocale,
		)
		const switchLabel = translateLocaleNotice(
			'localeNotice.switchAction',
			preferredLocale,
			{ targetLanguage },
		)

		const toastEntry = toast.add({
			id: 'locale-switch-once',
			title: translateLocaleNotice('localeNotice.title', preferredLocale, {
				targetLanguage,
			}),
			description: translateLocaleNotice(
				'localeNotice.description',
				preferredLocale,
				{
					currentLanguage,
					targetLanguage,
				},
			),
			color: 'info',
			icon: 'i-lucide-languages',
			duration: 12000,
			actions: [
				{
					label: switchLabel,
					color: 'primary',
					onClick: () => {
						void setAppLocale(preferredLocale)
						toast.remove(toastEntry.id)
					},
				},
				{
					label: translateLocaleNotice(
						'localeNotice.keepAction',
						preferredLocale,
					),
					color: 'neutral',
					variant: 'ghost',
					onClick: () => {
						toast.remove(toastEntry.id)
					},
				},
			],
		})
	} finally {
		localeSuggestionBusy = false
	}
}

if (import.meta.client) {
	void maybePromptLocaleSwitch()
}
</script>

<template>
	<UApp
		:toaster="{
			position: 'top-right',
			ui: {
				viewport: 'z-[60000]',
			},
		}"
	>
		<div id="app" class="relative flex min-h-[105vh] flex-col">
			<PageHeader />
			<PageContainer />
			<PageFooter />
		</div>
	</UApp>
</template>
